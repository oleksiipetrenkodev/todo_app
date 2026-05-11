import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { User } from '../models/User.js';
import { config } from '../config/env.js';

async function register(email, password) {
  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, password: hash });
  return jwt.sign({ sub: user._id, email: user.email }, config.jwtSecret, { expiresIn: '1h' });
}

async function login(email, password) {
  const user = await User.findOne({ email });
  if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  return jwt.sign({ sub: user._id, email: user.email }, config.jwtSecret, { expiresIn: '1h' });
}

function verify(token) {
  return jwt.verify(token, config.jwtSecret);
}

export const authService = { register, login, verify };
