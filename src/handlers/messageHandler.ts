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
    private waitingForMoreMessages: boolean = false;

    async enqueue(message: Message): Promise<void> {
        this.pendingMessages.push(message);
        logger.info(`消息入队。队列大小: ${this.pendingMessages.length}`);
        if (!this.processing && !this.waitingForMoreMessages) {
            this.waitForMoreMessages();
        }
    }

    private waitForMoreMessages(): void {
        if (this.waitingForMoreMessages) {
            return; // 如果已经在等待，就不再设置新的定时器
        }

        this.waitingForMoreMessages = true;
        setTimeout(async () => {
            if (this.pendingMessages.length > 0 && !this.processing) {
                await this.processMessages();
            }
            this.waitingForMoreMessages = false;
        }, 5000); // 等待5秒看是否有更多消息到达
    }

    private async processMessages(): Promise<void> {
        if (this.processing) return;
        
        this.processing = true;
        logger.info("开始处理消息。");

        while (this.pendingMessages.length > 0) {
            const combinedMessage = this.combineMessages(this.pendingMessages);
            this.pendingMessages = []; // 在合并后清空队列

            await this.handleMessage(combinedMessage);
            // 处理完毕后，等待更多消息而不是立即处理
            this.waitForMoreMessages();
            
            // 如果在处理期间有新消息到达，将在等待后处理
            return; // 退出处理流程，等待可能的新消息
        }

        this.processing = false;
    }

    private combineMessages(messages: Message[]): Message {
        const combinedBody = messages.map(msg => msg.body.trim()).join('\n').trim(); // 使用换行符作为分隔符
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
