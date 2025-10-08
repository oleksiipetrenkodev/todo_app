import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI', 'PORT'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const config = {
  jwtSecret: process.env.JWT_SECRET,
  port: process.env.PORT,
  mongodbUri: process.env.MONGODB_URI,
};
