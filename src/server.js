import 'dotenv/config';
import app from './app.js';
import { config } from './config/env.js';
import { connectToDb, closeDb } from './db.js';

await connectToDb();

const server = app.listen(config.port, () => {
  console.log(`Server running at http://localhost:${config.port}`);
});

let isShuttingDown = false;

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`Received ${signal}. Gracefully shutting down...`);

  let exitCode = 0;

  if (server.listening) {
    try {
      await new Promise((resolve, reject) => {
        server.close(err => (err ? reject(err) : resolve()));
      });
      console.log('HTTP server closed');
    } catch (err) {
      exitCode = 1;
      console.error('Error closing HTTP server', err);
    }
  }

  try {
    await closeDb();
    console.log('✅ Shutdown complete, MongoDB connection closed');
  } catch (err) {
    exitCode = 1;
    console.error('Error disconnecting from MongoDB', err);
  }

  process.exit(exitCode);
}

['SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal, () => {
    void shutdown(signal);
  });
});
