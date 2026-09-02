import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ILearningProgress extends Document {
  kidId: Types.ObjectId;
  familyId: Types.ObjectId;
  packId: string;
  completedActivityIds: string[];
  totalPointsEarned: number;
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
    completedAt: { type: Date },
  },
  { timestamps: true }
);

learningProgressSchema.index({ kidId: 1, packId: 1 }, { unique: true });

export const LearningProgress = mongoose.model<ILearningProgress>(
  'LearningProgress',
  learningProgressSchema
);
