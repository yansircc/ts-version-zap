// src/handlers/messageHandler.ts
import type { Message } from '@wppconnect-team/wppconnect/dist/api/model/message';
import { callAIService } from '../services/aiService';
import { fastGPTService } from '../services/fastGPT';
import { isAllowedToProcess } from '../utils/helpers';
import { splitMessages, sendMessagesWithTypingSimulation } from '../utils/messageUtils'; // 导入函数
import * as stateManager from '../services/stateManager';

interface Client {
    onMessage: (callback: (message: Message) => void) => void;
    sendText: (to: string, body: string) => Promise<any>;
    getMessages: (chatId: string, options: any) => Promise<Message[]>;
    startTyping: (chatId: string) => Promise<void>;
    stopTyping: (chatId: string) => Promise<void>;
}

// processMessage 函数实现
export async function processMessage(client: Client, message: Message): Promise<void> {
    console.log('收到消息:', message.body);

    // 根据消息类型进行处理
    switch (message.type) {
        case 'chat':
            // 进行聊天消息的处理
            if (!isAllowedToProcess(message.chatId, stateManager.excludedNumbersIntervention)) {
                return;
            }

            // 获取 AI 的回复
            try {
                const { answer } = await fastGPTService(message.chatId, message.body); // 假设直接使用 fastGPTService 获取回复
                const messages = splitMessages(answer); // 使用 splitMessages 函数分割长文本回复
                await sendMessagesWithTypingSimulation(client, message.from, message, messages); // 使用 sendMessagesWithTypingSimulation 函数发送消息
            } catch (error) {
                console.error('处理消息时出错:', error);
            }
            break;
        case 'image':
        case 'ptt':
        case 'audio':
        case 'document':
        case 'location':
            // 其他消息类型的处理逻辑
            break;
        default:
            console.log('未知的消息类型:', message.type);
            try {
                await client.sendText(message.from, `Sorry, network is bad, I cannot get your ${message.type} here. Could you please send me a text message?`);
            } catch (error) {
                console.error('处理未知消息类型时出错:', error);
            }
            break;
    }
}

/**
 * 检查一个消息是否有效
 * 
 * @param message 要检查的消息
 * @returns 返回一个布尔值，表示消息是否有效
 */
export function isValidMessage(message: Message): boolean {
    // 检查是否是群组消息
    if (message.isGroupMsg) {
        console.log('忽略群组消息');
        return false; // 如果是群组消息，则不处理
    }

    // 检查消息类型，我们可能只想处理文本消息
    if (message.type !== 'chat') {
        console.log('忽略非文本消息');
        return false; // 如果不是文本消息，则不处理
    }

    // 检查是否是系统消息，例如可以检查sender的id等
    // 示例中没有相关的属性，但如果有，可以像这样检查
    // if (message.sender?.id === 'system') {
    //   console.log('忽略系统消息');
    //   return false;
    // }

    // 根据需要，可以添加更多的检查

    // 如果所有检查都通过，则消息有效
    return true;
}
