import type { Message } from '@wppconnect-team/wppconnect/dist/api/model/message';
import { logger } from './logger';

/**
 * 检查一个消息是否有效
 * 
 * @param message 要检查的消息
 * @returns 返回一个布尔值，表示消息是否有效
 */
export function isValidMessage(message: Message): boolean {
    // 检查是否是群组消息
    if (message.isGroupMsg) {
        logger.warn('忽略群组消息');
        return false; // 如果是群组消息，则不处理
    }

    // 检查消息类型，如果不是文本
    //if (message.type !== 'chat' && message.type !== 'image' && message.type !== 'ptt' && message.type !== 'audio' && message.type !== 'document' && message.type !== 'location') {
    if (message.type !== 'chat') {
        logger.warn('忽略非文本消息');
        return false;
    }

    // 检查是否是系统消息，例如可以检查sender的id等
    // 示例中没有相关的属性，但如果有，可以像这样检查
    // if (message.sender?.id === 'system') {
    //   logger.warn('忽略系统消息');
    //   return false;
    // }

    // 根据需要，可以添加更多的检查

    // 如果所有检查都通过，则消息有效
    return true;
}
