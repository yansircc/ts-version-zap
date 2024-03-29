// src/handlers/messageHandler.ts
import type { Message } from '@wppconnect-team/wppconnect/dist/api/model/message';
import { logger } from '../utils/logger';
import { fastGPTService } from '../services/fastGPT';
import { splitMessages, sendMessagesWithTypingSimulation } from '../utils/messageUtils';
import { checkForManualIntervention } from '../utils/intervention';
import { getClient } from '../services/whatsappClient';
import * as stateManager from '../services/stateManager';
import { isAllowedToProcess } from '../utils/helpers';

interface ChatQueue {
    messages: Message[];
    processing: boolean;
}

class ChatMessageQueueManager {
    private queues: { [chatId: string]: ChatQueue } = {};

    async enqueue(message: Message): Promise<void> {
        const chatId = message.chatId;
        if (!this.queues[chatId]) {
            this.queues[chatId] = { messages: [], processing: false };
        }

        this.queues[chatId].messages.push(message);
        logger.info(`消息入队。队列[${chatId}]大小: ${this.queues[chatId].messages.length}`);
        this.processQueue(chatId);
    }

    private async processQueue(chatId: string): Promise<void> {
        const queue = this.queues[chatId];
        if (queue.processing || queue.messages.length === 0) return;
    
        queue.processing = true;
        const handleMessagesPromises = queue.messages.map(message => this.handleMessage(message));
        await Promise.all(handleMessagesPromises);
        queue.messages = [];
        queue.processing = false;
    }
    

    private async handleMessage(message: Message): Promise<void> {
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
            logger.error('处理消息时出错:', error);
        } finally {
            stateManager.updateMessageSendingCompleted(message.chatId, true); // 消息发送完成
        }
    }
}

const messageQueueManager = new ChatMessageQueueManager();

export function processMessage(message: Message): void {
    messageQueueManager.enqueue(message);
}
