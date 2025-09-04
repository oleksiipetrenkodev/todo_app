import express from 'express';
import cors from 'cors';
import { authService } from '../src/services/authService.js';
import { requireAuth } from '../src/middlewares/requireAuth.js';

const app = express();

app.use(cors());
app.use(express.json());

app.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    const token = await authService.login(email, password);
    res.json({ token });
  } catch (err) {
    next(err);
  }
});

app.get('/api/v1/tasks', requireAuth, (_req, res) => {
  res.json([
    { id: 1, title: 'Sample task', completed: false },
    { id: 2, title: 'Another task', completed: true },
  ]);
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
});

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? 'Internal Server Error' : err.message,
  });
});

export default app;
