import { Router } from 'express';
import { getDb } from '../db.js';

export const privateRoute = Router();

privateRoute.get('/tasks', async (_req, res, next) => {
  try {
    const db = await getDb();
    const tasks = await db.collection('tasks').find({}).sort({ _id: -1 }).toArray();

    res.json(tasks);
  } catch (err) {
    next(err);
  }
});
