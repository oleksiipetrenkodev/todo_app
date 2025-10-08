import { Router } from 'express';
import { Task } from '../models/tasks.js';

export const privateRoute = Router();

privateRoute.get('/tasks', async (_req, res, next) => {
  try {
    const tasks = await Task.find({}).sort({ _id: -1 }).lean();

    res.json(tasks);
  } catch (err) {
    next(err);
  }
});
