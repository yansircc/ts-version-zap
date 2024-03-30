// src/app.ts
import * as dotenv from 'dotenv';
dotenv.config();

import { startLogging, logger } from './utils/logger';
import { validateConfig } from './config';
import { initWhatsAppClient } from './services/whatsappClient';

// 导入并启动 Express 服务器
//import './public/server';

startLogging();
validateConfig();

// 启动WhatsApp客户端
initWhatsAppClient().then(() => {
    logger.info('WhatsApp 客户端中...');
}).catch(logger.error);

// SIGINT信号处理留在最后
process.on('SIGINT', () => {
    logger.debug('Caught interrupt signal, exiting...');
    process.exit();
});
