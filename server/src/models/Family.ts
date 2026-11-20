import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IFamily extends Document {
  name: string;
  /** @deprecated use parentIds */
  parentId?: Types.ObjectId;
  parentIds: Types.ObjectId[];
  inviteCode: string;
  settings: {
    language: string;
    theme: string;
  };
  /** free | premium | founder. Legacy docs without it are migrated at boot (see migratePlans). */
  plan?: 'free' | 'premium' | 'founder';
  /** Paid premium end (subscription expiry). Unset = no expiry (founder / lifetime). */
  premiumUntil?: Date;
  premiumWillRenew?: boolean;
  billingSource?: 'revenuecat' | 'play' | 'manual' | 'founder';
  /** Latest Google Play subscription purchase token (verified server-side). */
  playPurchaseToken?: string;
  billingProductId?: string;
  billingUpdatedAt?: Date;
  createdAt: Date;
}

const familySchema = new Schema<IFamily>(
  {
    name: { type: String, required: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'User' },
    parentIds: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
    inviteCode: { type: String, unique: true, sparse: true },
    settings: {
      language: { type: String, default: 'he' },
      theme: { type: String, default: 'gaming' },
    },
    // No schema default on purpose: a missing value marks a pre-launch family for migratePlans.
    plan: { type: String, enum: ['free', 'premium', 'founder'] },
    premiumUntil: { type: Date },
    premiumWillRenew: { type: Boolean },
    billingSource: { type: String, enum: ['revenuecat', 'play', 'manual', 'founder'] },
    playPurchaseToken: { type: String, select: false, index: { sparse: true } },
    billingProductId: { type: String },
    billingUpdatedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Family = mongoose.model<IFamily>('Family', familySchema);
