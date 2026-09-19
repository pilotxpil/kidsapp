import mongoose, { Schema, Document, Types } from 'mongoose';

/** Built-in packs a family has removed from their catalog. */
export interface IFamilyHiddenLearningPack extends Document {
  familyId: Types.ObjectId;
  packId: string;
  hiddenBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const familyHiddenLearningPackSchema = new Schema(
  {
    familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true, index: true },
    packId: { type: String, required: true },
    hiddenBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

familyHiddenLearningPackSchema.index({ familyId: 1, packId: 1 }, { unique: true });

export const FamilyHiddenLearningPack = mongoose.model<IFamilyHiddenLearningPack>(
  'FamilyHiddenLearningPack',
  familyHiddenLearningPackSchema
);
