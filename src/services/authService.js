import jwt from 'jsonwebtoken';
import { fakeDB } from '../fakeDB/db.js';

function login(email, password) {
  const found = fakeDB.getAllUsers().find((user) => user.email === email && user.password === password);
  if (!found) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  const token = jwt.sign({ sub: found.id, email: found.email }, process.env.JWT_SECRET || 'dev', { expiresIn: '1h' });
  return Promise.resolve(token);
}

function verify(token) {
  return jwt.verify(token, process.env.JWT_SECRET || 'dev');
}

export const authService = { login, verify };
