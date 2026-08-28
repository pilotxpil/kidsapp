import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReward extends Document {
  familyId: Types.ObjectId;
  title: string;
  description: string;
  cost: number;
  category: 'gaming' | 'food' | 'screen' | 'privilege' | 'other';
  icon: string;
  imageUrl?: string;
  requiresApproval: boolean;
  isActive: boolean;
  createdAt: Date;
}

const rewardSchema = new Schema<IReward>(
  {
    familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    cost: { type: Number, required: true, min: 1 },
    category: {
      type: String,
      enum: ['gaming', 'food', 'screen', 'privilege', 'other'],
      default: 'other',
    },
    icon: { type: String, default: '🎁' },
    imageUrl: { type: String },
    requiresApproval: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Reward = mongoose.model<IReward>('Reward', rewardSchema);
