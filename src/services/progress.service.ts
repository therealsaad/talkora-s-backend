import mongoose, { Types } from 'mongoose'
import { Activity } from '../models/Activity'
import { Lesson } from '../models/Lesson'
import { Level } from '../models/Level'
import { ActivityAttempt } from '../models/ActivityAttempt'
import { Progress, IProgress, ILevelProgress } from '../models/Progress'
import { LearningEvent } from '../models/LearningEvent'
import { MistakeRecord } from '../models/MistakeRecord'
import { ApiError } from '../utils/ApiError'
import { AchievementService } from './achievement.service'

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Deterministic, backend-owned scoring. The frontend never supplies a score — this is the
 * single source of truth for how accuracy, attempt count, time, and hints translate to a
 * 0-100 score. Kept in one function so the rules stay documented and easy to tune.
 */
function computeScore(input: { correct: boolean; attemptNumber: number; timeTakenMs: number; expectedSeconds: number; hintsUsed: number }): number {
  if (!input.correct) return 0

  let score = 100
  // Lose a bit for extra attempts (diminishing, floor at -30).
  score -= Math.min(30, (input.attemptNumber - 1) * 10)
  // Lose a bit for exceeding the expected time budget, capped.
  const overTimeRatio = input.timeTakenMs / (input.expectedSeconds * 1000)
  if (overTimeRatio > 1.5) score -= Math.min(20, Math.round((overTimeRatio - 1.5) * 20))
  // Lose a bit per hint used.
  score -= Math.min(20, input.hintsUsed * 5)

  return Math.max(10, Math.round(score)) // a correct answer always keeps some credit
}

function xpForScore(baseXp: number, score: number): number {
  return Math.round(baseXp * (score / 100))
}

