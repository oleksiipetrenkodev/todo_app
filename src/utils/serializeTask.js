export const serializeTask = (task) => ({
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
