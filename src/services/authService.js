import jwt from 'jsonwebtoken';
import { fakeDB } from '../fakeDB/db.js';
import { config } from '../config/env.js';

function login(email, password) {
  const found = fakeDB.getAllUsers().find((user) => user.email === email && user.password === password);
  if (!found) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  const token = jwt.sign({ sub: found.id, email: found.email }, config.jwtSecret, { expiresIn: '1h' });
  return Promise.resolve(token);
}

function verify(token) {
  return jwt.verify(token, config.jwtSecret);
}

export const authService = { login, verify };
