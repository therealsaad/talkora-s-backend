import { connectDatabase, disconnectDatabase } from '../config/db'
import { env } from '../config/env'
import { logger } from '../utils/logger'
import { hashPassword } from '../utils/password'
import { generateCode } from '../utils/idGenerator'

import { School } from '../models/School'
import { Teacher } from '../models/Teacher'
import { Student } from '../models/Student'
import { CurriculumClass } from '../models/CurriculumClass'
import { Level } from '../models/Level'
import { Lesson } from '../models/Lesson'
import { Activity } from '../models/Activity'
import { Achievement } from '../models/Achievement'

import { class4Level1Activities } from './data/class4Level1Activities'
import { generateActivitiesForLevel } from './data/generateGradeActivities'

// Generic level template shared across grades — matches the frontend's existing world map
// (place names / order) so curriculum data lines up with what the UI already expects.
const LEVEL_TEMPLATE = [
  { title: 'Word Explorer', place: 'Classroom', description: 'Start with everyday words.' },
  { title: 'Sentence Builder', place: 'School Garden', description: 'Join words into clear sentences.' },
  { title: 'Speaking Starter', place: 'Playground', description: 'Practice saying what you mean.' },
  { title: 'Story World', place: 'Library', description: 'Read and understand short stories.' },
  { title: 'Conversation Corner', place: 'Ice Cream Shop', description: 'Take turns in friendly conversations.' },
  { title: 'Grammar Garden', place: 'School Garden', description: 'Notice how English patterns work.' },
  { title: 'Reading Adventure', place: 'City Library', description: 'Find meaning in every paragraph.' },
  { title: 'Listening Lab', place: 'School Bus', description: 'Train your ears for English.' },
  { title: 'Speaking Quest', place: 'Beach', description: 'Speak with confidence and clarity.' },
  { title: 'Final Challenge', place: 'Talkora Festival', description: 'Bring all your skills together.' },
]

const ACHIEVEMENTS = [
  { key: 'first-quest', title: 'First Quest', description: 'Complete your first activity.', category: 'completion', criteria: { type: 'activities_completed', count: 1 } },
  { key: 'brave-speaker', title: 'Brave Speaker', description: 'Try a speaking activity.', category: 'speaking', criteria: { type: 'speaking_attempts', count: 1 } },
  { key: 'word-explorer', title: 'Word Explorer', description: 'Complete 10 activities correctly.', category: 'learning', criteria: { type: 'activities_completed', count: 10 } },
  { key: 'perfect-lesson', title: 'Perfect Lesson', description: 'Finish a lesson with 100% accuracy.', category: 'completion', criteria: { type: 'perfect_lesson' } },
  { key: 'seven-day-streak', title: '7 Day Streak', description: 'Practice for seven days in a row.', category: 'streak', criteria: { type: 'streak', days: 7 } },
  { key: 'speaking-star', title: 'Speaking Star', description: 'Complete 5 speaking activities.', category: 'speaking', criteria: { type: 'speaking_attempts', count: 5 } },
  { key: 'writing-star', title: 'Writing Star', description: 'Complete 10 spelling/sentence activities.', category: 'learning', criteria: { type: 'activities_completed', count: 20 } },
  { key: 'pronunciation-hero', title: 'Pronunciation Hero', description: 'Complete a level.', category: 'completion', criteria: { type: 'levels_completed', count: 1 } },
]

