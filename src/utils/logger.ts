// src/utils/logger.ts
import * as winston from 'winston';

export function startLogging() {
  const logger = winston.createLogger({
      level: 'info',
      transports: [new winston.transports.Console()],
  });
  global.console.log = (...args) => {
      const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
      logger.info(message);
  };
}