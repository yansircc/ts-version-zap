// .src/handlers/messageHandler.ts
import type { Message } from '@wppconnect-team/wppconnect/dist/api/model/message';
import { logger } from '../utils/logger';
import { fastGPTService } from '../services/fastGPT';
import { splitMessages, sendMessagesWithTypingSimulation } from '../utils/messageUtils';
import { checkForManualIntervention } from '../utils/intervention';
import { getClient } from '../services/whatsappClient';
import * as stateManager from '../services/stateManager';
import { isAllowedToProcess } from '../utils/helpers';

class MessageQueueManager {
    private pendingMessages: Message[] = [];
    private processing = false;
    private mergeTimeout: NodeJS.Timeout | null = null;

    async enqueue(message: Message): Promise<void> {
        this.pendingMessages.push(message);
        if (!this.mergeTimeout) {
            this.startMergeTimer();
        }
    }

    private resetMergeTimer(): void {
        if (this.mergeTimeout) {
            clearTimeout(this.mergeTimeout);
        }
    
        this.mergeTimeout = setTimeout(async () => {
            if (this.pendingMessages.length > 0) {
                await this.processMessages();
            }
        }, 5000); // 5 seconds wait time before processing messages
    }
    
    private startMergeTimer(): void {
        this.resetMergeTimer();
    }

    private async processMessages(): Promise<void> {
        if (this.processing) return;
        
        this.processing = true;
        // Stop the timer as we're now processing messages
        if (this.mergeTimeout) {
            clearTimeout(this.mergeTimeout);
            this.mergeTimeout = null;
        }

        while (this.pendingMessages.length > 0) {
            const combinedMessage = this.combineMessages(this.pendingMessages);
            this.pendingMessages = []; // Clear the queue

            await this.handleMessage(combinedMessage);

            // Check if new messages were received during processing and immediately continue processing if so.
            if (this.pendingMessages.length > 0) {
                continue;
            }
        }

        this.processing = false;
        this.resetMergeTimer(); // Reset the timer in case new messages arrive after processing
    }

    private combineMessages(messages: Message[]): Message {
        // 假设 messages 数组非空
        const combinedBody = messages.map(msg => msg.body.trim()).join('\n').trim(); // 使用换行符作为分隔
        const baseMessage = messages[0];
        
        // 如果需要，可以在这里添加其他属性的合并逻辑
        // 例如，计算最早和最晚的时间戳等
        
        return { ...baseMessage, body: combinedBody };
    }

    private async handleMessage(combinedMessage: Message): Promise<void> {
        const client = getClient();
        if (!client) {
            logger.error('WhatsApp 客户端尚未初始化。');
            return;
        }
    
        // 检查是否允许处理消息
        if (!isAllowedToProcess(combinedMessage.chatId, stateManager.excludedNumbersIntervention)) {
            logger.warn('不允许处理消息');
            return;
        }
    
        // 检查人工干预状态
        await checkForManualIntervention(combinedMessage.chatId);
        if (stateManager.isManualInterventionActive(combinedMessage.chatId)) {
            logger.warn('人工干预状态，不处理消息');
            return;
        }
    
        try {
            const { answer } = await fastGPTService(combinedMessage.chatId, combinedMessage.body);
            // After successfully calling fastGPTService, process the answer
            const messages = splitMessages(answer);
            await sendMessagesWithTypingSimulation(getClient(), combinedMessage.from, combinedMessage, messages);
        } catch (error) {
            logger.error('处理合并消息时出错:', error);
            // Optionally retry or re-enqueue the combinedMessage for later processing
            // For example, you might push the combinedMessage back to pendingMessages
            // Or implement a retry mechanism based on specific error types or a retry counter
        }
    }
}

const messageQueue = new MessageQueueManager();

export function processMessage(message: Message): void {
    messageQueue.enqueue(message);
}
