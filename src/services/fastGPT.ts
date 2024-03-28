import { config } from '../config';
import { logger } from '../utils/logger';
import { ChatOpenAI } from '@langchain/openai';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';

// 定义 AI 服务的响应类型
interface AIResponse {
  answer: string;
}

// 定义类型以提高代码的可读性和稳定性
type ChatHistory = [string, string][];

const sessionTimeouts = new Map<string, NodeJS.Timeout>();
let chatHistories = new Map<string, ChatHistory>();

function initializeChatHistory(): ChatHistory {
  // 使用配置值或默认提示初始化聊天历史
  return [
    ['human', config.fastGPTPrompt || 'Hi there!'],
    ['ai', 'Hello! How can I help you today?'],
  ];
}

const SESSION_TIMEOUT = 300000; // 示例超时时间，例如60000毫秒（1分钟）

export const fastGPTService = async (chatId: string, input: string): Promise<AIResponse> => {
  let history = chatHistories.get(chatId) || initializeChatHistory();

  history.push(['human', input]); // 添加新的用户输入到历史中

  const prompt = ChatPromptTemplate.fromMessages(history); // 根据当前聊天历史生成新的提示

  const chatModel = new ChatOpenAI({
    openAIApiKey: config.fastGPTKey,
    configuration: { baseURL: `${config.fastGPTEndpoint}/v1` },
  });

  const llmChain = prompt.pipe(chatModel).pipe(new StringOutputParser());

  const message = await llmChain.invoke({ input }); // 调用模型并获取回复

  history.push(['ai', message]); // 将AI的回复也添加到聊天历史中
  chatHistories.set(chatId, history); // 保存更新后的聊天历史

  // 清除之前的超时（如果存在）
  if (sessionTimeouts.has(chatId)) {
    clearTimeout(sessionTimeouts.get(chatId));
  }

  // 设置一个新的超时来自动删除会话
  const timeoutId = setTimeout(() => {
    chatHistories.delete(chatId);
    sessionTimeouts.delete(chatId);
    logger.warn(`会话 ${chatId} 已超时并被删除`);
  }, SESSION_TIMEOUT);

  // 保存超时ID
  sessionTimeouts.set(chatId, timeoutId);

  return { answer: message }; // 确保返回 AIResponse 类型
};

// 定期清理逻辑
const CLEAN_UP_INTERVAL = 24 * 60 * 60 * 1000; // 每天执行一次清理

setInterval(() => {
  const now = Date.now();
  for (const [chatId, timeoutId] of sessionTimeouts.entries()) {
    if (now - parseInt(chatId) > SESSION_TIMEOUT + CLEAN_UP_INTERVAL) { // 这里需要一个合理的时间判断逻辑
      clearTimeout(timeoutId);
      sessionTimeouts.delete(chatId);
      chatHistories.delete(chatId);
      logger.info(`长时间不活跃的会话 ${chatId} 已被清理`);
    }
  }
}, CLEAN_UP_INTERVAL);
