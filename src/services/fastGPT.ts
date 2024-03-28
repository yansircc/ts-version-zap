// src/services/fastGPT.ts
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ChatOpenAI } from '@langchain/openai';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';

// 定义 AI 服务的响应类型和聊天历史类型
interface AIResponse {
  answer: string;
}
type ChatHistory = [string, string][];

// 定义和确保聊天记录文件夹存在
const chatHistoryDir = path.join(__dirname, '..', 'chat-history', config.wppSessionName);
if (!fs.existsSync(chatHistoryDir)) {
  fs.mkdirSync(chatHistoryDir, { recursive: true });
}

// 从文件中读取聊天历史
async function loadChatHistory(chatId: string): Promise<ChatHistory> {
  const filePath = path.join(chatHistoryDir, `${chatId}.json`);
  if (fs.existsSync(filePath)) {
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      logger.error('读取聊天历史时出错:', error);
    }
  }
  // 使用默认提示初始化聊天历史，如果文件不存在或读取失败
  return [
    ['human', config.fastGPTPrompt || 'Hi there!'],
    ['ai', 'Hello! How can I help you today?'],
  ];
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

// fastGPT服务主函数
export const fastGPTService = async (chatId: string, input: string): Promise<AIResponse> => {
  let history = await loadChatHistory(chatId);

  history.push(['human', input]); // 添加新的用户输入到历史中

  const prompt = ChatPromptTemplate.fromMessages(history);
  const chatModel = new ChatOpenAI({
    openAIApiKey: config.fastGPTKey,
    configuration: { baseURL: `${config.fastGPTEndpoint}/v1` },
  });
  const llmChain = prompt.pipe(chatModel).pipe(new StringOutputParser());
  const message = await llmChain.invoke({ input });

  history.push(['ai', message]); // 将AI的回复添加到聊天历史中
  await saveChatHistory(chatId, history); // 保存更新后的聊天历史到文件

  return { answer: message };
};
