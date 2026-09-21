import mongoose, { Schema, Document, Types } from 'mongoose';
import { UI_THEME_IDS } from '@kidsapp/shared';

export interface IUser extends Document {
  role: 'parent' | 'kid';
  familyId: Types.ObjectId;
  displayName: string;
  avatar: string;
  email?: string;
  passwordHash?: string;
  username?: string;
  pinHash?: string;
  points: number;
  level: number;
  xp: number;
  streak: number;
  lastActiveDate?: string;
  learningStreak: number;
  lastLearningDate?: string;
  badges: string[];
  uiTheme?: 'ember' | 'minecraft' | 'brawl' | 'roblox' | 'sparkle';
  ownedCosmetics: string[];
  equippedFrame?: string;
  equippedEffect?: string;
  rentalAvatar?: string;
  rentalUntilDate?: string;
  goalRewardId?: Types.ObjectId;
  /** Kid school grade 1–6 (כיתה א–ו). */
  grade?: number;
  /** Custom line on the home dashboard. */
  heroLine?: string;
  /** Last one-time avatar shop gift campaign notified to this kid. */
  lastAvatarGiftCampaign?: string;
  createdAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    role: { type: String, enum: ['parent', 'kid'], required: true },
    familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true },
    displayName: { type: String, required: true },
    avatar: { type: String, default: '🦁' },
    email: { type: String, unique: true, sparse: true },
    passwordHash: { type: String },
    username: { type: String, sparse: true },
    pinHash: { type: String },
    points: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    lastActiveDate: { type: String },
    learningStreak: { type: Number, default: 0 },
    lastLearningDate: { type: String },
    badges: { type: [String], default: [] },
    uiTheme: { type: String, enum: [...UI_THEME_IDS] },
    ownedCosmetics: { type: [String], default: [] },
    equippedFrame: { type: String },
    equippedEffect: { type: String },
    rentalAvatar: { type: String },
    rentalUntilDate: { type: String },
    goalRewardId: { type: Schema.Types.ObjectId, ref: 'Reward' },
    grade: { type: Number, min: 1, max: 6 },
    heroLine: { type: String, maxlength: 48 },
    lastAvatarGiftCampaign: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

userSchema.index(
  { username: 1, familyId: 1 },
  { unique: true, partialFilterExpression: { username: { $exists: true, $type: 'string' } } }
);

export const User = mongoose.model<IUser>('User', userSchema);
