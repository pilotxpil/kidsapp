import { IUser } from '../models/User';

export function formatUser(user: IUser) {
  return {
    _id: user._id.toString(),
    role: user.role,
    familyId: user.familyId.toString(),
    displayName: user.displayName,
    avatar: user.avatar,
    email: user.email,
    username: user.username,
    points: user.points,
    level: user.level,
    xp: user.xp,
    streak: user.streak,
    lastActiveDate: user.lastActiveDate,
    badges: user.badges,
    createdAt: user.createdAt.toISOString(),
  };
}

export function todayString(): string {
  return new Date().toISOString().split('T')[0];
}
