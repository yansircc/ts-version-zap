// src/utils/messageQueueManager.ts
import type { Message } from '@wppconnect-team/wppconnect/dist/api/model/message';

class MessageQueueManager {
    private processing = false;
    private pendingMessages: Message[] = [];
    private lastMessageTime: number | null = null;

    async enqueue(message: Message, taskGenerator: (message: Message) => Promise<void>): Promise<void> {
        this.pendingMessages.push(message);
        this.lastMessageTime = Date.now(); // 更新最后一条消息的到达时间

        if (!this.processing) {
            this.processing = true;

            while (this.pendingMessages.length > 0) {
                if (this.lastMessageTime !== null) { // 确保 lastMessageTime 不为 null
                    const now = Date.now();
                    const timeSinceLastMessage = now - this.lastMessageTime;
                    if (timeSinceLastMessage < 100) {
                        // 继续等待，以便积累更多消息
                        await new Promise(resolve => setTimeout(resolve, 100 - timeSinceLastMessage));
                    }
                }

                const combinedMessage = this.createCombinedMessage(this.pendingMessages);
                this.pendingMessages = []; // 清空消息队列

                try {
                    await taskGenerator(combinedMessage);
                } catch (error) {
                    console.error('Error processing combined message:', error);
                    // 在这里添加您的错误处理逻辑
                }

                // 如果在处理过程中有新的消息到达，则根据 lastMessageTime 判断是否需要继续等待
                if (this.lastMessageTime !== null && Date.now() - this.lastMessageTime < 100) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            this.processing = false;
            this.lastMessageTime = null; // 处理完消息后重置 lastMessageTime
        }
    }

    private createCombinedMessage(messages: Message[]): Message {
        if (messages.length === 0) {
            throw new Error('No messages to combine');
        }

        const firstMessage = messages[0];
        const combinedBody = messages.map(msg => msg.body).join(' ');

        return { ...firstMessage, body: combinedBody };
    }
}

export const messageQueue = new MessageQueueManager();