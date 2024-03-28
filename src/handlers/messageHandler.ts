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
        if (!this.processing && !this.waitingForMoreMessages) {
            this.resetMergeTimer();
        }
    }

    private resetMergeTimer(): void {
        if (this.mergeTimeout) {
            clearTimeout(this.mergeTimeout);
        }
        this.waitingForMoreMessages = true; // 标记开始等待新消息
        this.mergeTimeout = setTimeout(async () => {
            if (this.pendingMessages.length > 0) {
                await this.processMessages();
            }
            this.waitingForMoreMessages = false; // 更新等待状态
        }, 5000); // 设置5秒后处理消息的定时器
    }

    private async processMessages(): Promise<void> {
        if (this.processing) return;

        this.processing = true;
        logger.info("开始处理消息。");
        // 清理定时器，因为我们即将开始处理消息
        if (this.mergeTimeout) {
            clearTimeout(this.mergeTimeout);
            this.mergeTimeout = null;
        }

        const combinedMessage = this.combineMessages(this.pendingMessages);
        this.pendingMessages = []; // 处理完消息后清空队列
        await this.handleMessage(combinedMessage);

        this.processing = false;
        if (this.pendingMessages.length > 0) {
            // 如果在处理消息期间收到了新消息，则重置定时器等待新消息
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

        logger.info("处理合并后的消息。");
        if (!isAllowedToProcess(combinedMessage.chatId, stateManager.excludedNumbersIntervention)) {
            logger.warn('不允许处理此消息。');
            return;
        }

        await checkForManualIntervention(combinedMessage.chatId);
        if (stateManager.isManualInterventionActive(combinedMessage.chatId)) {
            logger.warn('当前为人工干预状态，不处理消息。');
            return;
        }

        try {
            const { answer } = await fastGPTService(combinedMessage.chatId, combinedMessage.body);
            const messages = splitMessages(answer);
            await sendMessagesWithTypingSimulation(client, combinedMessage.from, combinedMessage, messages);
        } catch (error) {
            logger.error('处理合并消息时出错:', error);
        }
    }
}

const messageQueue = new MessageQueueManager();

export function processMessage(message: Message): void {
    messageQueue.enqueue(message);
}