async function seed() {
  await connectDatabase()
  logger.info('Seeding Talkora database...')

  // --- School + Teacher ---
  const schoolPasswordHash = await hashPassword(env.seed.schoolPassword)
  const school = await School.findOneAndUpdate(
    { code: env.seed.schoolCode },
    { name: 'Sunrise Public School', code: env.seed.schoolCode, location: 'Pune, Maharashtra', passwordHash: schoolPasswordHash, status: 'active' },
    { upsert: true, new: true },
  )

  const teacherPasswordHash = await hashPassword(env.seed.teacherPassword)
  const teacher = await Teacher.findOneAndUpdate(
    { schoolId: school._id, email: env.seed.teacherEmail },
    { schoolId: school._id, name: 'Ananya Sharma', email: env.seed.teacherEmail, passwordHash: teacherPasswordHash, role: 'TEACHER', status: 'active' },
    { upsert: true, new: true },
  )

  // --- Classes 4-10, each with 10 levels + 1 lesson per level ---
  const gradeInfo: Record<number, { classIds: string[] }> = {}
  for (let grade = 4; grade <= 10; grade++) {
    const curriculumClass = await CurriculumClass.findOneAndUpdate(
      { grade },
      { grade, name: `Class ${grade}`, order: grade - 3, status: 'active' },
      { upsert: true, new: true },
    )

    for (let i = 0; i < LEVEL_TEMPLATE.length; i++) {
      const tpl = LEVEL_TEMPLATE[i]
      const level = await Level.findOneAndUpdate(
        { classId: curriculumClass._id, number: i + 1 },
        { classId: curriculumClass._id, number: i + 1, order: i + 1, title: tpl.title, place: tpl.place, description: tpl.description, status: 'active' },
        { upsert: true, new: true },
      )

      const lesson = await Lesson.findOneAndUpdate(
        { levelId: level._id, order: 1 },
        {
          levelId: level._id,
          order: 1,
          title: tpl.title,
          subtitle: tpl.description,
          estimatedMinutes: 8,
          xpReward: 50,
          status: 'active',
        },
        { upsert: true, new: true },
      )

      // Author activities for all levels (Class 4 / Level 1 uses the handcrafted activities, and other levels use the rich educational generator)
      const activitiesToSeed = (grade === 4 && i === 0)
        ? class4Level1Activities
        : generateActivitiesForLevel(grade, i + 1)

      for (const activityInput of activitiesToSeed) {
        await Activity.findOneAndUpdate(
          { lessonId: lesson._id, order: activityInput.order },
          { lessonId: lesson._id, status: 'active', ...activityInput },
          { upsert: true, new: true },
        )
      }
    }
    gradeInfo[grade] = { classIds: [curriculumClass._id.toString()] }
  }

  // --- Achievements catalog ---
  for (const achievement of ACHIEVEMENTS) {
    await Achievement.findOneAndUpdate({ key: achievement.key }, achievement, { upsert: true })
  }

  // --- Demo students (8, spread across grades 4-6 for a believable classroom demo) ---
  const demoStudents = [
    { fullName: 'Aanya Kapoor', rollNumber: '04', grade: 4, className: '4A' },
    { fullName: 'Vihaan Mehta', rollNumber: '07', grade: 4, className: '4A' },
    { fullName: 'Zoya Khan', rollNumber: '12', grade: 4, className: '4B' },
    { fullName: 'Arjun Rao', rollNumber: '18', grade: 4, className: '4A' },
    { fullName: 'Ishaan Verma', rollNumber: '02', grade: 5, className: '5A' },
    { fullName: 'Diya Nair', rollNumber: '09', grade: 5, className: '5A' },
    { fullName: 'Kabir Singh', rollNumber: '15', grade: 6, className: '6A' },
    { fullName: 'Myra Joshi', rollNumber: '21', grade: 6, className: '6B' },
  ]

  const createdStudents: Array<{ fullName: string; studentCode: string }> = []
  for (const s of demoStudents) {
    const studentCode = generateCode(4)
    const passwordHash = await hashPassword(studentCode)
    await Student.findOneAndUpdate(
      { schoolId: school._id, rollNumber: s.rollNumber },
      { schoolId: school._id, teacherId: teacher._id, ...s, studentCode, passwordHash, status: 'active' },
      { upsert: true, new: true },
    )
    createdStudents.push({ fullName: s.fullName, studentCode })
  }

  logger.info('Seed complete', {
    schoolCode: school.code,
    teacherEmail: teacher.email,
    students: createdStudents,
  })

  console.log('\n=== Talkora seed complete ===')
  console.log(`School code:      ${school.code}`)
  console.log(`School password:  ${env.seed.schoolPassword}`)
  console.log(`Teacher email:    ${teacher.email}`)
  console.log(`Teacher password: ${env.seed.teacherPassword}`)
  console.log('Student codes (dev only — regenerated on every reseed):')
  for (const s of createdStudents) console.log(`  ${s.fullName}: ${s.studentCode}`)
  console.log('==============================\n')

  await disconnectDatabase()
}

seed().catch((err) => {
  logger.error('Seed failed', { err: err instanceof Error ? err.message : err })
  process.exit(1)
})
