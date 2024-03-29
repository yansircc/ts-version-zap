// src/handlers/messageHandler.ts
import type { Message } from '@wppconnect-team/wppconnect/dist/api/model/message';
import { ChatQueueManager } from '../services/chatQueueManager';

const chatQueueManager = new ChatQueueManager();

export function processMessage(message: Message): void {
    chatQueueManager.enqueue(message);
}
