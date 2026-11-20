/**
 * Content admin: daily riddles, daily words and built-in learning packs live in MongoDB and are
 * edited here. Protected by ADMIN_TOKEN (server/.env); when it is unset the whole router is off.
 *
 *   GET  /admin                     → the admin page (server/admin/index.html)
 *   GET  /admin/api/stats
 *   GET  /admin/api/export          → every item, in the seed-file format
 *   POST /admin/api/import          → { riddles?, words?, packs? } bulk upsert
 *   GET  /admin/api/:kind           → list (kind = riddles | words | packs)
 *   GET  /admin/api/:kind/:id
 *   PUT  /admin/api/:kind/:id       → create or replace
 *   PATCH /admin/api/:kind/:id      → { active }
 *   DELETE /admin/api/:kind/:id     → deletes unused admin items; anything else is deactivated
 *
 * Writes mark the item source 'admin', so the boot-time seed import never overwrites them.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import type { Model } from 'mongoose';
import { ContentRiddle } from '../models/ContentRiddle';
import { ContentWord } from '../models/ContentWord';
import { ContentPack } from '../models/ContentPack';
import { DailyRiddleClaim } from '../models/DailyRiddleClaim';
import { DailyWordClaim } from '../models/DailyWordClaim';
import { LearningProgress } from '../models/LearningProgress';
import { contentStats, reloadContent } from '../services/contentStore';
import { validateRiddle, validateWord } from '../services/contentValidate';
import { parseLearningPack } from '../services/learningPacks';

const router = express.Router();

/** Express 4 does not catch rejected promises from async handlers. */
const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

const ADMIN_PAGE = path.resolve(__dirname, '../../admin/index.html');

function tokenMatches(given: string): boolean {
  const expected = process.env.ADMIN_TOKEN || '';
  if (expected.length < 24 || !given) return false;
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

router.use((_req: Request, res: Response, next: NextFunction) => {
  if ((process.env.ADMIN_TOKEN || '').length < 24) return res.status(404).json({ error: 'לא נמצא' });
  next();
});

router.get('/', (_req: Request, res: Response) => {
  if (!fs.existsSync(ADMIN_PAGE)) return res.status(404).send('admin page missing');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.sendFile(ADMIN_PAGE);
});

const badTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.' },
});

router.use('/api', badTokenLimiter, (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization || '';
  const given = header.startsWith('Bearer ') ? header.slice(7) : String(req.headers['x-admin-token'] || '');
  if (!tokenMatches(given)) return res.status(401).json({ error: 'קוד ניהול שגוי' });
  next();
});

type Kind = 'riddles' | 'words' | 'packs';

type KindSpec = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: Model<any>;
  key: 'riddleId' | 'wordId' | 'packId';
  validate: (raw: unknown) => { ok: true; row: Record<string, unknown>; id: string } | { ok: false; error: string };
  toExport: (doc: Record<string, unknown>) => Record<string, unknown>;
  usedBy: (id: string) => Promise<boolean>;
};

function stripMeta(doc: Record<string, unknown>, key: string) {
  const { _id, __v, createdAt, updatedAt, source, active, [key]: id, ...rest } = doc;
  void _id; void __v; void createdAt; void updatedAt; void source; void active;
  return { id, ...rest };
}

const SPECS: Record<Kind, KindSpec> = {
  riddles: {
    model: ContentRiddle,
    key: 'riddleId',
    validate: (raw) => {
      const v = validateRiddle(raw);
      if (!v.ok) return v;
      const { id, ...rest } = v.value;
      return { ok: true, id, row: { riddleId: id, alts: [], ...rest } };
    },
    toExport: (d) => stripMeta(d, 'riddleId'),
    usedBy: async (id) => !!(await DailyRiddleClaim.exists({ riddleId: id })),
  },
  words: {
    model: ContentWord,
    key: 'wordId',
    validate: (raw) => {
      const v = validateWord(raw);
      if (!v.ok) return v;
      const { id, ...rest } = v.value;
      return { ok: true, id, row: { wordId: id, ...rest } };
    },
    toExport: (d) => stripMeta(d, 'wordId'),
    usedBy: async (id) => !!(await DailyWordClaim.exists({ wordId: id })),
  },
  packs: {
    model: ContentPack,
    key: 'packId',
    validate: (raw) => {
      const pack = parseLearningPack(raw);
      if (!pack) {
        const id = raw && typeof raw === 'object' ? String((raw as { id?: unknown }).id ?? '') : '';
        return { ok: false, error: `${id || 'חבילה'}: חבילת לימוד לא תקינה (ראו content/packs/README.md)` };
      }
      if (pack.id.startsWith('custom_')) return { ok: false, error: `${pack.id}: מזהים custom_ שמורים לחבילות של משפחות` };
      return {
        ok: true,
        id: pack.id,
        row: {
          packId: pack.id,
          version: pack.version,
          category: pack.category,
          grade: pack.grade ?? null,
          data: raw as Record<string, unknown>,
        },
      };
    },
    toExport: (d) => d.data as Record<string, unknown>,
    usedBy: async (id) => !!(await LearningProgress.exists({ packId: id })),
  },
};

function specFor(req: Request, res: Response): KindSpec | null {
  const kind = req.params.kind as Kind;
  const spec = SPECS[kind];
  if (!spec) {
    res.status(404).json({ error: 'סוג תוכן לא מוכר' });
    return null;
  }
  return spec;
}

function listRow(kind: Kind, d: Record<string, unknown>) {
  const base = { active: d.active, source: d.source, updatedAt: d.updatedAt };
  if (kind === 'packs') {
    const data = (d.data ?? {}) as { title?: { he?: string }; activities?: unknown[]; kind?: string };
    return {
      id: d.packId,
      title: data.title?.he ?? d.packId,
      category: d.category,
      grade: d.grade ?? null,
      kind: data.kind ?? 'quiz',
      activities: data.activities?.length ?? 0,
      ...base,
    };
  }
  return { ...SPECS[kind].toExport(d), ...base };
}

