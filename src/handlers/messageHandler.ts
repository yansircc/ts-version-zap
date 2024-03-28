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
        console.log(`Message enqueued. Queue size: ${this.pendingMessages.length}`);
        if (!this.mergeTimeout) {
            this.startMergeTimer();
        }
    }

    private startMergeTimer(): void {
        if (this.mergeTimeout) {
            clearTimeout(this.mergeTimeout);
        }

        console.log("Merge timer reset/start.");
        this.mergeTimeout = setTimeout(async () => {
            if (this.pendingMessages.length > 0) {
                console.log("Merge timer triggered. Starting to process messages.");
                await this.processMessages();
            }
        }, 5000); // 5 seconds wait time before processing messages
    }

    private async processMessages(): Promise<void> {
        if (this.processing) return;
        
        console.log("Starting message processing.");
        this.processing = true;
        if (this.mergeTimeout) {
            clearTimeout(this.mergeTimeout);
            this.mergeTimeout = null;
        }

        while (this.pendingMessages.length > 0) {
            const combinedMessage = this.combineMessages(this.pendingMessages);
            this.pendingMessages = []; // Clear the queue
            console.log(`Combined message created with body: ${combinedMessage.body.substring(0, 50)}...`);
            
            await this.handleMessage(combinedMessage);

            if (this.pendingMessages.length > 0) {
                console.log("New messages received during processing. Continuing to process.");
                continue;
            }
        }

        this.processing = false;
        console.log("Message processing completed.");
    }

    private combineMessages(messages: Message[]): Message {
        const combinedBody = messages.map(msg => msg.body.trim()).join('\n').trim(); // 使用换行符作为分隔
        console.log(`Combining ${messages.length} messages.`);
        return { ...messages[0], body: combinedBody };
    }

    private async handleMessage(combinedMessage: Message): Promise<void> {
        const client = getClient();
        if (!client) {
            logger.error('WhatsApp 客户端尚未初始化。');
            return;
        }

        console.log("Handling combined message.");
        if (!isAllowedToProcess(combinedMessage.chatId, stateManager.excludedNumbersIntervention)) {
            logger.warn('不允许处理消息');
            return;
        }

        await checkForManualIntervention(combinedMessage.chatId);
        if (stateManager.isManualInterventionActive(combinedMessage.chatId)) {
            logger.warn('人工干预状态，不处理消息');
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
