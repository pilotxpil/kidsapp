import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IShopDailyDeal extends Document {
  kidId: Types.ObjectId;
  familyId: Types.ObjectId;
  date: string;
  points: number;
  rentalAvatarId?: string;
  pointsClaimed: boolean;
  rentalClaimed: boolean;
  createdAt: Date;
}

const shopDailyDealSchema = new Schema<IShopDailyDeal>(
  {
    kidId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true },
    date: { type: String, required: true },
    points: { type: Number, required: true },
    rentalAvatarId: { type: String },
    pointsClaimed: { type: Boolean, default: false },
    rentalClaimed: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

shopDailyDealSchema.index({ kidId: 1, date: 1 }, { unique: true });

export const ShopDailyDeal = mongoose.model<IShopDailyDeal>('ShopDailyDeal', shopDailyDealSchema);
