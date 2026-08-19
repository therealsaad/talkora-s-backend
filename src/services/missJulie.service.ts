import { Student } from '../models/Student'
import { CurriculumClass } from '../models/CurriculumClass'
import { Level } from '../models/Level'
import { Lesson } from '../models/Lesson'
import { Activity } from '../models/Activity'
import { Progress } from '../models/Progress'
import { MistakeRecord } from '../models/MistakeRecord'
import { StudentMemory } from '../models/StudentMemory'
import { Conversation } from '../models/Conversation'
import { getAIProvider } from '../providers/ai'
import { MissJulieContext } from '../providers/ai/AIProvider'
import { ApiError } from '../utils/ApiError'

/**
 * MissJulieService gathers real learning context (student, progress, mistakes, memory) before
 * calling the AI provider, so Miss Julie's responses reflect what actually happened rather than
 * being a generic single-shot chatbot.
 */
export const MissJulieService = {
  async buildContext(studentId: string, input: { message: string; lessonId?: string; activityId?: string; promptContext: string }): Promise<MissJulieContext> {
    const student = await Student.findById(studentId)
    if (!student) throw ApiError.notFound('Student not found')

    const klass = await CurriculumClass.findOne({ grade: student.grade }).lean()

    let levelTitle = ''
    let lessonTitle = ''
    let activityTitle: string | undefined
    let activityTarget: string | undefined

    if (input.lessonId) {
      const lesson = await Lesson.findById(input.lessonId).lean()
      if (lesson) {
        lessonTitle = lesson.title
        const level = await Level.findById(lesson.levelId).lean()
        if (level) levelTitle = level.title
      }
    }
    if (input.activityId) {
      const activity = await Activity.findById(input.activityId).select('-answer -answerConfig').lean()
      if (activity) {
        activityTitle = activity.title
        activityTarget = activity.target
      }
    }

    const recentMistakes = await MistakeRecord.find({ studentId, resolved: false }).sort('-lastOccurredAt').limit(5).lean()
    const memory = await StudentMemory.find({ studentId }).sort('-lastReinforcedAt').limit(5).lean()

    return {
      studentName: student.fullName.split(' ')[0],
      grade: student.grade,
      levelTitle,
      lessonTitle,
      activityTitle,
      activityTarget,
      recentMistakes: recentMistakes.map((m) => `${m.skill}: expected "${m.expected}", said "${m.actual}"`),
      memoryFacts: memory.map((m) => m.fact),
      promptContext: input.promptContext,
      studentMessage: input.message,
      classId: klass?._id?.toString(),
    } as MissJulieContext & { classId?: string }
  },

  async converse(studentId: string, input: { message: string; lessonId?: string; activityId?: string; context: string }) {
    const context = await this.buildContext(studentId, { message: input.message, lessonId: input.lessonId, activityId: input.activityId, promptContext: input.context })
    const provider = getAIProvider()
    const response = await provider.generate(context)

    // Persist the exchange.
    await Conversation.findOneAndUpdate(
      { studentId, lessonId: input.lessonId, activityId: input.activityId },
      {
        $push: {
          messages: {
            $each: [
              { role: 'student', content: input.message, createdAt: new Date() },
              { role: 'missJulie', content: response.message, emotion: response.emotion, createdAt: new Date() },
            ],
          },
        },
      },
      { upsert: true },
    )

    // Apply any memory updates the AI proposed — validated by schema already, still bounded here.
    for (const update of response.memoryUpdates.slice(0, 5)) {
      await StudentMemory.findOneAndUpdate(
        { studentId, category: update.category, fact: update.fact },
        { confidence: update.confidence, lastReinforcedAt: new Date(), source: 'ai' },
        { upsert: true },
      )
    }

    return response
  },
}
