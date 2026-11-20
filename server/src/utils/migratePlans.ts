import { Family } from '../models/Family';

/**
 * Families created before the public (paid) launch become founders: premium forever.
 * Idempotent — only touches families that never had a plan set. New families get
 * `plan: 'free'` explicitly at registration, so they never match.
 */
export const FOUNDER_CUTOFF = new Date(process.env.FOUNDER_CUTOFF || '2026-12-01T00:00:00Z');

export async function migratePlans() {
  const res = await Family.updateMany(
    { plan: { $exists: false }, createdAt: { $lt: FOUNDER_CUTOFF } },
    { $set: { plan: 'founder', billingSource: 'founder', billingUpdatedAt: new Date() } }
  );
  if (res.modifiedCount) console.log(`migratePlans: ${res.modifiedCount} founder families`);

  // Anything left without a plan (created after the cutoff by an older API build) is free.
  const rest = await Family.updateMany({ plan: { $exists: false } }, { $set: { plan: 'free' } });
  if (rest.modifiedCount) console.log(`migratePlans: ${rest.modifiedCount} free families`);
}
