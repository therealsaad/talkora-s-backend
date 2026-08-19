import { StudentMemory } from '../models/StudentMemory'

export const MemoryService = {
  async listForStudent(studentId: string) {
    return StudentMemory.find({ studentId }).sort('-lastReinforcedAt').lean()
  },
}
