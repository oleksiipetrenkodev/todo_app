import { Router } from 'express';
import { Task } from '../models/tasks.js';

import { GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import Busboy from 'busboy';
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

privateRoute.post('/tasks/:id/attachments', async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      req.resume();
      return res.sendStatus(404);
    }

    const busboy = Busboy({
      headers: req.headers,
      limits: { files: 1, fileSize: MAX_SIZE },
    });

    let fileSeen = false;
    let uploadPromise = null;
    let upload = null;
    let fileSize = 0;
    let fileMeta = null;
    let responded = false;
    let streamError = null;

    const sendOnce = (status, payload) => {
      if (responded) return;
      responded = true;
      if (payload) return res.status(status).json(payload);
      return res.sendStatus(status);
    };

    busboy.on('file', (fieldname, file, info) => {
      if (fileSeen) {
        file.resume();
        streamError = streamError || { status: 400 };
        return;
      }

      fileSeen = true;
      const contentType = info?.mimeType;
      const originalName = info?.filename || 'file';

      if (!ALLOWED.includes(contentType)) {
        file.resume();
        streamError = streamError || { status: 400 };
        return;
      }

      const key = `tasks/${req.params.id}/${uuid()}-${safeFilename(originalName)}`;
      fileMeta = { key, name: originalName, contentType };

      upload = new Upload({
        client: s3,
        params: {
          Bucket: process.env.AWS_S3_BUCKET,
          Key: key,
          Body: file,
          ContentType: contentType,
        },
      });

      uploadPromise = upload.done().catch((err) => {
        // swallow abort error; keep other errors
        if (err?.name === 'AbortError' || String(err?.message).includes('aborted')) return;
        throw err;
      });

      file.on('data', (chunk) => {
        console.log('data', chunk.length);
        fileSize += chunk.length;
      });

      file.on('limit', () => {
        console.log('limit');
        streamError = streamError || { status: 413 };
        if (upload) upload.abort();
      });
    });

    busboy.on('error', (err) => {
      console.log('error', err);
      streamError = streamError || { status: 400, err };
    });

    busboy.on('filesLimit', () => {
      streamError = streamError || { status: 400 };
    });

    busboy.on('finish', async () => {
      try {
        if (!fileSeen) return sendOnce(400);
        if (streamError?.status) {
          if (uploadPromise) await uploadPromise;
          return sendOnce(streamError.status);
        }
        if (!uploadPromise || !fileMeta) return sendOnce(400);

        await uploadPromise;

        task.attachments.push({
          key: fileMeta.key,
          name: fileMeta.name,
          size: fileSize,
          contentType: fileMeta.contentType,
        });
        await task.save();

        return sendOnce(201, serializeTask(task));
      } catch (err) {
        return next(err);
      }
    });

    req.pipe(busboy);
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
