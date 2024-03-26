// src/app.ts
import { startLogging } from './utils/logger';
import { validateConfig } from './config';
import { initWhatsAppClient } from './services/whatsappClient';

// 日志配置
startLogging();

// 环境变量配置
validateConfig();

// SIGINT信号处理
process.on('SIGINT', () => {
    console.log('Caught interrupt signal, exiting...');
    process.exit();
});

// 启动WhatsApp客户端
initWhatsAppClient().then(() => {
    console.log('WhatsApp 客户端初始化成功，并开始监听消息。');
}).catch(console.error);
