// .src/services/fastGPT.ts
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

import * as fs from 'fs';
import * as path from 'path';

// 定义聊天记录的文件夹路径
const chatHistoryDir = path.join(__dirname, '..', 'whatsapp-session', config.wppSessionName, 'chat-history');

// 确保聊天记录文件夹存在
if (!fs.existsSync(chatHistoryDir)) {
  fs.mkdirSync(chatHistoryDir, { recursive: true });
}

function initializeChatHistory(): ChatHistory {
  // 使用配置值或默认提示初始化聊天历史
  return [
    ['human', config.fastGPTPrompt || 'Hi there!'],
    ['ai', 'Hello! How can I help you today?'],
  ];
}

// 从文件中读取聊天历史
async function loadChatHistory(chatId: string): Promise<ChatHistory> {
  const filePath = path.join(chatHistoryDir, `${chatId}.json`);
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    logger.error('读取聊天历史时出错:', error);
  }
  return initializeChatHistory(); // 如果文件不存在或读取失败，则初始化聊天历史
}

// 将聊天历史写入到文件中
async function saveChatHistory(chatId: string, history: ChatHistory): Promise<void> {
  const filePath = path.join(chatHistoryDir, `${chatId}.json`);
  try {
    fs.writeFileSync(filePath, JSON.stringify(history), 'utf8');
  } catch (error) {
    logger.error('保存聊天历史时出错:', error);
  }
}



const sessionTimeouts = new Map<string, NodeJS.Timeout>();
let chatHistories = new Map<string, ChatHistory>();

const SESSION_TIMEOUT = 300000; // 示例超时时间，例如60000毫秒（1分钟）

export const fastGPTService = async (chatId: string, input: string): Promise<AIResponse> => {
  let history = await loadChatHistory(chatId); // 从文件加载聊天历史

  // 添加新的用户输入到历史中
  history.push(['human', input]);

  // 根据当前聊天历史生成新的提示
  const prompt = ChatPromptTemplate.fromMessages(history);

  // 调用 ChatOpenAI 模型
  const chatModel = new ChatOpenAI({
    openAIApiKey: config.fastGPTKey,
    configuration: { baseURL: `${config.fastGPTEndpoint}/v1` },
  });

  const llmChain = prompt.pipe(chatModel).pipe(new StringOutputParser());
  const message = await llmChain.invoke({ input }); // 调用模型并获取回复

  // 将 AI 的回复也添加到聊天历史中
  history.push(['ai', message]);
  
  // 保存更新后的聊天历史到文件
  await saveChatHistory(chatId, history);

  // 清除之前的超时（如果存在），并设置一个新的超时来自动删除会话
  if (sessionTimeouts.has(chatId)) {
    clearTimeout(sessionTimeouts.get(chatId));
  }
  const timeoutId = setTimeout(() => {
    fs.unlinkSync(path.join(chatHistoryDir, `${chatId}.json`)); // 删除聊天历史文件
    sessionTimeouts.delete(chatId);
    logger.warn(`会话 ${chatId} 已超时并被删除`);
  }, SESSION_TIMEOUT);
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
