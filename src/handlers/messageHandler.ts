// src/handlers/messageHandler.ts
import { Whatsapp } from '@wppconnect-team/wppconnect';
import type { Message } from '@wppconnect-team/wppconnect/dist/api/model/message';
import { logger } from '../utils/logger';
import { config } from '../config';
import { fastGPTService } from '../services/fastGPT';
import { isAllowedToProcess } from '../utils/helpers';
import { splitMessages, sendMessagesWithTypingSimulation } from '../utils/messageUtils';
import * as stateManager from '../services/stateManager';
import { getClient } from '../services/whatsappClient';

export async function checkForManualIntervention(client: Whatsapp, chatId: string): Promise<void> {
    // 获取最近消息，并筛选出最后一条由自己发出的消息
    async function getLastMessageSentByMe(chatId: string): Promise<Message | null> {
        const client = getClient();
        if (!client) {
            console.error('WhatsApp 客户端尚未初始化。');
            return null;
        }

        try {
            // 获取最近的10条消息
            const messages = await client.getMessages(chatId, { count: 3 });
            // 从获取的消息中筛选出最后一条由您发送的消息，利用(message as any).fromMe绕过提示
            const messagesSentByMe = messages.filter(message => (message as any).fromMe);

            // 获取并移除数组中的最后一个元素，即最后一条由您发送的消息
            const lastMessageSentByMe = messagesSentByMe.pop() ?? null;

            return lastMessageSentByMe;
        } catch (error) {
            console.error('获取消息时出错:', error);
            return null;
        }
    }

    const message = await getLastMessageSentByMe(chatId);
    if (message && message.body.endsWith(config.humanInterventionKeyword)) {
        stateManager.activateManualIntervention(chatId);
        logger.info(`检测到人工干预关键词: ${message.body}`);
        return;
    }
    if (message && message.body.endsWith(config.aiInterventionKeyword)) {
        stateManager.deactivateManualIntervention(chatId);
        logger.info(`检测到AI接管关键词: ${message.body}`);
        return;
    }
}

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
            await checkForManualIntervention(client, message.chatId);

            if (stateManager.isManualInterventionActive(message.chatId)) {
                logger.warn('人工干预状态，不处理消息');
                return;
            }

            // 获取 AI 的回复
            try {
                const { answer } = await fastGPTService(message.chatId, message.body); // 假设直接使用 fastGPTService 获取回复
                const messages = splitMessages(answer); // 使用 splitMessages 函数分割长文本回复
                await sendMessagesWithTypingSimulation(client, message.from, message, messages); // 使用 sendMessagesWithTypingSimulation 函数发送消息
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

/**
 * 检查一个消息是否有效
 * 
 * @param message 要检查的消息
 * @returns 返回一个布尔值，表示消息是否有效
 */
export function isValidMessage(message: Message): boolean {
    // 检查是否是群组消息
    if (message.isGroupMsg) {
        logger.warn('忽略群组消息');
        return false; // 如果是群组消息，则不处理
    }

    // 检查消息类型，如果不是文本或图片，不处理
    if (message.type !== 'chat' && message.type !== 'image' && message.type !== 'ptt' && message.type !== 'audio' && message.type !== 'document' && message.type !== 'location') {
        logger.warn('忽略非文本消息');
        return false; // 如果不是文本消息，则不处理
    }

    // 检查是否是系统消息，例如可以检查sender的id等
    // 示例中没有相关的属性，但如果有，可以像这样检查
    // if (message.sender?.id === 'system') {
    //   logger.warn('忽略系统消息');
    //   return false;
    // }

    // 根据需要，可以添加更多的检查

    // 如果所有检查都通过，则消息有效
    return true;
}
