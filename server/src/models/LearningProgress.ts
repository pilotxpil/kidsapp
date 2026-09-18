import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ILearningMistake {
  activityId: string;
  count: number;
}

export interface ILearningProgress extends Document {
  kidId: Types.ObjectId;
  familyId: Types.ObjectId;
  packId: string;
  completedActivityIds: string[];
  totalPointsEarned: number;
  mistakes: ILearningMistake[];
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const learningProgressSchema = new Schema<ILearningProgress>(
  {
    kidId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true },
    packId: { type: String, required: true },
    completedActivityIds: { type: [String], default: [] },
    totalPointsEarned: { type: Number, default: 0 },
    mistakes: {
      type: [
        {
          activityId: { type: String, required: true },
          count: { type: Number, default: 0 },
        },
      ],
      default: [],
    },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

learningProgressSchema.index({ kidId: 1, packId: 1 }, { unique: true });

export const LearningProgress = mongoose.model<ILearningProgress>(
  'LearningProgress',
  learningProgressSchema
);
