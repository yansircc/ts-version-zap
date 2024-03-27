// src/utils/messageUtils.ts

/**
 * 分割长文本为较短的消息段落。
 * @param text 需要被分割的长文本。
 * @returns 分割后的消息数组。
 */
export function splitMessages(text: string): string[] {
    const complexPattern = /(http[s]?:\/\/[^\s]+)|(www\.[^\s]+)|([^\s]+@[^\s]+\.[^\s]+)|(["'].*?["'])|(\b\d+\.\s)|(\w+\.\w+)/g;
    const placeholders = text.match(complexPattern) ?? [];
    const placeholder = "PLACEHOLDER_";
    let currentIndex = 0;
    const textWithPlaceholders = text.replace(complexPattern, () => `${placeholder}${currentIndex++}`);

    const splitPattern = /(?<!\b\d+\.\s)(?<!\w+\.\w+)[^.?!]+(?:[.?!]+["']?|$)/g;
    let parts: string[] = textWithPlaceholders.match(splitPattern) ?? [];

    if (placeholders.length > 0) {
        parts = parts.map(part => placeholders.reduce((acc, val, idx) => acc.replace(`${placeholder}${idx}`, val), part));
    }
    return parts;
}

/**
 * 计算模拟打字的延迟时间。
 * @param message 要发送的消息。
 * @returns 打字延迟时间（毫秒）。
 */
export function calculateTypingDelay(message: string): number {
    const baseDelay = 500; // 基本延迟时间，例如500毫秒
    const perCharDelay = 100; // 每个字符的延迟时间，例如100毫秒
    return baseDelay + message.length * perCharDelay;
}

/**
 * 发送消息并模拟打字效果。
 * @param client WhatsApp客户端。
 * @param targetNumber 目标手机号。
 * @param originalMessage 客户的原始消息，用于引用。
 * @param messages 要发送的消息数组。
 */
export async function sendMessagesWithTypingSimulation(client: any, targetNumber: string, originalMessage: any, messages: string[]): Promise<void> {
    // 标记为已读
    await client.sendSeen(targetNumber);

    for (const [index, message] of messages.entries()) {
        // 模拟开始打字
        await client.startTyping(targetNumber);

        // 随机添加短暂停顿
        if (Math.random() < 0.5) { // 有 50% 的概率触发短暂停顿
            await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000)); // 随机停顿 0.5 到 1.5 秒
            await client.stopTyping(targetNumber);
            await new Promise(resolve => setTimeout(resolve, 200)); // 停止后稍等一下再开始，模拟人重新开始打字
            await client.startTyping(targetNumber);
        }

        const typingDelay = calculateTypingDelay(message);
        // 等待模拟打字完成
        await new Promise(resolve => setTimeout(resolve, typingDelay));

        // 如果是第一条消息，引用原始消息
        if (index === 0) {
            await client.reply(targetNumber, message, originalMessage.id);
        } else {
            // 发送消息
            await client.sendText(targetNumber, message);
        }
        
        // 停止打字模拟
        await client.stopTyping(targetNumber);
    }
}