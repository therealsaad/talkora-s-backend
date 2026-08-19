import { Types } from 'mongoose'
import { Student } from '../models/Student'
import { Progress } from '../models/Progress'
import { ActivityAttempt } from '../models/ActivityAttempt'
import { MistakeRecord } from '../models/MistakeRecord'

export const AnalyticsService = {
  async schoolOverview(schoolId: string) {
    const students = await Student.find({ schoolId, status: 'active' }).select('_id fullName grade className').lean()
    const studentIds = students.map((s) => s._id)

    const progressDocs = await Progress.find({ studentId: { $in: studentIds } }).lean()
    const progressByStudent = new Map<string, typeof progressDocs>()
    for (const p of progressDocs) {
      const key = p.studentId.toString()
      progressByStudent.set(key, [...(progressByStudent.get(key) ?? []), p])
    }

    const rows = students.map((s) => {
      const docs = progressByStudent.get(s._id.toString()) ?? []
      const xp = docs.reduce((sum, d) => sum + d.xp, 0)
      const completedLevels = docs.reduce((sum, d) => sum + d.levels.filter((l) => l.status === 'completed').length, 0)
      const accuracyValues = docs.flatMap((d) => d.levels.map((l) => l.accuracy).filter((a) => a > 0))
      const accuracy = accuracyValues.length ? Math.round(accuracyValues.reduce((a, b) => a + b, 0) / accuracyValues.length) : 0
      return { studentId: s._id, fullName: s.fullName, grade: s.grade, className: s.className, xp, completedLevels, accuracy }
    })

    return rows
  },

  async weakestSkillsForSchool(schoolId: string, limit = 5) {
    const students = await Student.find({ schoolId }).select('_id').lean()
    const studentIds = students.map((s) => s._id)

    return MistakeRecord.aggregate([
      { $match: { studentId: { $in: studentIds }, resolved: false } },
      { $group: { _id: '$skill', occurrences: { $sum: '$attemptCount' }, students: { $addToSet: '$studentId' } } },
      { $project: { skill: '$_id', occurrences: 1, studentCount: { $size: '$students' }, _id: 0 } },
      { $sort: { occurrences: -1 } },
      { $limit: limit },
    ])
  },
}
