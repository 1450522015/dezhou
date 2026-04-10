/**
 * 环境变量与运行时配置（从仓库根 .env 加载）
 */

const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, '..', '..', '..', '.env'),
});

const { GAME } = require('./constants');

function toInt(input, fallback) {
  const n = Number(input);
  return Number.isFinite(n) ? n : fallback;
}

const requiredInProduction = ['JWT_SECRET', 'MONGODB_URI'];
if (process.env.NODE_ENV === 'production') {
  for (const key of requiredInProduction) {
    if (!process.env[key]) {
      throw new Error(`[FATAL] Missing required env var in production: ${key}`);
    }
  }
}

const corsOrigins = (process.env.CORS_ORIGINS || '*')
  .split(',')
  .map(item => item.trim())
  .filter(Boolean);

module.exports = {
  PORT: Number(process.env.NODEJS_PORT) || 3000,
  HOST: process.env.NODEJS_IP || '0.0.0.0',

  MONGODB: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    dbName: process.env.MONGODB_DB_NAME || 'dezhou',
  },

  REDIS: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: process.env.REDIS_DB || 0,
  },

  JWT: {
    secret: process.env.JWT_SECRET || 'dezhou-poker-secret-key-2024',
    expiresIn: '7d',
  },

  CORS: {
    origins: corsOrigins.length ? corsOrigins : ['*'],
  },

  RATE_LIMIT: {
    apiWindowMs: toInt(process.env.RATE_LIMIT_API_WINDOW_MS, 15 * 60 * 1000),
    apiMax: toInt(process.env.RATE_LIMIT_API_MAX, 300),
    authWindowMs: toInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS, 15 * 60 * 1000),
    authMax: toInt(process.env.RATE_LIMIT_AUTH_MAX, 20),
  },

  GAME,

  AI: {
    pythonApiBaseUrl: `${process.env.PYTHON_PROTOCOL || 'http'}://${process.env.PYTHON_IP || '127.0.0.1'}:${process.env.PYTHON_PORT || 8000}`,
    timeout: 15000,
    simulations: Number(process.env.AI_SIMULATIONS || 300),
    minThinkDelay: Number(process.env.AI_MIN_THINK_DELAY || 300),
    maxThinkDelay: Number(process.env.AI_MAX_THINK_DELAY || 1200),
  },
};
