import { Router } from 'express';
import { Task } from '../models/tasks.js';

import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';
import { s3 } from '../s3.js';

const serializeTask = (task) => ({
  id: task._id.toString(),
  title: task.title,
  description: task.description,
  completed: task.completed,
  createdAt: task.createdAt,
  attachments: (task.attachments || []).map((attachment) => ({
    key: attachment.key,
    name: attachment.name,
    size: attachment.size,
    contentType: attachment.contentType,
    createdAt: attachment.createdAt,
  })),
});

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

// 20MB
const MAX_SIZE = 20 * 1024 * 1024;

const safeFilename = (name) => String(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');

export const privateRoute = Router();

privateRoute.get('/tasks', async (req, res, next) => {
  try {
    const { title, date, status } = req.query;

    const filter = {};

    if (title) {
      const token = String(title).toLowerCase().trim();
      filter.titleTokens = token;
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

privateRoute.delete('/delete-task/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id).select('attachments');

    if (!task) return res.status(404).json({ error: 'Task not found' });

    const keys = (task.attachments || []).map((a) => a.key).filter(Boolean);

    // delete from S3 first
    await Promise.allSettled(
      keys.map((key) =>
        s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: key,
          }),
        ),
      ),
    );

    await Task.findByIdAndDelete(id);

    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

privateRoute.post('/tasks/:id/attachments/presign', async (req, res, next) => {
  try {
    const { filename, contentType } = req.body || {};
    if (!ALLOWED.includes(contentType)) return res.sendStatus(400);

    const task = await Task.findById(req.params.id).select('_id');
    if (!task) return res.sendStatus(404);

    const key = `tasks/${req.params.id}/${uuid()}-${safeFilename(filename)}`;

    const putObjectCommand = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, putObjectCommand, { expiresIn: 60 });
    res.json({ uploadUrl, key });
  } catch (err) {
    console.error('PRESIGN ERROR:', err);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

privateRoute.post('/tasks/:id/attachments', async (req, res, next) => {
  try {
    const { key, name, size, contentType } = req.body || {};

    if (!key || !name || !contentType || typeof size !== 'number') return res.sendStatus(400);
    if (!ALLOWED.includes(contentType)) return res.sendStatus(400);
    if (size > MAX_SIZE) return res.sendStatus(413);

    const task = await Task.findById(req.params.id);
    if (!task) return res.sendStatus(404);

    task.attachments.push({ key, name, size, contentType });
    await task.save();

    res.status(201).json(serializeTask(task));
  } catch (err) {
    next(err);
  }
});

privateRoute.get('/tasks/:id/attachments/presign-get', async (req, res, next) => {
  try {
    const rawKey = req.query.key;
    if (!rawKey) return res.sendStatus(400);

    const key = decodeURIComponent(String(rawKey));

    const task = await Task.findById(req.params.id).select('attachments');
    if (!task) return res.sendStatus(404);

    const exists = task.attachments.some((a) => a.key === key);
    if (!exists) return res.sendStatus(404);

    const getObjectCommand = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
    });

    const url = await getSignedUrl(s3, getObjectCommand, { expiresIn: 300 });
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

privateRoute.delete('/tasks/:id/attachments', async (req, res, next) => {
  try {
    const rawKey = req.query.key;
    if (!rawKey) return res.sendStatus(400);

    const key = decodeURIComponent(String(rawKey));

    const task = await Task.findById(req.params.id);
    if (!task) return res.sendStatus(404);

    const idx = task.attachments.findIndex((a) => a.key === key);
    if (idx === -1) return res.sendStatus(404);

    // delete from S3 first
    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key,
      }),
    );

    // delete metadata from Mongo
    task.attachments.splice(idx, 1);
    await task.save();

    res.json(serializeTask(task));
  } catch (err) {
    next(err);
  }
});
