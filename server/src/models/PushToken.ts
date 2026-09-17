import mongoose, { Schema, Document, Types } from 'mongoose';
import type { PushPlatform } from '@kidsapp/shared';

export interface IPushToken extends Document {
  userId: Types.ObjectId;
  familyId: Types.ObjectId;
  token: string;
  platform: PushPlatform;
  updatedAt: Date;
  createdAt: Date;
}

const pushTokenSchema = new Schema<IPushToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true, index: true },
    token: { type: String, required: true, unique: true },
    platform: {
      type: String,
      enum: ['ios', 'android', 'web', 'unknown'],
      default: 'unknown',
    },
  },
  { timestamps: true }
);

export const PushToken = mongoose.model<IPushToken>('PushToken', pushTokenSchema);
