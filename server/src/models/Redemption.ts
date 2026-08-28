import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRedemption extends Document {
  rewardId: Types.ObjectId;
  kidId: Types.ObjectId;
  familyId: Types.ObjectId;
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled';
  cost: number;
  requestedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: Types.ObjectId;
}

const redemptionSchema = new Schema<IRedemption>({
  rewardId: { type: Schema.Types.ObjectId, ref: 'Reward', required: true },
  kidId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'fulfilled'],
    default: 'pending',
  },
  cost: { type: Number, required: true },
  requestedAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
});

export const Redemption = mongoose.model<IRedemption>('Redemption', redemptionSchema);
