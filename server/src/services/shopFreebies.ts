import {
  COSMETIC_ITEMS,
  FREE_AVATAR_ID,
  SHOP_FREE_POINTS_MAX,
  SHOP_FREE_POINTS_MIN,
  SHOP_RENTAL_CHANCE,
  isFreeAvatar,
  type ShopFreebies,
} from '@kidsapp/shared';
import { ShopDailyDeal, IShopDailyDeal } from '../models/ShopDailyDeal';
import { IUser } from '../models/User';
import { todayString } from '../utils/format';
import { awardPoints } from './gamification';

function dailyRoll(kidId: string, date: string, salt: string): number {
  const str = `${kidId}:${date}:${salt}`;
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

function httpError(status: number, message: string): Error {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
}

export function isRentalActive(kid: IUser, today = todayString()): boolean {
  return Boolean(kid.rentalAvatar && kid.rentalUntilDate && kid.rentalUntilDate >= today);
}

export async function expireShopRental(kid: IUser): Promise<void> {
  if (!kid.rentalAvatar) return;
  const today = todayString();
  if (kid.rentalUntilDate && kid.rentalUntilDate >= today) return;
  const was = kid.rentalAvatar;
  kid.rentalAvatar = undefined;
  kid.rentalUntilDate = undefined;
  const owned = kid.ownedCosmetics ?? [];
  if (kid.avatar === was && !isFreeAvatar(was) && !owned.includes(was)) {
    kid.avatar = FREE_AVATAR_ID;
  }
  await kid.save();
}

export function canEquipAvatar(kid: IUser, itemId: string, cost: number): boolean {
  if (cost === 0) return true;
  if ((kid.ownedCosmetics ?? []).includes(itemId)) return true;
  return isRentalActive(kid) && kid.rentalAvatar === itemId;
}

export function ownedWithRental(kid: IUser): string[] {
  const owned = [...(kid.ownedCosmetics ?? [])];
  if (isRentalActive(kid) && kid.rentalAvatar && !owned.includes(kid.rentalAvatar)) {
    owned.push(kid.rentalAvatar);
  }
  return owned;
}

function itemLabel(id: string): string {
  return COSMETIC_ITEMS.find((c) => c.id === id)?.label ?? id;
}

function pointsFor(kid: IUser, date: string): number {
  const span = SHOP_FREE_POINTS_MAX - SHOP_FREE_POINTS_MIN + 1;
  return SHOP_FREE_POINTS_MIN + Math.floor(dailyRoll(kid._id.toString(), date, 'shop-pts') * span);
}

function pickRentalId(kid: IUser, date: string): string | undefined {
  const owned = new Set(kid.ownedCosmetics ?? []);
  const pool = COSMETIC_ITEMS.filter((c) => c.type === 'avatar' && c.cost > 0 && !owned.has(c.id));
  if (pool.length === 0) return undefined;
  if (dailyRoll(kid._id.toString(), date, 'shop-rent') >= SHOP_RENTAL_CHANCE) return undefined;
  const idx = Math.floor(dailyRoll(kid._id.toString(), date, 'shop-rent-id') * pool.length);
  return pool[Math.min(idx, pool.length - 1)].id;
}

async function getOrCreateDeal(kid: IUser): Promise<IShopDailyDeal> {
  const date = todayString();
  const existing = await ShopDailyDeal.findOne({ kidId: kid._id, date });
  if (existing) return existing;
  try {
    return await ShopDailyDeal.create({
      kidId: kid._id,
      familyId: kid.familyId,
      date,
      points: pointsFor(kid, date),
      rentalAvatarId: pickRentalId(kid, date),
      pointsClaimed: false,
      rentalClaimed: false,
    });
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 11000) {
      const again = await ShopDailyDeal.findOne({ kidId: kid._id, date });
      if (again) return again;
    }
    throw err;
  }
}

export async function getShopFreebies(kid: IUser): Promise<ShopFreebies> {
  await expireShopRental(kid);
  const deal = await getOrCreateDeal(kid);
  const owned = kid.ownedCosmetics ?? [];
  let rental: ShopFreebies['rental'] = null;
  if (deal.rentalAvatarId && (deal.rentalClaimed || !owned.includes(deal.rentalAvatarId))) {
    rental = { id: deal.rentalAvatarId, label: itemLabel(deal.rentalAvatarId) };
  }
  const activeRental =
    isRentalActive(kid) && kid.rentalAvatar
      ? { id: kid.rentalAvatar, label: itemLabel(kid.rentalAvatar) }
      : null;
  return {
    date: deal.date,
    points: deal.points,
    pointsClaimed: deal.pointsClaimed,
    rental,
    rentalClaimed: deal.rentalClaimed,
    activeRental,
  };
}

export async function claimShopPoints(kid: IUser): Promise<{ points: number; kid: IUser }> {
  await expireShopRental(kid);
  const deal = await getOrCreateDeal(kid);
  if (deal.pointsClaimed) throw httpError(400, 'כבר לקחתם את נקודות היום');
  deal.pointsClaimed = true;
  await deal.save();
  await awardPoints(kid, deal.points, 'bonus', 'מתנת חנות יומית');
  return { points: deal.points, kid };
}

export async function claimShopRental(
  kid: IUser
): Promise<{ rental: { id: string; label: string }; kid: IUser }> {
  await expireShopRental(kid);
  const deal = await getOrCreateDeal(kid);
  if (!deal.rentalAvatarId) throw httpError(400, 'אין אווטר חינם היום');
  if (deal.rentalClaimed) throw httpError(400, 'כבר לבשתם את האווטר להיום');
  const owned = kid.ownedCosmetics ?? [];
  deal.rentalClaimed = true;
  await deal.save();
  if (!owned.includes(deal.rentalAvatarId)) {
    kid.rentalAvatar = deal.rentalAvatarId;
    kid.rentalUntilDate = todayString();
    kid.avatar = deal.rentalAvatarId;
    await kid.save();
  }
  return { rental: { id: deal.rentalAvatarId, label: itemLabel(deal.rentalAvatarId) }, kid };
}
