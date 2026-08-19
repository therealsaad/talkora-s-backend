import { MistakeRecord } from '../models/MistakeRecord'

export const MistakeService = {
  async listForStudent(studentId: string, includeResolved = false) {
    const filter: Record<string, unknown> = { studentId }
    if (!includeResolved) filter.resolved = false
    return MistakeRecord.find(filter).sort('-lastOccurredAt').lean()
  },

  async weakSkills(studentId: string, limit = 5) {
    return MistakeRecord.aggregate([
      { $match: { studentId: studentId, resolved: false } },
      { $group: { _id: '$skill', occurrences: { $sum: '$attemptCount' } } },
      { $sort: { occurrences: -1 } },
      { $limit: limit },
    ])
  },
}
