import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/auth';
import taskRoutes from './routes/tasks';
import rewardRoutes from './routes/rewards';
import kidRoutes from './routes/kids';
import familyRoutes from './routes/family';
import { migrateFamilies } from './utils/migrateFamilies';
import { migrateUserIndexes } from './utils/migrateUserIndexes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

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

async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log(`Connected to MongoDB (${mongoose.connection.name})`);
    await migrateFamilies();
    await migrateUserIndexes();

    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
