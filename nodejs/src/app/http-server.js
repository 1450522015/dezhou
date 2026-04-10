/**
 * HTTP 层：Express 应用与 Node http.Server（不含业务路由注册）
 */

const express = require('express');
const http = require('http');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

function buildCorsOptions(config) {
  const origins = config?.CORS?.origins || ['*'];
  if (origins.includes('*')) {
    return { origin: true };
  }
  const allowSet = new Set(origins);
  return {
    origin(origin, callback) {
      if (!origin || allowSet.has(origin)) {
        return callback(null, true);
      }
      return callback(new Error('CORS origin blocked'));
    },
  };
}

function createHttpServer(config) {
  const app = express();
  const server = http.createServer(app);

  app.use(cors(buildCorsOptions(config)));

  const rate = config?.RATE_LIMIT || {};
  const apiLimiter = rateLimit({
    windowMs: rate.apiWindowMs || 15 * 60 * 1000,
    max: rate.apiMax || 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: '请求过于频繁，请稍后重试' },
  });
  app.use('/api/', apiLimiter);

  const authLimiter = rateLimit({
    windowMs: rate.authWindowMs || 15 * 60 * 1000,
    max: rate.authMax || 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: '登录/注册请求过于频繁，请稍后再试' },
  });
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);

  app.use(express.json());

  return { app, server };
}

module.exports = { createHttpServer };
