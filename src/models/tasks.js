import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    completed: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  { timestamps: true },
);

export const Task = mongoose.model('Task', taskSchema);
