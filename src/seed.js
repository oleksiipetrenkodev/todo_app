import { connectToDb, closeDb } from './db.js';
import { Task } from './models/tasks.js';

const fakeTasks = [
  { title: 'Learn Docker basics', completed: false },
  { title: 'Fix backend API', completed: true },
  { title: 'Connect FE with BE', completed: false },
];

(async () => {
  try {
    await connectToDb();
    console.log('✅ Connected to MongoDB');

    await Task.deleteMany({});
    await Task.insertMany(fakeTasks);

    console.log('🌱 Seeded tasks:', fakeTasks);
  } catch (err) {
    console.error('❌ Error seeding data:', err);
  } finally {
    await closeDb();
    process.exit(0);
  }
})();
