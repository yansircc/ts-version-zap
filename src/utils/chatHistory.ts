// src/utils/chatHistory.ts
import type { Message } from '@wppconnect-team/wppconnect/dist/api/model/message';
import { getClient } from '../services/whatsappClient';

export async function getChatHistory(chatId: string): Promise<Message[]> {
    const client = getClient();
    if (!client) {
        console.error('WhatsApp 客户端尚未初始化。');
        return [];
    }

    try {
        const messages = await client.getMessages(chatId, { count: 10 });
        return messages;
    } catch (error) {
        console.error('获取消息时出错:', error);
        return [];
    }
}
