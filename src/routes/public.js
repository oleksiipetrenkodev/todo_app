import { Router } from 'express';
import { authService } from '../services/authService.js';

export const publicRouter = Router();

publicRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    const token = await authService.login(email, password);
    res.json({ token });
  } catch (err) {
    next(err);
  }
});

// Just for testing
publicRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});
