import mongoose, { Schema, Document } from 'mongoose';
import type { DailyRiddleCat, RiddleTrack, RiddleVisual } from '@kidsapp/shared';

/** A daily riddle. Content is managed in the DB (admin API / seed files), not in app code. */
export interface IContentRiddle extends Document {
  riddleId: string;
  track: RiddleTrack;
  cat: DailyRiddleCat;
  prompt: string;
  extra?: string;
  visual?: RiddleVisual;
  hint: string;
  answer: string;
  alts: string[];
  why: string;
  choices: string[];
  minGrade?: number;
  maxGrade?: number;
  active: boolean;
  source: 'seed' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IContentRiddle>(
  {
    riddleId: { type: String, required: true, unique: true },
    track: { type: String, enum: ['math', 'language'], required: true, index: true },
    cat: { type: String, enum: ['pic', 'odd', 'idiom', 'math', 'logic', 'word'], required: true },
    prompt: { type: String, required: true },
    extra: { type: String },
    visual: { type: Schema.Types.Mixed },
    hint: { type: String, required: true },
    answer: { type: String, required: true },
    alts: { type: [String], default: [] },
    why: { type: String, required: true },
    choices: { type: [String], required: true },
    minGrade: { type: Number, min: 1, max: 6 },
    maxGrade: { type: Number, min: 1, max: 6 },
    active: { type: Boolean, default: true },
    source: { type: String, enum: ['seed', 'admin'], default: 'seed' },
  },
  { timestamps: true }
);

export const ContentRiddle = mongoose.model<IContentRiddle>('ContentRiddle', schema);
