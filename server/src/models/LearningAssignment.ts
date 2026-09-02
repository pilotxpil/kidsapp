import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ILearningAssignment extends Document {
  familyId: Types.ObjectId;
  packId: string;
  kidId: Types.ObjectId;
  assignedBy: Types.ObjectId;
  createdAt: Date;
}

const learningAssignmentSchema = new Schema<ILearningAssignment>(
  {
    familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true },
    packId: { type: String, required: true },
    kidId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

learningAssignmentSchema.index({ kidId: 1, packId: 1 }, { unique: true });
learningAssignmentSchema.index({ familyId: 1, packId: 1 });

export const LearningAssignment = mongoose.model<ILearningAssignment>(
  'LearningAssignment',
  learningAssignmentSchema
);
