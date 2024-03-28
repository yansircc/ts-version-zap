// src/services/whatsappClient.ts
import * as wppconnect from '@wppconnect-team/wppconnect';
import type { Message } from '@wppconnect-team/wppconnect/dist/api/model/message';
import { processMessage, isValidMessage } from '../handlers/messageHandler';
import { config } from '../config';
import { logger } from '../utils/logger';

// Main function to start the application
export async function initWhatsAppClient(): Promise<void> {
    try {
        const wppClient = await wppconnect.create({
            session: config.wppSessionName,
            puppeteerOptions: {
                userDataDir: './whatsapp-session/' + config.wppSessionName,
            },
            catchQR: (base64Qrimg, asciiQR) => {
                // 在这里处理二维码，例如显示在控制台或发送给某人扫描
                logger.info('请扫描下面的 QR 码登录 WhatsApp');
                logger.info(asciiQR);
            },
            statusFind: (statusSession, session) => {
                logger.debug('Session Status: ', statusSession);
                // 在这里可以根据session的状态做一些事情，比如当session失效时重启session
            },
            headless: true, // 无头模式，如果你想看浏览器操作可以设置为false
            // 其他配置项根据需要添加
        });

        // 设置消息接收的回调函数
        wppClient.onMessage(async (message: Message) => {
            if (isValidMessage(message)) {
                try {
                    await processMessage(wppClient, message);
                } catch (error) {
                    logger.error('处理消息时发生错误:', error);
                }
            }
        });

        logger.info('WhatsApp 客户端初始化成功，并开始监听消息。');
    } catch (error) {
        logger.error('初始化 WhatsApp 客户端失败:', error);
    }
}