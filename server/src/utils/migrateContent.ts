/**
 * Imports seed content (repo-root content/{riddles,words,packs}/*.json) into MongoDB.
 * Idempotent and safe to run on every boot:
 *  - new ids are inserted;
 *  - seed-owned docs are refreshed when the seed file changes;
 *  - anything an admin created or edited (source: 'admin') is never touched.
 */
import fs from 'fs';
import path from 'path';
import type { Model } from 'mongoose';
import { ContentRiddle } from '../models/ContentRiddle';
import { ContentWord } from '../models/ContentWord';
import { ContentPack } from '../models/ContentPack';
import { contentDir, parseLearningPack } from '../services/learningPacks';

function readJsonDir(sub: string): unknown[] {
  const dir = contentDir(sub);
  if (!fs.existsSync(dir)) return [];
  const out: unknown[] = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json') && !x.startsWith('._')).sort()) {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
      if (Array.isArray(raw)) out.push(...raw);
      else out.push(raw);
    } catch (err) {
      console.warn(`content seed: cannot read ${sub}/${f}`, err);
    }
  }
  return out;
}

async function upsertSeed(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: Model<any>,
  key: string,
  rows: Array<Record<string, unknown>>
): Promise<number> {
  if (!rows.length) return 0;
  const ops = rows.map((row) => ({
    updateOne: {
      filter: { [key]: row[key], source: { $ne: 'admin' } },
      update: { $set: { ...row, source: 'seed' }, $setOnInsert: { active: true } },
      upsert: true,
    },
  }));
  try {
    await model.bulkWrite(ops, { ordered: false });
  } catch (err) {
    // Duplicate key = the id exists but an admin owns it. Those are skipped on purpose.
    const writeErrors = (err as { writeErrors?: Array<{ code?: number; err?: { code?: number } }> }).writeErrors ?? [];
    const other = writeErrors.filter((e) => (e.code ?? e.err?.code) !== 11000);
    if (other.length || !writeErrors.length) throw err;
  }
  return rows.length;
}

export async function migrateContent() {
  const riddles = (readJsonDir('riddles') as Array<Record<string, unknown>>)
    .filter((r) => typeof r.id === 'string' && (r.track === 'math' || r.track === 'language'))
    .map(({ id, active: _a, ...rest }) => ({ riddleId: id, ...rest }));
  const words = (readJsonDir('words') as Array<Record<string, unknown>>)
    .filter((w) => typeof w.id === 'string' && typeof w.word === 'string')
    .map(({ id, active: _a, ...rest }) => ({ wordId: id, ...rest }));
  const packs = readJsonDir('packs')
    .map((raw) => ({ raw, pack: parseLearningPack(raw) }))
    .filter((x) => x.pack)
    .map(({ raw, pack }) => ({
      packId: pack!.id,
      version: pack!.version,
      category: pack!.category,
      ...(pack!.grade ? { grade: pack!.grade } : {}),
      data: raw as Record<string, unknown>,
    }));

  const [r, w, p] = await Promise.all([
    upsertSeed(ContentRiddle, 'riddleId', riddles),
    upsertSeed(ContentWord, 'wordId', words),
    upsertSeed(ContentPack, 'packId', packs),
  ]);
  console.log(`migrateContent: seeded ${r} riddles, ${w} words, ${p} packs`);
}
