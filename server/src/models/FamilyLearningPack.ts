import mongoose, { Schema, Document, Types } from 'mongoose';
import type {
  LearningActivity,
  LearningCategory,
  LearningPackKind,
  LocalizedText,
} from '@kidsapp/shared';

export interface IFamilyLearningPack extends Document {
  familyId: Types.ObjectId;
  packId: string;
  version: number;
  title: LocalizedText;
  category: LearningCategory;
  kind: LearningPackKind;
  passage?: LocalizedText;
  passageTitle?: LocalizedText;
  grade?: number;
  tags: string[];
  defaultPoints: number;
  activities: LearningActivity[] | Record<string, unknown>[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const localizedSchema = {
  he: { type: String, required: true },
  en: { type: String },
};

const familyLearningPackSchema = new Schema(
  {
    familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true, index: true },
    packId: { type: String, required: true },
    version: { type: Number, default: 1 },
    title: { type: localizedSchema, required: true },
    category: {
      type: String,
      enum: ['language', 'math', 'english', 'science', 'general'],
      required: true,
    },
    kind: { type: String, enum: ['quiz', 'reading'], default: 'quiz' },
    passage: { type: localizedSchema },
    passageTitle: { type: localizedSchema },
    grade: { type: Number, min: 1, max: 6 },
    tags: { type: [String], default: [] },
    defaultPoints: { type: Number, required: true, min: 1, max: 100 },
    activities: { type: [Schema.Types.Mixed], required: true, default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

familyLearningPackSchema.index({ familyId: 1, packId: 1 }, { unique: true });

export const FamilyLearningPack = mongoose.model<IFamilyLearningPack>(
  'FamilyLearningPack',
  familyLearningPackSchema
);
