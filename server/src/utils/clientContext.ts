import { AsyncLocalStorage } from 'node:async_hooks';
import type { Request, Response, NextFunction } from 'express';
import { RIDDLE_IMAGE_MIN_APP_VERSION } from '@kidsapp/shared';

/**
 * Who is calling: the app sends `X-App-Version` (from 2.3.1). Kept per request in
 * AsyncLocalStorage so deep services (riddle picking) can ask what the client can show
 * without threading a parameter through every call.
 */
type ClientContext = { appVersion: string | null };

const store = new AsyncLocalStorage<ClientContext>();

function parseVersion(raw: unknown): string | null {
  const v = typeof raw === 'string' ? raw.trim() : '';
  return /^\d+(\.\d+){0,3}$/.test(v) ? v : null;
}

export function clientContext(req: Request, _res: Response, next: NextFunction) {
  store.run({ appVersion: parseVersion(req.header('x-app-version')) }, next);
}

/** a >= b for dotted numeric versions. */
export function versionAtLeast(a: string, b: string): boolean {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x > y;
  }
  return true;
}

/** Older apps draw an unknown riddle picture as the forest scene, so uploaded pictures need 2.3.1+. */
export function clientShowsRiddleImages(): boolean {
  const v = store.getStore()?.appVersion;
  return !!v && versionAtLeast(v, RIDDLE_IMAGE_MIN_APP_VERSION);
}
