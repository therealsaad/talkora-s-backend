import { Schema, model, Document, Types } from 'mongoose'

export interface IConversationMessage {
  role: 'student' | 'missJulie'
  content: string
  emotion?: string
  createdAt: Date
}

export interface IConversation extends Document {
  _id: Types.ObjectId
  studentId: Types.ObjectId
  lessonId?: Types.ObjectId
  activityId?: Types.ObjectId
  messages: IConversationMessage[]
  createdAt: Date
  updatedAt: Date
}

const conversationMessageSchema = new Schema<IConversationMessage>(
  {
    role: { type: String, enum: ['student', 'missJulie'], required: true },
    content: { type: String, required: true },
    emotion: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

const conversationSchema = new Schema<IConversation>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson' },
    activityId: { type: Schema.Types.ObjectId, ref: 'Activity' },
    messages: [conversationMessageSchema],
  },
  { timestamps: true },
)

export const Conversation = model<IConversation>('Conversation', conversationSchema)
