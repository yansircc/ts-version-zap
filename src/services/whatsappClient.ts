// src/services/whatsappClient.ts
import * as wppconnect from '@wppconnect-team/wppconnect';
import type { Whatsapp } from '@wppconnect-team/wppconnect';
import type { Message } from '@wppconnect-team/wppconnect/dist/api/model/message';
import { processMessage } from '../handlers/messageHandler';
import { isValidMessage } from '../utils/isValidMessage';
import { config } from '../config';
import { logger } from '../utils/logger';
import { writeFile } from 'fs';
import path from 'path';

let clientInstance: Whatsapp | null = null;

// Main function to start the application
export async function initWhatsAppClient(): Promise<void> {
    if (clientInstance !== null) {
        // 客户端已初始化
        return;
    }

    try {
        const wppClient = await wppconnect.create({
            session: config.wppSessionName,
            puppeteerOptions: {
                userDataDir: './whatsapp-session/' + config.wppSessionName,
                headless: true,
                args: ['--no-sandbox'],
            },
            catchQR: (base64Qrimg, asciiQR) => {
                const base64Data = base64Qrimg.split(';base64,').pop();

                if (base64Data) {
                    const qrcodePath = path.join(__dirname, '../../public/qrcode.png');
                    const dataBuffer = Buffer.from(base64Data, 'base64');
                    writeFile("./public/qrcode.png", dataBuffer, function (err) {
                        if (err) {
                            logger.error('保存二维码图片失败:', err);
                        } else {
                            logger.info(`备用二维码地址http://{此处改成服务器ip地址}:3000/qrcode.png`);
                        }
                    });
                } else {
                    // 如果base64Data是undefined，可以在这里处理错误或记录日志
                    logger.error('无法解析QR码的Base64数据');
                }
            },
            statusFind: (statusSession, session) => {
                logger.debug('Session Status: ', statusSession);
                // 可以根据session状态进行操作
            },
            headless: true,
        });

        wppClient.onMessage(async (message: Message) => {
            if (isValidMessage(message)) {
                try {
                    await processMessage(message);
                } catch (error) {
                    logger.error('处理消息时发生错误:', error);
                }
            }
        });

        clientInstance = wppClient;
        logger.info('WhatsApp 客户端正在初始化，请等待。');
    } catch (error) {
        logger.error('初始化 WhatsApp 客户端失败:', error);
    }
}

export function getClient(): Whatsapp | null {
    return clientInstance;
}
