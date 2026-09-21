import mongoose, { Schema, Document, Types } from 'mongoose';

export type DailyRiddleClaimStatus = 'open' | 'won' | 'missed';

export interface IDailyRiddleClaim extends Document {
  kidId: Types.ObjectId;
  familyId: Types.ObjectId;
  date: string;
  riddleId: string;
  status: DailyRiddleClaimStatus;
  attempts: number;
  createdAt: Date;
}

const dailyRiddleClaimSchema = new Schema<IDailyRiddleClaim>(
  {
    kidId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true },
    date: { type: String, required: true },
    riddleId: { type: String, required: true },
    status: { type: String, enum: ['open', 'won', 'missed'], required: true },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

dailyRiddleClaimSchema.index({ kidId: 1, date: 1 }, { unique: true });
dailyRiddleClaimSchema.index({ kidId: 1, status: 1, riddleId: 1 });

export const DailyRiddleClaim = mongoose.model<IDailyRiddleClaim>(
  'DailyRiddleClaim',
  dailyRiddleClaimSchema
);
