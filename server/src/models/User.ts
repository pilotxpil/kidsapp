import mongoose, { Schema, Document, Types } from 'mongoose';

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
  badges: string[];
  uiTheme?: 'minecraft' | 'brawl' | 'roblox' | 'sparkle';
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
    badges: { type: [String], default: [] },
    uiTheme: { type: String, enum: ['minecraft', 'brawl', 'roblox', 'sparkle'], default: 'minecraft' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

userSchema.index({ username: 1, familyId: 1 }, { unique: true, sparse: true });

export const User = mongoose.model<IUser>('User', userSchema);
