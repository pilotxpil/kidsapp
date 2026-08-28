import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IFamily extends Document {
  name: string;
  parentId: Types.ObjectId;
  settings: {
    language: string;
    theme: string;
  };
  createdAt: Date;
}

const familySchema = new Schema<IFamily>(
  {
    name: { type: String, required: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    settings: {
      language: { type: String, default: 'he' },
      theme: { type: String, default: 'gaming' },
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Family = mongoose.model<IFamily>('Family', familySchema);
