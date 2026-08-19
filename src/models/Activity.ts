import { Schema, model, Document, Types } from 'mongoose'

export const ACTIVITY_TYPES = [
  'MCQ',
  'PICTURE_CHOICE',
  'MATCHING',
  'SPELLING',
  'LISTENING',
  'LISTEN_AND_REPEAT',
  'WORD_RECOGNITION',
  'SENTENCE_BUILDER',
  'READING',
  'PRONUNCIATION',
  'SPEAKING',
  'CONVERSATION',
  'REVIEW',
] as const

export type ActivityType = (typeof ACTIVITY_TYPES)[number]

export interface IActivity extends Document {
  _id: Types.ObjectId
  lessonId: Types.ObjectId
  type: ActivityType
  title: string
  prompt: string
  instruction?: string
  order: number
  target?: string // the word/sentence the activity centers on
  content?: Record<string, unknown> // media refs, extra structured content
  choices?: string[]
  // Answer configuration is intentionally separate from `choices` so controllers can
  // strip it before sending activities to students; only the backend evaluates answers.
  answer?: string
  answerConfig?: Record<string, unknown>
  hint?: string
  difficulty: 'easy' | 'medium' | 'hard'
  xp: number
  estimatedSeconds: number
  voiceEnabled: boolean
  aiEnabled: boolean
  metadata?: Record<string, unknown>
  status: 'active' | 'draft'
  createdAt: Date
  updatedAt: Date
}

const activitySchema = new Schema<IActivity>(
  {
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    title: { type: String, required: true, trim: true },
    prompt: { type: String, required: true },
    instruction: { type: String },
    order: { type: Number, required: true },
    target: { type: String },
    content: { type: Schema.Types.Mixed },
    choices: { type: [String], default: undefined },
    answer: { type: String, select: false },
    answerConfig: { type: Schema.Types.Mixed, select: false },
    hint: { type: String },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },
    xp: { type: Number, default: 10 },
    estimatedSeconds: { type: Number, default: 60 },
    voiceEnabled: { type: Boolean, default: false },
    aiEnabled: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed },
    status: { type: String, enum: ['active', 'draft'], default: 'active' },
  },
  { timestamps: true },
)

activitySchema.index({ lessonId: 1, order: 1 })

export const Activity = model<IActivity>('Activity', activitySchema)
