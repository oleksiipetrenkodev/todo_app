import { Task } from '../models/tasks.js';

export const listTasks = async ({ title, date, status } = {}) => {
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

  return Task.find(filter).sort({ _id: -1 }).lean();
};

export const createTask = async ({ title, description, completed }) => {
  return Task.create({
    title,
    description,
    completed,
  });
};

export const updateTask = async (id, updateData) => {
  return Task.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });
};

export const getTaskById = async (id, select) => {
  const query = Task.findById(id);
  if (select) query.select(select);
  return query;
};

export const deleteTaskById = async (id) => {
  return Task.findByIdAndDelete(id);
};
