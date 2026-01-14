import express from 'express';
import cors from 'cors';
import { authGate } from './middlewares/authGate.js';
import { publicRouter } from './routes/public.js';
import { privateRoute } from './routes/private.route.js';

const app = express();

app.use(cors());
app.use(express.json());

// Global gate goes BEFORE routers,
// but it lets public paths pass through
app.use(authGate);

// Public routes
app.use(publicRouter);

// Private routes
app.use(privateRoute);

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
