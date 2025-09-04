import express from 'express';
import cors from 'cors';
import { authService } from './services/authService.js';
import { requireAuth } from './middlewares/requireAuth.js';

const app = express();
const PORT = process.env.PORT || 3000;

// --- Global middleware ---
app.use(cors());
app.use(express.json());

// --- Public login route ---
app.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    const token = await authService.login(email, password);
    res.json({ token });
  } catch (err) {
    next(err); // pass error to error handler
  }
});

// --- Protected tasks route ---
app.get('/api/v1/tasks', requireAuth, (_req, res) => {
  res.json([
    { id: 1, title: 'Sample task', completed: false },
    { id: 2, title: 'Another task', completed: true },
  ]);
});

// --- Health check route ---
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// --- 404 handler (must be after all routes) ---
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
});

// --- Global error handler (must be last) ---
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? 'Internal Server Error' : err.message,
  });
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
