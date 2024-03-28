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
    private waitingForMoreMessages = false;
    private mergeTimeout: NodeJS.Timeout | null = null;

    constructor() {
        this.pendingMessages = [];
        this.processing = false;
        this.waitingForMoreMessages = false;
        this.mergeTimeout = null;
    }

    async enqueue(message: Message): Promise<void> {
        this.pendingMessages.push(message);
        logger.info(`消息入队。队列大小: ${this.pendingMessages.length}`);
        if (!this.processing && !stateManager.messageSendingCompleted) {
            this.resetMergeTimer();
        }
    }

    private resetMergeTimer(): void {
        if (this.mergeTimeout) {
            clearTimeout(this.mergeTimeout);
        }
        this.waitingForMoreMessages = true;
        this.mergeTimeout = setTimeout(() => {
            if (this.pendingMessages.length > 0 && !this.processing) {
                this.waitingForMoreMessages = false;
                this.processMessages();
            }
        }, 5000);
    }

    private async processMessages(): Promise<void> {
        if (this.processing) return;

        this.processing = true;
        if (this.mergeTimeout) {
            clearTimeout(this.mergeTimeout);
            this.mergeTimeout = null;
        }

        // 假设有待处理的消息
        if (this.pendingMessages.length > 0) {
            const combinedMessage = this.combineMessages(this.pendingMessages);
            this.pendingMessages = []; // 清空队列
            await this.handleMessage(combinedMessage);
        }

        this.processing = false;
        // 检查是否有新消息到达，如果有，则重置合并定时器
        if (this.pendingMessages.length > 0) {
            this.resetMergeTimer();
        }
    }

    private combineMessages(messages: Message[]): Message {
        const combinedBody = messages.map(msg => msg.body.trim()).join('\n').trim();
        logger.info(`合并 ${messages.length} 条消息。`);
        return { ...messages[0], body: combinedBody };
    }

    private async handleMessage(combinedMessage: Message): Promise<void> {
        const client = getClient();
        if (!client) {
            logger.error('WhatsApp 客户端尚未初始化。');
            return;
        }

        if (!isAllowedToProcess(combinedMessage.chatId, stateManager.excludedNumbersIntervention)) {
            logger.warn('不允许处理此消息。');
            return;
        }

        await checkForManualIntervention(combinedMessage.chatId);
        if (stateManager.isManualInterventionActive(combinedMessage.chatId)) {
            logger.warn('当前为人工干预状态，不处理消息。');
            return;
        }

        stateManager.updateMessageSendingCompleted(combinedMessage.chatId, false); // 消息发送中
        try {
            const { answer } = await fastGPTService(combinedMessage.chatId, combinedMessage.body);
            const messages = splitMessages(answer);
            await sendMessagesWithTypingSimulation(client, combinedMessage.from, combinedMessage, messages);
        } catch (error) {
            logger.error('处理合并消息时出错:', error);
        } finally {
            stateManager.updateMessageSendingCompleted(combinedMessage.chatId, true); // 消息发送完成
            this.checkAndProcessPendingMessages();
        }
    }

    private checkAndProcessPendingMessages(): void {
        if (this.pendingMessages.length > 0 && stateManager.messageSendingCompleted) {
            this.resetMergeTimer();
        }
    }
}

const messageQueue = new MessageQueueManager();

export function processMessage(message: Message): void {
    messageQueue.enqueue(message);
}
