// src/lib/logger.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Centralized pino logger with pretty terminal output.
// Import this anywhere: import logger from './lib/logger.mjs'
// ─────────────────────────────────────────────────────────────────────────────

import pino from 'pino';

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

const logger = pino({
  level: LOG_LEVEL,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname',
      messageFormat: '{msg}',
      levelFirst: true,
    },
  },
});

export default logger;
