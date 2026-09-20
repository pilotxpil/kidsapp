import { Expo, type ExpoPushMessage } from 'expo-server-sdk';
import type { PushNotificationData, PushNotificationType } from '@kidsapp/shared';
import { PushToken } from '../models/PushToken';
import { User } from '../models/User';

const expo = new Expo();

export interface PushPayload {
  title: string;
  body: string;
  data: PushNotificationData;
}

function fireAndForget(promise: Promise<unknown>): void {
  promise.catch((err) => console.error('[push]', err));
}

async function removeInvalidTokens(tokens: string[]): Promise<void> {
  if (tokens.length === 0) return;
  await PushToken.deleteMany({ token: { $in: tokens } });
}

async function sendToTokens(tokens: string[], payload: PushPayload): Promise<void> {
  const valid = tokens.filter((t) => Expo.isExpoPushToken(t));
  if (valid.length === 0) return;

  const messages: ExpoPushMessage[] = valid.map((to) => ({
    to,
    sound: 'default',
    title: payload.title,
    body: payload.body,
    data: payload.data,
    channelId: 'default',
  }));

  const stale: string[] = [];
  const chunks = expo.chunkPushNotifications(messages);
  let offset = 0;
  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      ticketChunk.forEach((ticket, j) => {
        if (ticket.status === 'error') {
          const errCode = ticket.details?.error;
          if (errCode === 'DeviceNotRegistered') {
            stale.push(valid[offset + j]);
          } else {
            console.error('[push] ticket error', ticket.message, errCode);
          }
        }
      });
    } catch (err) {
      console.error('[push] send failed', err);
    }
    offset += chunk.length;
  }
  await removeInvalidTokens(stale);
}

async function tokensForUserIds(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return [];
  const docs = await PushToken.find({ userId: { $in: userIds } }).select('token');
  return docs.map((d) => d.token);
}

export async function notifyUsers(userIds: string[], payload: PushPayload): Promise<void> {
  const unique = [...new Set(userIds.map(String).filter(Boolean))];
  const tokens = await tokensForUserIds(unique);
  await sendToTokens(tokens, payload);
}

export async function notifyFamilyParents(
  familyId: string,
  payload: PushPayload,
  excludeUserId?: string
): Promise<void> {
  const parents = await User.find({ familyId, role: 'parent' }).select('_id');
  const ids = parents
    .map((p) => p._id.toString())
    .filter((id) => id !== excludeUserId);
  await notifyUsers(ids, payload);
}

/** Non-blocking helpers for route handlers. */
export function pushToUsers(userIds: string[], payload: PushPayload): void {
  fireAndForget(notifyUsers(userIds, payload));
}

export function pushToFamilyParents(
  familyId: string,
  payload: PushPayload,
  excludeUserId?: string
): void {
  fireAndForget(notifyFamilyParents(familyId, payload, excludeUserId));
}

export function pushTaskAssigned(kidIds: string[], taskTitle: string): void {
  pushToUsers(kidIds, {
    title: 'משימה חדשה! ⚔️',
    body: taskTitle,
    data: { type: 'task_assigned' satisfies PushNotificationType },
  });
}

export function pushTaskSubmitted(
  familyId: string,
  kidName: string,
  taskTitle: string,
  excludeUserId?: string
): void {
  pushToFamilyParents(
    familyId,
    {
      title: 'משימה ממתינה לאישור',
      body: `${kidName} סיים/ה: ${taskTitle}`,
      data: { type: 'task_submitted' satisfies PushNotificationType },
    },
    excludeUserId
  );
}

export function pushTaskReviewed(
  kidId: string,
  taskTitle: string,
  approved: boolean,
  points?: number,
  rejectNote?: string
): void {
  pushToUsers([kidId], {
    title: approved ? 'משימה אושרה! 🎉' : 'משימה לא אושרה',
    body: approved
      ? `${taskTitle} — קיבלת ${points ?? 0} נקודות`
      : rejectNote?.trim()
        ? `${taskTitle}: ${rejectNote.trim()}`
        : `${taskTitle} — נסו שוב`,
    data: {
      type: (approved ? 'task_approved' : 'task_rejected') satisfies PushNotificationType,
    },
  });
}

export function pushRewardRedeemed(
  familyId: string,
  kidName: string,
  rewardTitle: string,
  excludeUserId?: string
): void {
  pushToFamilyParents(
    familyId,
    {
      title: 'בקשת פרס ממתינה',
      body: `${kidName} ביקש/ה: ${rewardTitle}`,
      data: { type: 'reward_redeemed' satisfies PushNotificationType },
    },
    excludeUserId
  );
}

export function pushRewardReviewed(kidId: string, rewardTitle: string, approved: boolean): void {
  pushToUsers([kidId], {
    title: approved ? 'הפרס אושר! 🎁' : 'הפרס לא אושר',
    body: approved ? `קיבלת: ${rewardTitle}` : `${rewardTitle} — נסו פרס אחר`,
    data: {
      type: (approved ? 'reward_approved' : 'reward_rejected') satisfies PushNotificationType,
    },
  });
}

export function pushLearningAssigned(kidIds: string[], packTitle: string): void {
  pushToUsers(kidIds, {
    title: 'שיעור חדש מחכה לך 📚',
    body: packTitle,
    data: { type: 'learning_assigned' satisfies PushNotificationType },
  });
}

export function pushBonusAwarded(kidId: string, amount: number, reason: string): void {
  pushToUsers([kidId], {
    title: `קיבלת ${amount} נקודות! ⭐`,
    body: reason,
    data: { type: 'bonus_awarded' satisfies PushNotificationType },
  });
}

export function pushAvatarShopGift(kidId: string): void {
  pushToUsers([kidId], {
    title: 'מתנה מההורים! 🎁',
    body: 'נוב קלאסי מחכה לך בחינם — ובחנות יש אווטארים חדשים לקנייה',
    data: { type: 'avatar_shop_gift' satisfies PushNotificationType },
  });
}
