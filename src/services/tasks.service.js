import { Task } from '../models/tasks.js';

export const listTasks = async ({ title, date, status, userId } = {}) => {
  const filter = { userId };

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

export const createTask = async ({ title, description, completed, userId }) => {
  return Task.create({ title, description, completed, userId });
};

export const updateTask = async (id, updateData, userId) => {
  return Task.findOneAndUpdate({ _id: id, userId }, updateData, { new: true, runValidators: true });
};

export const getTaskById = async (id, userId, select) => {
  const query = Task.findOne({ _id: id, userId });
  if (select) query.select(select);
  return query;
};

export const deleteTaskById = async (id, userId) => {
  return Task.findOneAndDelete({ _id: id, userId });
};
