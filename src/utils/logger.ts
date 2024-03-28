// src/utils/logger.ts
import * as winston from 'winston';
import { Writable } from 'stream';

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

// 创建一个简单的日志存储
const logStore: winston.Logform.TransformableInfo[] = [];

// 创建一个Writable流作为日志存储的stream
const logStream = new Writable({
    write: (chunk, encoding, callback) => {
        const info = JSON.parse(chunk.toString());
        logStore.push(info);
        callback();
    }
});

const storeTransport = new winston.transports.Stream({
    stream: logStream, // 使用刚创建的stream
} as winston.transports.StreamTransportOptions);

// 添加日志清理函数
function cleanOldLogs() {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    while (logStore.length > 0 && new Date(logStore[0].timestamp).getTime() < sevenDaysAgo) {
        logStore.shift(); // 移除数组的第一个元素
    }
}

// 设置定时清理任务
setInterval(cleanOldLogs, 24 * 60 * 60 * 1000);

// 提供一个函数来获取日志存储
export function getLogs() {
    return logStore;
}

// 导出 logger 实例，以便直接使用
export { logger };