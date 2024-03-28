// src/utils/logger.ts
import * as winston from 'winston';

// 创建 logger 实例
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss',
        }),
        winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.simple(),
        }),
    ],
});

// 导出 logger 实例，以便直接使用
export { logger };

// 启动日志配置并重写 console.log
export function startLogging() {
    global.console.log = (...args) => {
        const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
        logger.info(message);
    };
    global.console.error = (...args) => {
        const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
        logger.error(message);
    };
    // 可以根据需要添加对 console.warn, console.info 等的重写
}
