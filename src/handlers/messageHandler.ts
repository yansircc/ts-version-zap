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
        logger.info(`消息入队。队列大小: ${this.pendingMessages.length}`);
        // 无论何时，只要有消息入队，都重置等待定时器
        this.resetMergeTimer();
    }

    private resetMergeTimer(): void {
        if (this.mergeTimeout) {
            clearTimeout(this.mergeTimeout);
        }

        // 设置一个新的定时器，无论是第一条消息还是后续消息
        this.mergeTimeout = setTimeout(async () => {
            if (this.pendingMessages.length > 0 && !this.processing) {
                await this.processMessages();
            }
        }, 5000); // 等待5秒看是否有更多消息到达
    }

    private async processMessages(): Promise<void> {
        if (this.processing) return;

        this.processing = true;
        logger.info("开始处理消息。");

        const combinedMessage = this.combineMessages(this.pendingMessages);
        this.pendingMessages = []; // 在合并后清空队列

        await this.handleMessage(combinedMessage);

        this.processing = false;
        // 处理完消息后，如果队列中有新的消息，则重置等待定时器
        if (this.pendingMessages.length > 0) {
            this.resetMergeTimer();
        } else {
            this.mergeTimeout = null; // 如果没有新消息，则清除定时器
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
