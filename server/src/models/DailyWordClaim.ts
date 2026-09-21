import mongoose, { Schema, Document, Types } from 'mongoose';

export type DailyWordClaimStatus = 'pending' | 'approved' | 'rejected';

export interface IDailyWordClaim extends Document {
  kidId: Types.ObjectId;
  familyId: Types.ObjectId;
  date: string;
  wordId: string;
  status: DailyWordClaimStatus;
  reviewedAt?: Date;
  createdAt: Date;
}

const dailyWordClaimSchema = new Schema<IDailyWordClaim>(
  {
    kidId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true },
    date: { type: String, required: true },
    wordId: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], required: true },
    reviewedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

dailyWordClaimSchema.index({ familyId: 1, status: 1, createdAt: -1 });
dailyWordClaimSchema.index({ kidId: 1, date: 1, status: 1 });
dailyWordClaimSchema.index({ kidId: 1, status: 1, wordId: 1 });

export const DailyWordClaim = mongoose.model<IDailyWordClaim>(
  'DailyWordClaim',
  dailyWordClaimSchema
);
