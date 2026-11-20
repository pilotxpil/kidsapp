import mongoose from 'mongoose';

const TARGET_INDEX = 'username_1_familyId_1';

export async function migrateUserIndexes() {
  const collection = mongoose.connection.collection('users');
  let indexes: Awaited<ReturnType<typeof collection.indexes>> = [];
  try {
    indexes = await collection.indexes();
  } catch (err) {
    // Fresh database: the collection does not exist yet (NamespaceNotFound) — nothing to migrate.
    if ((err as { code?: number }).code !== 26) throw err;
  }
  const existing = indexes.find((idx) => idx.name === TARGET_INDEX);

  const hasPartialFilter = Boolean(existing?.partialFilterExpression);

  if (existing && !hasPartialFilter) {
    await collection.dropIndex(TARGET_INDEX);
    console.log('Dropped legacy username+familyId index');
  }

  // Ensures schema index is synced (creates partial unique index if missing).
  await mongoose.model('User').syncIndexes();
}
