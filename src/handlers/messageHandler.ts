// src/handlers/messageHandler.ts
import type { Message } from '@wppconnect-team/wppconnect/dist/api/model/message';
import { logger } from '../utils/logger';
import { fastGPTService } from '../services/fastGPT';
import { isAllowedToProcess } from '../utils/helpers';
import { splitMessages, sendMessagesWithTypingSimulation } from '../utils/messageUtils';
import * as stateManager from '../services/stateManager';
import { getClient } from '../services/whatsappClient';
import { checkForManualIntervention } from '../utils/intervention';

export async function processMessage(message: Message): Promise<void> {
    const client = getClient();
    if (!client) {
        logger.error('WhatsApp 客户端尚未初始化。');
        return;
    }
    console.log('收到消息:', message.body);

    // 根据消息类型进行处理
    switch (message.type) {
        case 'chat':
            // 进行聊天消息的处理
            if (!isAllowedToProcess(message.chatId, stateManager.excludedNumbersIntervention)) {
                return;
            }

            // 检查是否处于人工干预状态
            await checkForManualIntervention(message.chatId);

            if (stateManager.isManualInterventionActive(message.chatId)) {
                logger.warn('人工干预状态，不处理消息');
                return;
            }

            // 获取 AI 的回复
            try {
                const { answer } = await fastGPTService(message.chatId, message.body);
                const messages = splitMessages(answer); // 分割
                await sendMessagesWithTypingSimulation(client, message.from, message, messages); // 模拟发送
            } catch (error) {
                logger.error('处理消息时出错:', error);
            }
            break;
        case 'image':
        case 'ptt':
        case 'audio':
        case 'document':
        case 'location':
            // 其他消息类型的处理逻辑
            break;
        default:
            logger.error('未知的消息类型:', message.type);
            try {
                await client.sendText(message.from, `Sorry, network is bad, I cannot get your ${message.type} here. Could you please send me a text message?`);
            } catch (error) {
                logger.error('处理未知消息类型时出错:', error);
            }
            break;
    }
}
