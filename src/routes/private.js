import { Router } from 'express';
import { Task } from '../models/tasks.js';

const serializeTask = (task) => ({
  id: task._id.toString(),
  title: task.title,
  description: task.description,
  completed: task.completed,
  createdAt: task.createdAt,
});

export const privateRoute = Router();

privateRoute.get('/tasks', async (req, res, next) => {
  try {
    const { title, date, status } = req.query;

    const filter = {};

    if (title) {
      filter.title = { $regex: title, $options: 'i' };
    }

    if (date) {
      filter.createdAt = {
        $gte: new Date(date + 'T00:00:00.000Z'),
        $lte: new Date(date + 'T23:59:59.999Z'),
      };
    }

    if (status === 'active') filter.completed = false;
    if (status === 'done') filter.completed = true;

    const tasks = await Task.find(filter).sort({ _id: -1 }).lean();

    res.json(tasks.map(serializeTask));
  } catch (err) {
    next(err);
  }
});

privateRoute.post('/create-task', async (req, res, next) => {
  try {
    const { title, description, completed } = req.body || {};

    const task = await Task.create({
      title: title.trim(),
      description: description.trim(),
      completed,
    });

    res.status(201).json(serializeTask(task));
  } catch (err) {
    next(err);
  }
});

privateRoute.put('/edit-task/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, completed } = req.body || {};

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (completed !== undefined) updateData.completed = completed;

    const task = await Task.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(serializeTask(task));
  } catch (err) {
    next(err);
  }
});
