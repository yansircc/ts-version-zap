// src/utils/messageUtils.ts

/**
 * 分割长文本为较短的消息段落。
 * @param text 需要被分割的长文本。
 * @returns 分割后的消息数组。
 */
export function splitMessages(text: string): string[] {
    const MAX_LENGTH = 150; // 每句话最多150个字符
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

    // 细化分割逻辑，包含移除末尾标点的逻辑
    return parts.flatMap(part => {
        const sentences = part.split(/(?<=[.?!])\s+/); // 根据句子结束符进行分割
        return sentences.reduce((acc, sentence) => {
            while (sentence.length > MAX_LENGTH) {
                let cutIndex = sentence.lastIndexOf(' ', MAX_LENGTH);
                if (cutIndex === -1 || cutIndex === 0) cutIndex = MAX_LENGTH; // 处理无空格的长字符串
                // 移除末尾的标点符号
                const subPart = sentence.slice(0, cutIndex).trim().replace(/[,.!]$/, '');
                acc.push(subPart);
                sentence = sentence.slice(cutIndex + 1).trim();
            }
            // 如果句子长度小于等于MAX_LENGTH，直接添加到数组中，同时移除末尾的标点符号
            if (sentence) acc.push(sentence.replace(/[,.!]$/, ''));
            return acc;
        }, [] as string[]);
    });
}

/**
 * 计算模拟打字的延迟时间。
 * @param message 要发送的消息。
 * @returns 打字延迟时间（毫秒）。
 */
export function calculateTypingDelay(message: string): number {
    const baseDelay = 300; // 基础延迟时间
    const perCharDelay = 100; // 每个字符的延迟时间
    const lengthDelay = Math.min(message.length * perCharDelay, 7000); // 为长消息设置最大延迟时间
    return baseDelay + lengthDelay;
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

        const typingDelay = calculateTypingDelay(message);
        // 等待模拟打字完成
        await new Promise(resolve => setTimeout(resolve, typingDelay));

        // 如果是第一条消息，引用原始消息
        if (index === 0) {
            await client.reply(targetNumber, message.trim(), originalMessage.id);
        } else {
            // 发送消息
            await client.sendText(targetNumber, message.trim());
        }
        
        // 停止打字模拟
        await client.stopTyping(targetNumber);
    }
}