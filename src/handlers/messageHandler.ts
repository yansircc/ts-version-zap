import type { Message } from '@wppconnect-team/wppconnect/dist/api/model/message';
import { logger } from '../utils/logger';
import { fastGPTService } from '../services/fastGPT';
import { isAllowedToProcess } from '../utils/helpers';
import { splitMessages, sendMessagesWithTypingSimulation } from '../utils/messageUtils';
import * as stateManager from '../services/stateManager';
import { getClient } from '../services/whatsappClient';
import { checkForManualIntervention } from '../utils/intervention';
import { messageQueue } from '../utils/messageQueueManager';

export function processMessage(message: Message): void {
    const client = getClient();
    if (!client) {
        logger.error('WhatsApp 客户端尚未初始化。');
        return;
    }

    // 先检查是否允许处理消息
    if (!isAllowedToProcess(message.chatId, stateManager.excludedNumbersIntervention)) {
        return;
    }

    // 根据消息类型进行处理
    switch (message.type) {
        case 'chat':
            // 对于文本消息，检查人工干预状态，然后使用队列合并逻辑
            messageQueue.enqueue(message, async (combinedMessage: Message) => {
                await checkForManualIntervention(message.chatId);
                if (stateManager.isManualInterventionActive(message.chatId)) {
                    logger.warn('人工干预状态，不处理消息');
                    return;
                }

                try {
                    // 注意这里我们使用 combinedMessage.chatId 和 combinedMessage.body
                    // 因为 combinedMessage 现在是一个完整的 Message 对象
                    const { answer } = await fastGPTService(combinedMessage.chatId, combinedMessage.body);
                    const messages = splitMessages(answer);
                    await sendMessagesWithTypingSimulation(client, combinedMessage.from, combinedMessage, messages);
                } catch (error) {
                    logger.error('处理消息时出错:', error);
                }
            });
            break;

        case 'image':
        case 'ptt':
        case 'audio':
        case 'document':
        case 'location':
            // 对于非文本消息，直接处理而不合并
            logger.info(`接收到${message.type}消息，但当前不合并处理此类消息。`);
            // 这里可以添加特定类型消息的处理逻辑
            break;

        default:
            logger.error('未知的消息类型:', message.type);
            try {
                client.sendText(message.from, `Sorry, I can't process your ${message.type} message. Please send me a text message.`);
            } catch (error) {
                logger.error('处理未知消息类型时出错:', error);
            }
            break;
    }
}
