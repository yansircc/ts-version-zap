import * as path from 'path';
import { promises as fsPromises } from 'fs';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ChatOpenAI } from '@langchain/openai';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';

// Define types for better clarity and maintenance
interface AIResponse {
  answer: string;
}
type ChatHistory = [string, string][];

// Define chat history directory path
const chatHistoryDir = path.join(__dirname, '..', 'chat-history', config.wppSessionName);

// Ensure chat history directory exists
async function ensureChatHistoryDirExists(): Promise<void> {
  try {
    await fsPromises.access(chatHistoryDir);
  } catch (error) {
    const errnoError = error as NodeJS.ErrnoException;
    if (errnoError.code === 'ENOENT') {
      // If directory doesn't exist, create it
      await fsPromises.mkdir(chatHistoryDir, { recursive: true });
      console.log('Chat history directory created.');
    } else {
      throw error; // Re-throw error if it's not related to existence check
    }
  }
}

// Load chat history from file
async function loadChatHistory(chatId: string): Promise<ChatHistory> {
  const filePath = path.join(chatHistoryDir, `${chatId}.json`);
  try {
    const data = await fsPromises.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    const errnoError = error as NodeJS.ErrnoException;
    if (errnoError.code === 'ENOENT') {
      // If file doesn't exist, return default chat history
      return [
        ['human', config.fastGPTPrompt || 'Hi there!'],
        ['ai', 'Hello! How can I help you today?'],
      ];
    } else {
      logger.error('Reading chat history failed:', error);
      throw error; // Re-throw error if it's not related to existence check
    }
  }
}

// Save chat history to file
async function saveChatHistory(chatId: string, history: ChatHistory): Promise<void> {
  const filePath = path.join(chatHistoryDir, `${chatId}.json`);
  try {
    await fsPromises.writeFile(filePath, JSON.stringify(history), 'utf8');
  } catch (error) {
    logger.error('Saving chat history failed:', error);
    throw error;
  }
}

// Main function to interact with FastGPT
export const fastGPTService = async (chatId: string, input: string): Promise<AIResponse> => {
  await ensureChatHistoryDirExists();
  let history = await loadChatHistory(chatId);

  history.push(['human', input]); // Add new user input to the history

  const prompt = ChatPromptTemplate.fromMessages(history);
  const chatModel = new ChatOpenAI({
    openAIApiKey: config.fastGPTKey,
    configuration: { baseURL: `${config.fastGPTEndpoint}/v1` },
  });
  const llmChain = prompt.pipe(chatModel).pipe(new StringOutputParser());
  const message = await llmChain.invoke({ input });

  history.push(['ai', message]); // Add AI response to the history
  await saveChatHistory(chatId, history); // Save updated history

  return { answer: message };
};
