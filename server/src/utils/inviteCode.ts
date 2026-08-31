import { Family } from '../models/Family';

export const MAX_PARENTS_PER_FAMILY = 2;

export function generateInviteCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function generateUniqueInviteCode(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = generateInviteCode();
    const exists = await Family.findOne({ inviteCode: code });
    if (!exists) return code;
  }
  throw new Error('Failed to generate invite code');
}

export function normalizeInviteCode(code: string): string {
  return code.trim().replace(/\s/g, '');
}
