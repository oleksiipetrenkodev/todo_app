import { Router } from 'express';
import { authService } from '../services/authService.js';

export const authRoute = Router();

authRoute.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    const token = await authService.login(email, password);
    res.json({ token });
  } catch (err) {
    next(err);
  }
});
