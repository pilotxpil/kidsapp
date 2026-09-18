import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IFamilyChallenge extends Document {
  familyId: Types.ObjectId;
  weekKey: string;
  title: string;
  targetCount: number;
  progress: number;
  rewardTitle: string;
  rewardPoints: number;
  completed: boolean;
  claimedAt?: Date;
  createdAt: Date;
}

const familyChallengeSchema = new Schema<IFamilyChallenge>(
  {
    familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true },
    weekKey: { type: String, required: true },
    title: { type: String, default: 'אתגר משפחתי שבועי' },
    targetCount: { type: Number, required: true },
    progress: { type: Number, default: 0 },
    rewardTitle: { type: String, default: 'פרס משותף' },
    rewardPoints: { type: Number, required: true },
    completed: { type: Boolean, default: false },
    claimedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

familyChallengeSchema.index({ familyId: 1, weekKey: 1 }, { unique: true });

export const FamilyChallenge = mongoose.model<IFamilyChallenge>(
  'FamilyChallenge',
  familyChallengeSchema
);
