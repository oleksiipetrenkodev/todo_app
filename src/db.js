import { MongoClient, Db } from 'mongodb';
import { config } from './config/env.js';

const uri = config.mongodbUri;
const client = new MongoClient(uri);

let cachedDb = null;

export async function getDb() {
  if (cachedDb) return cachedDb;
  await client.connect();
  cachedDb = client.db();
  return cachedDb;
}

export async function closeDb() {
  await client.close();
}
