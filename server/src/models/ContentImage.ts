import mongoose, { Schema, Document } from 'mongoose';

/**
 * A picture uploaded in the content admin (e.g. for a picture riddle). Stored in MongoDB so it
 * travels with the content; served publicly at GET /app/images/:id. Never edited in place, so
 * responses can be cached forever.
 */
export interface IContentImage extends Document {
  mime: 'image/png' | 'image/jpeg' | 'image/webp';
  data: Buffer;
  bytes: number;
  width: number;
  height: number;
  createdAt: Date;
}

const schema = new Schema<IContentImage>(
  {
    mime: { type: String, enum: ['image/png', 'image/jpeg', 'image/webp'], required: true },
    data: { type: Buffer, required: true },
    bytes: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const ContentImage = mongoose.model<IContentImage>('ContentImage', schema);

/** Upper bound for one uploaded picture (the admin page resizes before uploading). */
export const MAX_CONTENT_IMAGE_BYTES = 700 * 1024;
