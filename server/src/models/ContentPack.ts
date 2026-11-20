import mongoose, { Schema, Document } from 'mongoose';
import type { LearningCategory } from '@kidsapp/shared';

/** A built-in learning pack (the full LearningPack JSON lives in `data`). Family packs stay in FamilyLearningPack. */
export interface IContentPack extends Document {
  packId: string;
  version: number;
  category: LearningCategory;
  grade?: number;
  data: Record<string, unknown>;
  active: boolean;
  source: 'seed' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IContentPack>(
  {
    packId: { type: String, required: true, unique: true },
    version: { type: Number, default: 1 },
    category: { type: String, required: true, index: true },
    grade: { type: Number },
    data: { type: Schema.Types.Mixed, required: true },
    active: { type: Boolean, default: true },
    source: { type: String, enum: ['seed', 'admin'], default: 'seed' },
  },
  { timestamps: true, minimize: false }
);

export const ContentPack = mongoose.model<IContentPack>('ContentPack', schema);
