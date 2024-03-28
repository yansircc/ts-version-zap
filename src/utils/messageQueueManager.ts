// src/utils/messageQueueManager.ts

type TaskGenerator = (combinedMessage: string) => Promise<void>;

class MessageQueueManager {
    private processing = false;
    private pendingMessages: string[] = []; // 用于存储等待合并的消息
  
    async enqueue(message: string, taskGenerator: TaskGenerator): Promise<void> {
        // 将新消息添加到待合并的消息数组中
        this.pendingMessages.push(message);
        if (this.processing) {
            // 如果当前正在处理消息，则退出，待合并的消息将在当前任务完成后一起处理
            return;
        }
        this.processing = true;

        // 等待一段时间以允许更多的消息到达并被合并
        await new Promise(resolve => setTimeout(resolve, 100)); // 等待100毫秒

        // 合并消息
        const combinedMessage = this.pendingMessages.join(' '); // 以空格拼接消息
        this.pendingMessages = []; // 清空待合并的消息数组，准备下一轮合并

        // 创建并执行任务
        try {
            await taskGenerator(combinedMessage);
        } finally {
            this.processing = false;
            if (this.pendingMessages.length > 0) {
                // 如果在处理当前任务时收到了新的消息，则立即开始处理这些新消息
                this.enqueue(this.pendingMessages.join(' '), taskGenerator);
                this.pendingMessages = []; // 再次清空待合并的消息数组
            }
        }
    }
}

export const messageQueue = new MessageQueueManager();
