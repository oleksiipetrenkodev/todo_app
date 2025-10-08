// db.js
import mongoose from 'mongoose';
import { config } from './config/env.js';

let connectPromise = null;
let listenersBound = false;

function bindResetters() {
  if (listenersBound) return;
  listenersBound = true;
  mongoose.connection.on('disconnected', () => {
    connectPromise = null;
  });
  mongoose.connection.on('error', () => {
    connectPromise = null;
  });
}

export async function connectToDb(uri = config.mongodbUri) {
  if (mongoose.connection.readyState === 1) return mongoose;
  if (connectPromise) return await connectPromise;
  bindResetters();
  try {
    connectPromise = mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    const m = await connectPromise;
    console.log('✅ Connected to MongoDB via Mongoose');
    return m;
  } catch (err) {
    connectPromise = null;
    throw err;
  }
}

export async function closeDb() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    connectPromise = null;
    console.log('🔌 Disconnected from MongoDB');
  }
}
