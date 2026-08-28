import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPointTransaction extends Document {
  kidId: Types.ObjectId;
  familyId: Types.ObjectId;
  amount: number;
  type: 'task' | 'redemption' | 'bonus' | 'streak' | 'daily';
  description: string;
  referenceId?: Types.ObjectId;
  createdAt: Date;
}

const pointTransactionSchema = new Schema<IPointTransaction>(
  {
    kidId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true },
    amount: { type: Number, required: true },
    type: {
      type: String,
      enum: ['task', 'redemption', 'bonus', 'streak', 'daily'],
      required: true,
    },
    description: { type: String, required: true },
    referenceId: { type: Schema.Types.ObjectId },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const PointTransaction = mongoose.model<IPointTransaction>(
  'PointTransaction',
  pointTransactionSchema
);
