import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IFamily extends Document {
  name: string;
  /** @deprecated use parentIds */
  parentId?: Types.ObjectId;
  parentIds: Types.ObjectId[];
  inviteCode: string;
  settings: {
    language: string;
    theme: string;
  };
  createdAt: Date;
}

const familySchema = new Schema<IFamily>(
  {
    name: { type: String, required: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'User' },
    parentIds: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
    inviteCode: { type: String, unique: true, sparse: true },
    settings: {
      language: { type: String, default: 'he' },
      theme: { type: String, default: 'gaming' },
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Family = mongoose.model<IFamily>('Family', familySchema);
