import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Example API route
app.get('/api/v1/tasks', (_req, res) => {
  res.json([{ id: 1, title: 'Sample task', completed: false }]);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
});

// Error handler
// Do not leak internal errors in production
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? 'Internal Server Error' : err.message,
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

// const { Buffer } = require('buffer');

const buf = Buffer.alloc(100000);

const unsafeBuf = Buffer.allocUnsafe(10000, 1);

console.log(30 >>> 1);
