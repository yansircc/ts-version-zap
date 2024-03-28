// src/utils/messageQueueManager.ts
import type { Message } from '@wppconnect-team/wppconnect/dist/api/model/message';
import { logger } from './logger';
import { fastGPTService } from '../services/fastGPT';
import { splitMessages } from './messageUtils';
import { sendMessagesWithTypingSimulation } from './messageUtils';
import { checkForManualIntervention } from './intervention';
import { getClient } from '../services/whatsappClient';
import * as stateManager from '../services/stateManager';
import { isAllowedToProcess } from './helpers';

class MessageQueueManager {
    private pendingMessages: Message[] = [];
    private processing = false;

    constructor() {}

    async enqueue(message: Message): Promise<void> {
        this.pendingMessages.push(message);
        if (!this.processing) {
            await this.processMessages();
        }
    }

    private async processMessages(): Promise<void> {
        if (this.processing || this.pendingMessages.length === 0) {
            return;
        }
        this.processing = true;
    
        const client = getClient(); // 确保您有适当的方法来获取WhatsApp客户端实例
        while (this.pendingMessages.length > 0) {
            const message = this.pendingMessages.shift();
    
            // 检查消息是否为 undefined
            if (!message) {
                continue;
            }
    
            // 先检查是否允许处理消息
            if (!isAllowedToProcess(message.chatId, stateManager.excludedNumbersIntervention)) {
                continue;
            }
    
            // 检查人工干预状态
            await checkForManualIntervention(message.chatId);
            if (stateManager.isManualInterventionActive(message.chatId)) {
                logger.warn('人工干预状态，不处理消息');
                continue;
            }
    
            try {
                // 调用 fastGPTService 并处理回复
                const { answer } = await fastGPTService(message.chatId, message.body);
                const messages = splitMessages(answer); // 使用您之前定义的 splitMessages 函数来分割消息
                await sendMessagesWithTypingSimulation(client, message.from, message, messages);
            } catch (error) {
                logger.error('处理消息时出错:', error);
            }
        }
    
        this.processing = false;
    }
    
}

export const messageQueue = new MessageQueueManager();