import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/auth';
import taskRoutes from './routes/tasks';
import rewardRoutes from './routes/rewards';
import kidRoutes from './routes/kids';
import familyRoutes from './routes/family';
import learningRoutes from './routes/learning';
import pushRoutes from './routes/push';
import appRoutes from './routes/app';
import billingRoutes from './routes/billing';
import { loadLearningPacks } from './services/learningPacks';
import { migrateFamilies } from './utils/migrateFamilies';
import { migrateUserIndexes } from './utils/migrateUserIndexes';
import { migratePlans } from './utils/migratePlans';
import { startScheduledJobs } from './services/cron';

dotenv.config();

if (process.env.NODE_ENV === 'production') {
  const secret = process.env.JWT_SECRET ?? '';
  if (secret.length < 24 || /change-me|dev-secret/.test(secret)) {
    console.error('Refusing to start: JWT_SECRET is missing or weak.');
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

// Behind nginx: trust the first proxy so rate limits see the real client IP.
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.' },
});
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'יותר מדי בקשות איפוס. נסו שוב בעוד רבע שעה.' },
});
app.use(['/auth/parent/login', '/auth/kid/login', '/auth/parent/register'], authLimiter);
app.use(['/auth/password/forgot', '/auth/password/reset'], resetLimiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/', (_req, res) => {
  res.json({
    name: 'KidsQuest API',
    status: 'ok',
    health: '/health',
  });
});

app.use('/auth', authRoutes);
app.use('/tasks', taskRoutes);
app.use('/rewards', rewardRoutes);
app.use('/kids', kidRoutes);
app.use('/family', familyRoutes);
app.use('/learning', learningRoutes);
app.use('/push', pushRoutes);
app.use('/app', appRoutes);
app.use('/billing', billingRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'לא נמצא' });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if ((err as { type?: string })?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'הקובץ גדול מדי' });
  }
  if ((err as { type?: string })?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'בקשה לא תקינה' });
  }
  console.error(err);
  res.status(500).json({ error: 'שגיאה בשרת' });
});

async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log(`Connected to MongoDB (${mongoose.connection.name})`);
    await migrateFamilies();
    await migrateUserIndexes();
    await migratePlans();
    loadLearningPacks();
    startScheduledJobs();

    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
