// src/utils/messageQueueManager.ts
type Task = () => Promise<void>; // 定义Task为一个返回Promise<void>的函数类型

class MessageQueueManager {
  private concurrency: number; // 并发数
  private queue: Task[]; // 任务队列
  private activeCount: number; // 当前活跃任务数

  constructor(concurrency: number) {
    this.concurrency = concurrency;
    this.queue = [];
    this.activeCount = 0;
  }

  // 将一个新任务加入队列
  enqueue(task: Task): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // 将任务包装成另一个函数，以便处理完成和错误处理
      const wrappedTask = async () => {
        try {
          await task();
          resolve();
        } catch (error) {
          reject(error);
        } finally {
          this.activeCount--;
          this.processQueue(); // 任务完成后继续处理队列
        }
      };
      this.queue.push(wrappedTask);
      this.processQueue(); // 尝试处理队列
    });
  }

  // 处理队列中的任务
  private processQueue(): void {
    // 如果当前活跃的任务数小于并发限制，并且队列中有待处理的任务
    if (this.activeCount < this.concurrency && this.queue.length > 0) {
      const nextTask = this.queue.shift(); // 获取队列中的下一个任务
      if (nextTask) {
        this.activeCount++; // 增加当前活跃的任务数
        nextTask(); // 执行任务
      }
    }
  }
}

// 实例化消息队列管理器，设置并发数为1，以保证一次只处理一条消息
export const messageQueue = new MessageQueueManager(1);
