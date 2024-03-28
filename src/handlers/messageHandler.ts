// .src/handlers/messageHandler.ts
import type { Message } from '@wppconnect-team/wppconnect/dist/api/model/message';
import { logger } from '../utils/logger';
import { isAllowedToProcess } from '../utils/helpers';
import * as stateManager from '../services/stateManager';
import { messageQueue } from '../utils/messageQueueManager';
import { getClient } from '../services/whatsappClient';

export function processMessage(message: Message): void {
    const client = getClient();
    if (!client) {
        logger.error('WhatsApp 客户端尚未初始化。');
        return;
    }

    console.log('收到消息：', message.body);

    // 先检查是否允许处理消息
    if (!isAllowedToProcess(message.chatId, stateManager.excludedNumbersIntervention)) {
        return;
    }

    // 直接将消息加入到队列中，具体的处理逻辑将在 MessageQueueManager 中实现
    messageQueue.enqueue(message);
}
