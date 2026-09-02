import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Family } from './models/Family';
import { User } from './models/User';
import { Task } from './models/Task';
import { TaskTemplate } from './models/TaskTemplate';
import { Reward } from './models/Reward';
import { LearningAssignment } from './models/LearningAssignment';
import { LearningProgress } from './models/LearningProgress';
import { TASK_TEMPLATES, taskCategoryIcon, REWARD_TEMPLATES, DEFAULT_KID_THEME_ID, DEFAULT_PARENT_THEME_ID } from '@kidsapp/shared';
import { generateUniqueInviteCode } from './utils/inviteCode';

dotenv.config();

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('Connected to MongoDB');

  await Promise.all([
    User.deleteMany({}),
    Family.deleteMany({}),
    Task.deleteMany({}),
    TaskTemplate.deleteMany({}),
    Reward.deleteMany({}),
    LearningAssignment.deleteMany({}),
    LearningProgress.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash('parent123', 10);
  const parent = await User.create({
    role: 'parent',
    displayName: 'אבא',
    email: 'parent@test.com',
    passwordHash,
    familyId: new mongoose.Types.ObjectId(),
    avatar: '👨‍👩‍👧‍👦',
    uiTheme: DEFAULT_PARENT_THEME_ID,
  });

  const inviteCode = await generateUniqueInviteCode();
  const family = await Family.create({
    name: 'משפחת כהן',
    parentId: parent._id,
    parentIds: [parent._id],
    inviteCode,
  });
  parent.familyId = family._id;
  await parent.save();

  const pinHash = await bcrypt.hash('1234', 10);
  const kid1 = await User.create({
    role: 'kid',
    familyId: family._id,
    displayName: 'יונתן',
    username: 'yonatan',
    pinHash,
    avatar: '🦁',
    uiTheme: DEFAULT_KID_THEME_ID,
    points: 150,
    level: 2,
    xp: 150,
    streak: 3,
  });

  const kid2Pin = await bcrypt.hash('5678', 10);
  const kid2 = await User.create({
    role: 'kid',
    familyId: family._id,
    displayName: 'איתי',
    username: 'itay',
    pinHash: kid2Pin,
    avatar: '🐯',
    uiTheme: DEFAULT_KID_THEME_ID,
    points: 80,
    level: 1,
    xp: 80,
    streak: 1,
  });

  const tasks = [
    ...TASK_TEMPLATES.slice(0, 4).map((t) => ({
      ...t,
      icon: taskCategoryIcon(t.category),
      assignedTo: kid1._id,
    })),
    ...TASK_TEMPLATES.slice(4, 6).map((t) => ({
      ...t,
      icon: taskCategoryIcon(t.category),
      assignedTo: kid2._id,
    })),
    {
      ...TASK_TEMPLATES[6],
      icon: taskCategoryIcon(TASK_TEMPLATES[6].category),
      assignedTo: kid1._id,
    },
  ];

  for (const t of tasks) {
    await Task.create({ ...t, familyId: family._id, description: t.description, recurrence: 'daily' });
  }

  const rewards = [
    ...REWARD_TEMPLATES,
    { title: 'בחירת ארוחת ערב', description: 'אתה בוחר מה לאכול', cost: 300, category: 'privilege' as const, icon: '🍔' },
    { title: 'לישון מאוחר', description: '30 דקות נוספות', cost: 250, category: 'privilege' as const, icon: '🌙' },
    { title: 'יציאה לארקייד', description: 'יום כיף בארקייד', cost: 1200, category: 'other' as const, icon: '🕹️' },
  ];

  for (const r of rewards) {
    await Reward.create({ ...r, familyId: family._id });
  }

  const demoAssignments: { packId: string; kidId: typeof kid1._id }[] = [
    { packId: 'math-addition-10', kidId: kid1._id },
    { packId: 'math-multiply-12', kidId: kid1._id },
    { packId: 'english-fox-tale', kidId: kid1._id },
    { packId: 'hebrew-letters', kidId: kid1._id },
    { packId: 'math-addition-10', kidId: kid2._id },
    { packId: 'english-animals', kidId: kid2._id },
  ];
  for (const row of demoAssignments) {
    await LearningAssignment.create({
      familyId: family._id,
      packId: row.packId,
      kidId: row.kidId,
      assignedBy: parent._id,
    });
  }

  console.log('\n✅ Seed data created!\n');
  console.log('Parent login: parent@test.com / parent123');
  console.log(`Family invite code (for 2nd parent): ${inviteCode}`);
  console.log('Kid 1 login: yonatan / 1234');
  console.log('Kid 2 login: itay / 5678');

  await mongoose.disconnect();
}

seed().catch(console.error);
