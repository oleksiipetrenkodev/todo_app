import { Router } from 'express';

export const privateRoute = Router();

privateRoute.get('/api/v1/tasks', (_req, res) => {
  res.json([
    { id: 1, title: 'Sample task', completed: false },
    { id: 2, title: 'Another task', completed: true },
  ]);
});
