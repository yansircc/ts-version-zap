// .src/services/destroyClient.ts

import { getClient } from './whatsappClient';
import { logger } from '../utils/logger';

export async function destroyClient(): Promise<void> {
    const client = getClient();
    if (!client) {
        logger.error('WhatsApp 客户端尚未初始化。');
        return;
    }

    try {
        await client.close();
        logger.info('WhatsApp 客户端已销毁。');
    } catch (error) {
        logger.error('销毁 WhatsApp 客户端时出错:', error);
    }
}