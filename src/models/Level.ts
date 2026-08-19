import { Schema, model, Document, Types } from 'mongoose'

export interface ILevel extends Document {
  _id: Types.ObjectId
  classId: Types.ObjectId
  number: number
  title: string
  place: string // the "world" location shown on the map, e.g. "Classroom", "Beach"
  description?: string
  order: number
  icon?: string
  requiredLevelId?: Types.ObjectId // level that must be completed to unlock this one
  status: 'active' | 'draft'
  createdAt: Date
  updatedAt: Date
}

const levelSchema = new Schema<ILevel>(
  {
    classId: { type: Schema.Types.ObjectId, ref: 'CurriculumClass', required: true, index: true },
    number: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    place: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    order: { type: Number, required: true },
    icon: { type: String },
    requiredLevelId: { type: Schema.Types.ObjectId, ref: 'Level' },
    status: { type: String, enum: ['active', 'draft'], default: 'active' },
  },
  { timestamps: true },
)

levelSchema.index({ classId: 1, number: 1 }, { unique: true })
levelSchema.index({ classId: 1, order: 1 })

export const Level = model<ILevel>('Level', levelSchema)
