import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    name: { type: String, required: true },
    size: { type: Number, required: true },
    contentType: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const taskSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    titleTokens: { type: [String], required: true, index: true },
    description: { type: String, default: '' },
    completed: { type: Boolean, default: false, required: true },
    attachments: { type: [attachmentSchema], default: [] },
  },
  { timestamps: true },
);

taskSchema.pre('validate', function (next) {
  if (this.title) {
    const lowerCaseTitle = this.title.toLowerCase();

    this.titleTokens = lowerCaseTitle
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  }
  next();
});

taskSchema.index({ userId: 1, completed: 1, createdAt: -1, _id: -1 });
taskSchema.index({ userId: 1, createdAt: -1, _id: -1 });

export const Task = mongoose.model('Task', taskSchema);
