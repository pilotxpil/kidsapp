import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITask extends Document {
  familyId: Types.ObjectId;
  title: string;
  description: string;
  category: 'home' | 'school' | 'social' | 'hobby' | 'sport';
  points: number;
  recurrence: 'once' | 'daily' | 'weekly';
  assignedTo: Types.ObjectId;
  icon: string;
  isActive: boolean;
  createdAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    category: {
      type: String,
      enum: ['home', 'school', 'social', 'hobby', 'sport'],
      required: true,
    },
    points: { type: Number, required: true, min: 1 },
    recurrence: { type: String, enum: ['once', 'daily', 'weekly'], default: 'daily' },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    icon: { type: String, default: '⭐' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Task = mongoose.model<ITask>('Task', taskSchema);
