import { serializeTask } from '../utils/serializeTask.js';
import { listTasks, createTask, updateTask, getTaskById, deleteTaskById } from '../services/tasks.service.js';
import {
  uploadSingleAttachment,
  presignGet,
  deleteS3Object,
  deleteAllS3Objects,
} from '../services/attachments.service.js';

export const getTasks = async (req, res, next) => {
  try {
    const tasks = await listTasks(req.query);
    res.json(tasks.map(serializeTask));
  } catch (err) {
    next(err);
  }
};

export const postCreateTask = async (req, res, next) => {
  try {
    const { title, description, completed } = req.body || {};

    const task = await createTask({
      title: title.trim(),
      description: description.trim(),
      completed,
    });

    res.status(201).json(serializeTask(task));
  } catch (err) {
    next(err);
  }
};

export const putEditTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, completed } = req.body || {};

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (completed !== undefined) updateData.completed = completed;

    const task = await updateTask(id, updateData);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(serializeTask(task));
  } catch (err) {
    next(err);
  }
};

export const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;

    const task = await getTaskById(id, 'attachments');

    if (!task) return res.status(404).json({ error: 'Task not found' });

    const keys = (task.attachments || []).map((a) => a.key).filter(Boolean);

    await deleteAllS3Objects(keys);

    await deleteTaskById(id);

    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
};

export const postTaskAttachment = async (req, res, next) => {
  try {
    const task = await getTaskById(req.params.id);

    if (!task) {
      req.resume();
      return res.sendStatus(404);
    }

    let fileMeta;
    try {
      fileMeta = await uploadSingleAttachment({ req, taskId: req.params.id });
    } catch (err) {
      if (err?.status) return res.sendStatus(err.status);
      throw err;
    }

    task.attachments.push({
      key: fileMeta.key,
      name: fileMeta.name,
      size: fileMeta.size,
      contentType: fileMeta.contentType,
    });
    await task.save();

    return res.status(201).json(serializeTask(task));
  } catch (err) {
    next(err);
  }
};

export const getTaskAttachmentPresign = async (req, res, next) => {
  try {
    const rawKey = req.query.key;
    if (!rawKey) return res.sendStatus(400);

    const key = decodeURIComponent(String(rawKey));

    const task = await getTaskById(req.params.id, 'attachments');
    if (!task) return res.sendStatus(404);

    const exists = task.attachments.some((a) => a.key === key);
    if (!exists) return res.sendStatus(404);

    const url = await presignGet(key);
    res.json({ url });
  } catch (err) {
    next(err);
  }
};

export const deleteTaskAttachment = async (req, res, next) => {
  try {
    const rawKey = req.query.key;
    if (!rawKey) return res.sendStatus(400);

    const key = decodeURIComponent(String(rawKey));

    const task = await getTaskById(req.params.id);
    if (!task) return res.sendStatus(404);

    const idx = task.attachments.findIndex((a) => a.key === key);
    if (idx === -1) return res.sendStatus(404);

    await deleteS3Object(key);

    task.attachments.splice(idx, 1);
    await task.save();

    res.json(serializeTask(task));
  } catch (err) {
    next(err);
  }
};
