import mongoose from 'mongoose';

const TARGET_INDEX = 'username_1_familyId_1';

export async function migrateUserIndexes() {
  const collection = mongoose.connection.collection('users');
  const indexes = await collection.indexes();
  const existing = indexes.find((idx) => idx.name === TARGET_INDEX);

  const hasPartialFilter = Boolean(existing?.partialFilterExpression);

  if (existing && !hasPartialFilter) {
    await collection.dropIndex(TARGET_INDEX);
    console.log('Dropped legacy username+familyId index');
  }

  // Ensures schema index is synced (creates partial unique index if missing).
  await mongoose.model('User').syncIndexes();
}
