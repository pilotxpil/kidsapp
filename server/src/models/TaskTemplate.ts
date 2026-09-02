import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITaskTemplate extends Document {
  familyId: Types.ObjectId;
  title: string;
  description: string;
  category: 'home' | 'school' | 'social' | 'hobby' | 'sport';
  points: number;
  recurrence: 'once' | 'daily' | 'weekly';
  createdAt: Date;
}

const taskTemplateSchema = new Schema<ITaskTemplate>(
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
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

taskTemplateSchema.index({ familyId: 1, title: 1 }, { unique: true });

export const TaskTemplate = mongoose.model<ITaskTemplate>('TaskTemplate', taskTemplateSchema);
