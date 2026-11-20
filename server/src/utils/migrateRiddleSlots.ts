import mongoose from 'mongoose';
import { DailyRiddleClaim } from '../models/DailyRiddleClaim';
import { ContentRiddle } from '../models/ContentRiddle';

/**
 * Two daily riddles (math + language): claims gained a `slot`.
 * Drops the old one-claim-per-day unique index and tags legacy claims with their riddle's track.
 * Idempotent; must run after migrateContent (riddle tracks come from the DB).
 */
export async function migrateRiddleSlots() {
  const col = mongoose.connection.collection('dailyriddleclaims');
  try {
    const indexes = await col.indexes();
    if (indexes.some((i) => i.name === 'kidId_1_date_1')) {
      await col.dropIndex('kidId_1_date_1');
      console.log('migrateRiddleSlots: dropped one-per-day index');
    }
  } catch (err) {
    if ((err as { code?: number }).code !== 26) throw err;
  }

  const legacy = await DailyRiddleClaim.find({ slot: { $exists: false } }).select('riddleId').lean();
  if (legacy.length) {
    const ids = [...new Set(legacy.map((c) => c.riddleId))];
    const tracks = new Map(
      (await ContentRiddle.find({ riddleId: { $in: ids } }).select('riddleId track').lean()).map((r) => [r.riddleId, r.track])
    );
    await DailyRiddleClaim.bulkWrite(
      legacy.map((c) => ({
        updateOne: { filter: { _id: c._id }, update: { $set: { slot: tracks.get(c.riddleId) ?? 'math' } } },
      }))
    );
    console.log(`migrateRiddleSlots: tagged ${legacy.length} claims`);
  }
  await DailyRiddleClaim.syncIndexes();
}
