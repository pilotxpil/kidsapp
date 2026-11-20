import mongoose, { Schema, Document } from 'mongoose';

/** A "secret word of the day". Content is managed in the DB, not in app code. */
export interface IContentWord extends Document {
  wordId: string;
  word: string;
  definition: string;
  hint: string;
  minGrade?: number;
  maxGrade?: number;
  active: boolean;
  source: 'seed' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IContentWord>(
  {
    wordId: { type: String, required: true, unique: true },
    word: { type: String, required: true },
    definition: { type: String, required: true },
    hint: { type: String, required: true },
    minGrade: { type: Number, min: 1, max: 6 },
    maxGrade: { type: Number, min: 1, max: 6 },
    active: { type: Boolean, default: true },
    source: { type: String, enum: ['seed', 'admin'], default: 'seed' },
  },
  { timestamps: true }
);

export const ContentWord = mongoose.model<IContentWord>('ContentWord', schema);