export const ProgressService = {
  /** Ensures a Progress document exists for the student+class, with Level 1 unlocked by default. */
  async ensureProgress(studentId: string, classId: string): Promise<mongoose.Document & IProgress> {
    let progress = await Progress.findOne({ studentId, classId })
    if (progress) return progress

    const levels = await Level.find({ classId, status: 'active' }).sort('order').lean()
    const levelProgress: ILevelProgress[] = levels.map((level, index) => ({
      levelId: level._id,
      status: index === 0 ? 'unlocked' : 'locked',
      lessons: [],
      accuracy: 0,
      totalTimeMs: 0,
      unlockedAt: index === 0 ? new Date() : undefined,
    }))

    progress = await Progress.create({ studentId, classId, levels: levelProgress, xp: 0, stars: 0, streak: 0 })
    return progress
  },

  async getForStudent(studentId: string, classId: string) {
    return this.ensureProgress(studentId, classId)
  },

  /** Authoritative business-rule check: is this level actually unlocked for this student? */
  async assertLevelAccessible(studentId: string, classId: string, levelId: string) {
    const progress = await this.ensureProgress(studentId, classId)
    const levelProgress = progress.levels.find((l) => l.levelId.toString() === levelId)
    if (!levelProgress || levelProgress.status === 'locked') {
      throw ApiError.businessRule('This level is locked. Complete the previous level to unlock it.')
    }
    return progress
  },

  /**
   * Processes one activity attempt end-to-end:
   * validate → evaluate answer → persist attempt (idempotent) → update progress →
   * unlock next level if earned → record learning event → record mistake if wrong →
   * check achievements.
   */
  async submitAttempt(input: {
    studentId: string
    activityId: string
    answer: string
    startedAt: Date
    hintsUsed: number
    idempotencyKey?: string
    evaluation?: { score: number; feedback?: string }
  }) {
    const activity = await Activity.findById(input.activityId).select('+answer +answerConfig')
    if (!activity || activity.status !== 'active') throw ApiError.notFound('Activity not found')

    const lesson = await Lesson.findById(activity.lessonId)
    if (!lesson) throw ApiError.notFound('Lesson not found')
    const level = await Level.findById(lesson.levelId)
    if (!level) throw ApiError.notFound('Level not found')

    // Enforce level unlocking server-side before accepting an attempt.
    await this.assertLevelAccessible(input.studentId, level.classId.toString(), level._id.toString())

    // Idempotency: if this exact key was already processed for this student, return the prior result.
    if (input.idempotencyKey) {
      const existing = await ActivityAttempt.findOne({ studentId: input.studentId, idempotencyKey: input.idempotencyKey })
      if (existing) {
        const progress = await this.ensureProgress(input.studentId, level.classId.toString())
        return { attempt: existing, progress, alreadyProcessed: true }
      }
    }

    const submittedAt = new Date()
    const timeTakenMs = Math.max(0, submittedAt.getTime() - input.startedAt.getTime())
    // Guard against obviously impossible client-submitted timing (e.g. negative or absurdly fast).
    const MIN_PLAUSIBLE_MS = 300
    const safeTimeTakenMs = timeTakenMs < MIN_PLAUSIBLE_MS ? MIN_PLAUSIBLE_MS : timeTakenMs

    const normalizedAnswer = normalize(input.answer)
    const expectedAnswer = activity.answer ? normalize(activity.answer) : undefined
    // For open-ended types (SPEAKING/CONVERSATION/PRONUNCIATION) there may be no fixed `answer` —
    // those are scored via the AI/pronunciation pipeline (see missJulie.service/voice.service), not here.
    const correct = input.evaluation ? input.evaluation.score >= 70 : expectedAnswer !== undefined ? normalizedAnswer === expectedAnswer : false

    const attemptNumber = (await ActivityAttempt.countDocuments({ studentId: input.studentId, activityId: activity._id })) + 1

    const score = input.evaluation ? Math.max(0, Math.min(100, Math.round(input.evaluation.score))) : computeScore({
      correct,
      attemptNumber,
      timeTakenMs: safeTimeTakenMs,
      expectedSeconds: activity.estimatedSeconds,
      hintsUsed: input.hintsUsed,
    })

    let attempt
    try {
      attempt = await ActivityAttempt.create({
        studentId: input.studentId,
        activityId: activity._id,
        lessonId: lesson._id,
        levelId: level._id,
        classId: level.classId,
        answer: input.answer,
        normalizedAnswer,
        correct,
        score,
        attemptNumber,
        startedAt: input.startedAt,
        submittedAt,
        timeTakenMs: safeTimeTakenMs,
        hintsUsed: input.hintsUsed,
        feedback: input.evaluation?.feedback,
        idempotencyKey: input.idempotencyKey,
      })
    } catch (err) {
      if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
        // Race: the same idempotency key landed twice concurrently — treat as already processed.
        const existing = await ActivityAttempt.findOne({ studentId: input.studentId, idempotencyKey: input.idempotencyKey })
        const progress = await this.ensureProgress(input.studentId, level.classId.toString())
        return { attempt: existing!, progress, alreadyProcessed: true }
      }
      throw err
    }

    const xpAwarded = xpForScore(activity.xp, score)
    const progress = await this._applyAttemptToProgress({
      studentId: input.studentId,
      classId: level.classId.toString(),
      levelId: level._id.toString(),
      lessonId: lesson._id.toString(),
      activityId: activity._id.toString(),
      correct,
      score,
      timeTakenMs: safeTimeTakenMs,
      xpAwarded,
    })

    await LearningEvent.create({
      studentId: input.studentId,
      type: 'activity_completed',
      lessonId: lesson._id,
      levelId: level._id,
      activityId: activity._id,
      metadata: { correct, score, xpAwarded },
    })

    if (!correct && (expectedAnswer || activity.target)) {
      await MistakeRecord.findOneAndUpdate(
        { studentId: input.studentId, activityId: activity._id },
        {
          $inc: { attemptCount: 1 },
          $set: {
            lastOccurredAt: new Date(),
            expected: activity.answer || activity.target || '',
            actual: input.answer,
            type: activity.type,
            skill: `${lesson.title.toLowerCase()}:${activity.type.toLowerCase()}`,
            lessonId: lesson._id,
            resolved: false,
          },
        },
        { upsert: true, new: true },
      )
    } else if (correct) {
      await MistakeRecord.updateMany({ studentId: input.studentId, activityId: activity._id }, { resolved: true })
    }

    await AchievementService.evaluateForStudent(input.studentId)

    return { attempt, progress, alreadyProcessed: false, xpAwarded, score }
  },

  /** Rolls one attempt's result into the student's Progress doc: lesson completion, level completion, next-level unlock, XP/streak. */
  async _applyAttemptToProgress(input: {
    studentId: string
    classId: string
    levelId: string
    lessonId: string
    activityId: string
    correct: boolean
    score: number
    timeTakenMs: number
    xpAwarded: number
  }) {
    const progress = await this.ensureProgress(input.studentId, input.classId)

    let levelProgress = progress.levels.find((l) => l.levelId.toString() === input.levelId)
    if (!levelProgress) {
      levelProgress = { levelId: new Types.ObjectId(input.levelId), status: 'unlocked', lessons: [], accuracy: 0, totalTimeMs: 0 }
      progress.levels.push(levelProgress)
    }
    if (levelProgress.status === 'unlocked') levelProgress.status = 'in-progress'

    let lessonProgress = levelProgress.lessons.find((l) => l.lessonId.toString() === input.lessonId)
    if (!lessonProgress) {
      lessonProgress = { lessonId: new Types.ObjectId(input.lessonId), completedActivityIds: [], completed: false, accuracy: 0, totalTimeMs: 0 }
      levelProgress.lessons.push(lessonProgress)
    }

    const activityObjectId = new Types.ObjectId(input.activityId)
    if (input.correct && !lessonProgress.completedActivityIds.some((id) => id.equals(activityObjectId))) {
      lessonProgress.completedActivityIds.push(activityObjectId)
    }
    lessonProgress.totalTimeMs += input.timeTakenMs

    const totalActivitiesInLesson = await Activity.countDocuments({ lessonId: input.lessonId, status: 'active' })
    const wasLessonComplete = lessonProgress.completed
    lessonProgress.completed = totalActivitiesInLesson > 0 && lessonProgress.completedActivityIds.length >= totalActivitiesInLesson
    if (lessonProgress.completed && !wasLessonComplete) {
      lessonProgress.completedAt = new Date()
      await LearningEvent.create({ studentId: input.studentId, type: 'lesson_completed', lessonId: input.lessonId, levelId: input.levelId })
    }

    // Recompute level-level aggregates.
    const totalLessonsInLevel = await Lesson.countDocuments({ levelId: input.levelId, status: 'active' })
    const completedLessons = levelProgress.lessons.filter((l) => l.completed).length
    levelProgress.totalTimeMs = levelProgress.lessons.reduce((sum, l) => sum + l.totalTimeMs, 0)

    const wasLevelComplete = levelProgress.status === 'completed'
    if (totalLessonsInLevel > 0 && completedLessons >= totalLessonsInLevel) {
      levelProgress.status = 'completed'
      if (!levelProgress.completedAt) levelProgress.completedAt = new Date()
      if (!wasLevelComplete) {
        await LearningEvent.create({ studentId: input.studentId, type: 'level_completed', levelId: input.levelId })
        await this._unlockNextLevel(progress, input.classId, input.levelId)
      }
    }

    // Recompute accuracy from this student's attempts in this lesson (simple running measure).
    const attempts = await ActivityAttempt.find({ studentId: input.studentId, lessonId: input.lessonId })
    if (attempts.length > 0) {
      lessonProgress.accuracy = Math.round((attempts.filter((a) => a.correct).length / attempts.length) * 100)
    }

    progress.xp += input.xpAwarded
    progress.stars = Math.floor(progress.xp / 100)
    progress.lastActivityAt = new Date()

    await progress.save()
    return progress
  },

  async _unlockNextLevel(progress: mongoose.Document & IProgress, classId: string, completedLevelId: string) {
    const levels = await Level.find({ classId, status: 'active' }).sort('order').lean()
    const idx = levels.findIndex((l) => l._id.toString() === completedLevelId)
    if (idx === -1 || idx + 1 >= levels.length) return // no next level (final level completed)

    const nextLevel = levels[idx + 1]
    let nextLevelProgress = progress.levels.find((l) => l.levelId.toString() === nextLevel._id.toString())
    if (!nextLevelProgress) {
      progress.levels.push({ levelId: nextLevel._id, status: 'unlocked', lessons: [], accuracy: 0, totalTimeMs: 0, unlockedAt: new Date() })
    } else if (nextLevelProgress.status === 'locked') {
      nextLevelProgress.status = 'unlocked'
      nextLevelProgress.unlockedAt = new Date()
    }
  },
}
