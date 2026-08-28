import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Family } from './models/Family';
import { User } from './models/User';
import { Task } from './models/Task';
import { Reward } from './models/Reward';

dotenv.config();

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('Connected to MongoDB');

  await Promise.all([
    User.deleteMany({}),
    Family.deleteMany({}),
    Task.deleteMany({}),
    Reward.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash('parent123', 10);
  const parent = await User.create({
    role: 'parent',
    displayName: 'אבא',
    email: 'parent@test.com',
    passwordHash,
    familyId: new mongoose.Types.ObjectId(),
    avatar: '👨‍👩‍👧‍👦',
  });

  const family = await Family.create({
    name: 'משפחת כהן',
    parentId: parent._id,
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
    points: 80,
    level: 1,
    xp: 80,
    streak: 1,
  });

  const tasks = [
    { title: 'לסדר את החדר', category: 'home', points: 20, icon: '🟩', assignedTo: kid1._id },
    { title: 'לעשות שיעורי בית', category: 'school', points: 30, icon: '📖', assignedTo: kid1._id },
    { title: 'לתרגל כדורגל', category: 'sport', points: 25, icon: '🏹', assignedTo: kid1._id },
    { title: 'לעזור בארוחת ערב', category: 'home', points: 15, icon: '🟩', assignedTo: kid1._id },
    { title: 'לקרוא 20 דקות', category: 'school', points: 20, icon: '📖', assignedTo: kid2._id },
    { title: 'לצאת עם חבר', category: 'social', points: 15, icon: '👨‍🌾', assignedTo: kid2._id },
    { title: 'חוג רובוטיקה', category: 'hobby', points: 35, icon: '🎣', assignedTo: kid1._id },
  ];

  for (const t of tasks) {
    await Task.create({ ...t, familyId: family._id, description: '', recurrence: 'daily' });
  }

  const rewards = [
    { title: '80 Robux', description: 'רובוקס לרובלוקס', cost: 500, category: 'gaming', icon: '🎮' },
    { title: 'Brawl Stars Gems', description: '100 ג׳מס', cost: 400, category: 'gaming', icon: '💎' },
    { title: 'Minecraft Coins', description: 'מטבעות למיינקראפט', cost: 350, category: 'gaming', icon: '⛏️' },
    { title: 'הזמנת פיצה', description: 'פיצה מהמסעדה האהובה', cost: 800, category: 'food', icon: '🍕' },
    { title: '30 דק מסך נוסף', description: 'זמן מסך בונוס', cost: 150, category: 'screen', icon: '📱' },
    { title: 'בחירת ארוחת ערב', description: 'אתה בוחר מה לאכול', cost: 300, category: 'privilege', icon: '🍔' },
    { title: 'לישון מאוחר', description: '30 דקות נוספות', cost: 250, category: 'privilege', icon: '🌙' },
    { title: 'יציאה לארקייד', description: 'יום כיף בארקייד', cost: 1200, category: 'other', icon: '🕹️' },
  ];

  for (const r of rewards) {
    await Reward.create({ ...r, familyId: family._id });
  }

  console.log('\n✅ Seed data created!\n');
  console.log('Parent login: parent@test.com / parent123');
  console.log('Kid 1 login: yonatan / 1234');
  console.log('Kid 2 login: itay / 5678');

  await mongoose.disconnect();
}

seed().catch(console.error);
