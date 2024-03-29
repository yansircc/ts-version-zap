import type { Message } from '@wppconnect-team/wppconnect/dist/api/model/message';
import { logger } from '../utils/logger';
import { fastGPTService } from './fastGPT';
import { splitMessages, sendMessagesWithTypingSimulation } from '../utils/messageUtils';
import { getClient } from './whatsappClient';
import * as stateManager from './stateManager';
import { checkForManualIntervention } from '../utils/intervention';
import { isAllowedToProcess } from '../utils/helpers';

interface ChatQueue {
    messages: Message[];
    processing: boolean;
    mergeTimeout: NodeJS.Timeout | null;
}

export class ChatQueueManager {
    private chatQueues: { [chatId: string]: ChatQueue } = {};

    async enqueue(message: Message): Promise<void> {
        const chatId = message.chatId;
        if (!this.chatQueues[chatId]) {
            this.chatQueues[chatId] = { messages: [], processing: false, mergeTimeout: null };
        }

        this.chatQueues[chatId].messages.push(message);
        logger.info(`消息入队。队列大小: ${this.chatQueues[chatId].messages.length}，ChatId: ${chatId}`);
        this.processQueue(chatId);
    }

    private processQueue(chatId: string): void {
        const queue = this.chatQueues[chatId];
        if (queue.processing || queue.messages.length === 0) return;

        if (queue.mergeTimeout) {
            clearTimeout(queue.mergeTimeout);
            queue.mergeTimeout = null;
        }

        queue.mergeTimeout = setTimeout(async () => {
            queue.processing = true;
            const combinedMessage = this.combineMessages(queue.messages);
            queue.messages = [];
            await this.handleMessage(combinedMessage);
            queue.processing = false;
            if (queue.messages.length > 0) {
                this.processQueue(chatId);
            }
        }, 5000);
    }

    private combineMessages(messages: Message[]): Message {
        const combinedBody = messages.map(msg => msg.body.trim()).join('\n').trim();
        logger.info(`合并 ${messages.length} 条消息。`);
        return { ...messages[0], body: combinedBody };
    }

    private async handleMessage(message: Message): Promise<void> {
        // 消息处理逻辑保持不变
        const client = getClient();
        if (!client) {
            logger.error('WhatsApp 客户端尚未初始化。');
            return;
        }
        if (!isAllowedToProcess(message.chatId, stateManager.excludedNumbersIntervention)) {
            logger.warn('不允许处理此消息。');
            return;
        }
        await checkForManualIntervention(message.chatId);
        if (stateManager.isManualInterventionActive(message.chatId)) {
            logger.warn('当前为人工干预状态，不处理消息。');
            return;
        }

        stateManager.updateMessageSendingCompleted(message.chatId, false); // 消息发送中
        try {
            const { answer } = await fastGPTService(message.chatId, message.body);
            const messages = splitMessages(answer);
            await sendMessagesWithTypingSimulation(client, message.from, message, messages);
        } catch (error) {
            logger.error('处理合并消息时出错:', error);
        } finally {
            stateManager.updateMessageSendingCompleted(message.chatId, true); // 消息发送完成
        }
    }
}
