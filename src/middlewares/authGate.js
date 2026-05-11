import { isPublicPath } from '../config/publicPaths.js';
import { User } from '../models/User.js';
import { authService } from '../services/authService.js';

export async function authGate(req, res, next) {
  if (isPublicPath(req.path)) return next();

  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }

  const token = header.slice(7);

  let payload;
  try {
    payload = authService.verify(token);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const user = await User.findById(payload.sub).lean();
  if (!user) return res.status(401).json({ error: 'Not authorized' });

  req.user = { id: user._id, email: user.email };
  next();
}
