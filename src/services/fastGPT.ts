import * as path from 'path';
import { promises as fsPromises } from 'fs';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ChatOpenAI } from '@langchain/openai';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';

// 定义类型以提高清晰度和便于维护
interface AIResponse {
  answer: string;
}
type ChatHistory = [string, string][];

// 定义聊天历史目录路径
const chatHistoryDir = path.join(__dirname, '..', 'chat-history', config.wppSessionName);

// 确保聊天历史目录存在
async function ensureChatHistoryDirExists(): Promise<void> {
  try {
    await fsPromises.access(chatHistoryDir);
  } catch (error) {
    const errnoError = error as NodeJS.ErrnoException;
    if (errnoError.code === 'ENOENT') {
      // 如果目录不存在，则创建它
      await fsPromises.mkdir(chatHistoryDir, { recursive: true });
      logger.info('聊天历史目录已创建。');
    } else {
      logger.error('检查聊天历史目录失败:', error);
      throw error; // 如果错误不是因为目录不存在，则重新抛出错误
    }
  }
}

// 从文件加载聊天历史
async function loadChatHistory(chatId: string): Promise<ChatHistory> {
  const filePath = path.join(chatHistoryDir, `${chatId}.json`);
  try {
    const data = await fsPromises.readFile(filePath, 'utf8');
    logger.info(`成功加载聊天Id=${chatId}的聊天历史。`);
    return JSON.parse(data);
  } catch (error) {
    const errnoError = error as NodeJS.ErrnoException;
    if (errnoError.code === 'ENOENT') {
      // 如果文件不存在，则返回默认的聊天历史
      logger.info(`聊天Id=${chatId}没有现有的聊天历史。使用默认值。`);
      return [
        ['human', config.fastGPTPrompt || 'Long time no see!'],
        ['ai', 'Ohh, it has been a while! LTNS, how can I help you?'],
      ];
    } else {
      logger.error('读取聊天历史失败:', error);
      throw error; // 如果错误不是因为文件不存在，则重新抛出错误
    }
  }
}

// 将聊天历史保存到文件
async function saveChatHistory(chatId: string, history: ChatHistory): Promise<void> {
  const filePath = path.join(chatHistoryDir, `${chatId}.json`);
  try {
    await fsPromises.writeFile(filePath, JSON.stringify(history), 'utf8');
    logger.info(`聊天Id=${chatId}的聊天历史已成功保存。`);
  } catch (error) {
    logger.error('保存聊天历史失败:', error);
    throw error;
  }
}

export const fastGPTService = async (chatId: string, input: string): Promise<AIResponse> => {
  await ensureChatHistoryDirExists();
  let history = await loadChatHistory(chatId);

  history.push(['human', input]); // 添加新的用户输入到历史记录中
  logger.info(`聊天Id=${chatId}的聊天历史中添加了新输入。`);

  const prompt = ChatPromptTemplate.fromMessages(history);

  // 根据config.aiSelected选择不同的AI服务
  let chatModelConfiguration;
  if (config.aiSelected === 'fastGPT') {
    chatModelConfiguration = {
      openAIApiKey: config.fastGPTKey,
      configuration: { baseURL: 'https://gpt.imiker.com/api/v1' }
    };
  } else if (config.aiSelected === 'OPENAI') {
    chatModelConfiguration = {
      openAIApiKey: config.openAIKey,
      configuration: { baseURL: 'https://api.openai.com/v1' }
    };
  } else {
    throw new Error(`Unsupported AI service: ${config.aiSelected}`);
  }

  const chatModel = new ChatOpenAI(chatModelConfiguration);
  logger.info(`正在向${config.aiSelected}发送请求，聊天Id=${chatId}。`);
  const llmChain = prompt.pipe(chatModel).pipe(new StringOutputParser());
  const message = await llmChain.invoke({ input });

  history.push(['ai', message]); // 将AI回应添加到历史记录中
  await saveChatHistory(chatId, history); // 保存更新后的历史记录
  logger.info(`已接收并保存来自聊天Id=${chatId}的${config.aiSelected}回应。`);

  return { answer: message };
};

