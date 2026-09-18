import mongoose, { Schema, Document, Types } from 'mongoose';
import type { LearningDifficulty } from '@kidsapp/shared';

export interface ILearningPackSettings extends Document {
  familyId: Types.ObjectId;
  packId: string;
  pointsPerActivity: number;
  difficulty: LearningDifficulty;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const learningPackSettingsSchema = new Schema<ILearningPackSettings>(
  {
    familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true },
    packId: { type: String, required: true },
    pointsPerActivity: { type: Number, required: true, min: 1, max: 100 },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      required: true,
      default: 'medium',
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

learningPackSettingsSchema.index({ familyId: 1, packId: 1 }, { unique: true });

export const LearningPackSettings = mongoose.model<ILearningPackSettings>(
  'LearningPackSettings',
  learningPackSettingsSchema
);
