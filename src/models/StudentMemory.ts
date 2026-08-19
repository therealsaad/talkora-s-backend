import { Schema, model, Document, Types } from 'mongoose'

export interface IStudentMemory extends Document {
  _id: Types.ObjectId
  studentId: Types.ObjectId
  category: 'vocabulary' | 'grammar' | 'pronunciation' | 'speaking' | 'behavior'
  fact: string
  confidence: number // 0-1
  lastReinforcedAt: Date
  source: 'ai' | 'system' | 'teacher'
  createdAt: Date
  updatedAt: Date
}

const studentMemorySchema = new Schema<IStudentMemory>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    category: { type: String, enum: ['vocabulary', 'grammar', 'pronunciation', 'speaking', 'behavior'], required: true },
    fact: { type: String, required: true },
    confidence: { type: Number, min: 0, max: 1, default: 0.5 },
    lastReinforcedAt: { type: Date, default: Date.now },
    source: { type: String, enum: ['ai', 'system', 'teacher'], default: 'ai' },
  },
  { timestamps: true },
)

studentMemorySchema.index({ studentId: 1, category: 1 })

export const StudentMemory = model<IStudentMemory>('StudentMemory', studentMemorySchema)