async function afterWrite() {
  await reloadContent();
}

router.get('/api/stats', wrap(async (_req: Request, res: Response) => {
  const [riddles, words, packs] = await Promise.all([
    ContentRiddle.countDocuments(),
    ContentWord.countDocuments(),
    ContentPack.countDocuments(),
  ]);
  res.json({ active: contentStats(), total: { riddles, words, packs } });
}));

router.get('/api/export', wrap(async (_req: Request, res: Response) => {
  const out: Record<string, unknown[]> = {};
  for (const kind of Object.keys(SPECS) as Kind[]) {
    const spec = SPECS[kind];
    const docs = await spec.model.find({}).sort({ [spec.key]: 1 }).lean();
    out[kind] = docs.map((doc) => {
      const d = doc as Record<string, unknown>;
      return { ...spec.toExport(d), ...(kind === 'packs' ? {} : { active: d.active }) };
    });
  }
  res.setHeader('Content-Disposition', `attachment; filename="kidsquest-content-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json(out);
}));

router.post('/api/import', wrap(async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const report: Record<string, { saved: number; errors: string[] }> = {};
  for (const kind of Object.keys(SPECS) as Kind[]) {
    const items = body[kind];
    if (!Array.isArray(items)) continue;
    const spec = SPECS[kind];
    const errors: string[] = [];
    const ops = [];
    for (const raw of items) {
      const v = spec.validate(raw);
      if (!v.ok) {
        errors.push(v.error);
        continue;
      }
      const active = (raw as { active?: unknown }).active;
      ops.push({
        updateOne: {
          filter: { [spec.key]: v.id },
          update: { $set: { ...v.row, source: 'admin', ...(typeof active === 'boolean' ? { active } : {}) }, $setOnInsert: typeof active === 'boolean' ? {} : { active: true } },
          upsert: true,
        },
      });
    }
    if (ops.length) await spec.model.bulkWrite(ops, { ordered: false });
    report[kind] = { saved: ops.length, errors };
  }
  await afterWrite();
  res.json({ report, stats: contentStats() });
}));

router.post('/api/reload', wrap(async (_req: Request, res: Response) => {
  await afterWrite();
  res.json({ stats: contentStats() });
}));

router.get('/api/:kind', wrap(async (req: Request, res: Response) => {
  const spec = specFor(req, res);
  if (!spec) return;
  const kind = req.params.kind as Kind;
  const filter: Record<string, unknown> = {};
  if (kind === 'riddles' && (req.query.track === 'math' || req.query.track === 'language')) filter.track = req.query.track;
  const docs = await spec.model.find(filter).sort({ [spec.key]: 1 }).lean();
  res.json({ items: docs.map((d) => listRow(kind, d as Record<string, unknown>)) });
}));

router.get('/api/:kind/:id', wrap(async (req: Request, res: Response) => {
  const spec = specFor(req, res);
  if (!spec) return;
  const doc = await spec.model.findOne({ [spec.key]: req.params.id }).lean();
  if (!doc) return res.status(404).json({ error: 'לא נמצא' });
  const d = doc as Record<string, unknown>;
  res.json({ item: spec.toExport(d), active: d.active, source: d.source });
}));

router.put('/api/:kind/:id', wrap(async (req: Request, res: Response) => {
  const spec = specFor(req, res);
  if (!spec) return;
  const v = spec.validate({ ...(req.body ?? {}), id: req.params.id });
  if (!v.ok) return res.status(400).json({ error: v.error });
  const row = { ...v.row, source: 'admin' };
  const unset: Record<string, ''> = {};
  for (const k of ['extra', 'visual', 'minGrade', 'maxGrade']) if (!(k in row)) unset[k] = '';
  await spec.model.updateOne(
    { [spec.key]: v.id },
    { $set: row, ...(Object.keys(unset).length && req.params.kind !== 'packs' ? { $unset: unset } : {}), $setOnInsert: { active: true } },
    { upsert: true }
  );
  await afterWrite();
  res.json({ ok: true, id: v.id });
}));

router.patch('/api/:kind/:id', wrap(async (req: Request, res: Response) => {
  const spec = specFor(req, res);
  if (!spec) return;
  if (typeof req.body?.active !== 'boolean') return res.status(400).json({ error: 'active חייב להיות true או false' });
  const r = await spec.model.updateOne({ [spec.key]: req.params.id }, { $set: { active: req.body.active } });
  if (!r.matchedCount) return res.status(404).json({ error: 'לא נמצא' });
  await afterWrite();
  res.json({ ok: true });
}));

router.delete('/api/:kind/:id', wrap(async (req: Request, res: Response) => {
  const spec = specFor(req, res);
  if (!spec) return;
  const id = req.params.id as string;
  const doc = await spec.model.findOne({ [spec.key]: id }).lean();
  if (!doc) return res.status(404).json({ error: 'לא נמצא' });
  // Seed items would come back on the next boot, and played items are referenced by kids' history:
  // those are only switched off.
  const keep = (doc as { source?: string }).source !== 'admin' || (await spec.usedBy(id));
  if (keep) await spec.model.updateOne({ [spec.key]: id }, { $set: { active: false } });
  else await spec.model.deleteOne({ [spec.key]: id });
  await afterWrite();
  res.json({ ok: true, result: keep ? 'deactivated' : 'deleted' });
}));

router.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('admin', err);
  res.status(500).json({ error: 'שגיאת שרת' });
});

export default router;
