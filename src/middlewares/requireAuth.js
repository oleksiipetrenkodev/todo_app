import { authService } from '../../src/services/authService.js';
import { fakeDB } from '../fakeDB/db.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }

  const token = header.slice(7);

  let payload;
  try {
    payload = authService.verify(token);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const user = fakeDB.getUserById(payload.sub);
  if (!user) {
    return res.status(401).json({ error: 'Not authorized' });
  }

  req.user = { id: user.id, email: user.email, role: user.role };
  next();
}
