import { Router } from 'express';
import {
  getTasks,
  postCreateTask,
  putEditTask,
  deleteTask,
  postTaskAttachment,
  getTaskAttachmentPresign,
  deleteTaskAttachment,
} from '../controllers/tasks.controller.js';

export const privateRoute = Router();

privateRoute.get('/tasks', getTasks);
privateRoute.post('/create-task', postCreateTask);
privateRoute.put('/edit-task/:id', putEditTask);
privateRoute.delete('/delete-task/:id', deleteTask);
privateRoute.post('/tasks/:id/attachments', postTaskAttachment);
privateRoute.get('/tasks/:id/attachments/presign-get', getTaskAttachmentPresign);
privateRoute.delete('/tasks/:id/attachments', deleteTaskAttachment);
