// src/services/aiService.ts

// 定义 AI 服务的响应类型
interface AIResponse {
    answer: string;
}

// AI 服务调用函数（示例，需根据实际情况实现）
export async function callAIService(currentMessage: string, chatId: string): Promise<AIResponse> {
    // 如果收到的消息是"ping"，则返回"pong"作为回复
    if (currentMessage.toLowerCase() === "ping") {
        return { answer: 'pong' };
    } else {
        // 对于其他消息，您可以根据需要返回不同的响应
        return { answer: 'Unsupport' };
    }
}