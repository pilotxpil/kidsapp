import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITaskCompletion extends Document {
  taskId: Types.ObjectId;
  kidId: Types.ObjectId;
  familyId: Types.ObjectId;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: Types.ObjectId;
  proofPhoto?: string;
  rejectNote?: string;
}

const taskCompletionSchema = new Schema<ITaskCompletion>({
  taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
  kidId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  proofPhoto: { type: String },
  rejectNote: { type: String },
});

export const TaskCompletion = mongoose.model<ITaskCompletion>('TaskCompletion', taskCompletionSchema);
