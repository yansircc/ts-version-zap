// src/config/index.ts
import * as dotenv from 'dotenv';
dotenv.config();
import { logger } from '../utils/logger';

export const config = {
  aiSelected: process.env.AISELECTED || 'fastGPT',
  maxRetries: 3,
  wppSessionName: process.env.WPP_SESSION_NAME || 'YANSIR',
  humanInterventionKeyword: process.env.HUMAN_INTERVENTION_KEYWORD || '.', // 人工干预关键词，句号结尾
  aiInterventionKeyword: process.env.AI_INTERVENTION_KEYWORD || ',', // AI干预关键词，逗号结尾
  geminiKey: process.env.GEMINI_KEY,
  openAIKey: process.env.OPENAI_KEY,
  openAIModelName: process.env.OPENAI_MODEL_NAME || 'gpt-4-turbo-preview',
  openAIEndpoint: process.env.OPENAI_ENDPOINT || 'https://api.openai.com',
  openAIAssistant: process.env.OPENAI_ASSISTANT,
  fastGPTKey: process.env.FASTGPT_KEY || process.env.OPENAI_KEY,
  fastGPTEndpoint: process.env.FASTGPT_ENDPOINT || 'https://gpt.imiker.com/api',
  fastGPTPrompt: process.env.FASTGPT_PROMPT || 'Long time no see!',
};

export function validateConfig() {
  // 验证 AI 服务相关的配置
  if (config.aiSelected === 'GEMINI' && !config.geminiKey) {
    logger.error('错误：选择了 GEMINI AI 服务，但缺少 GEMINI_KEY 环境变量。');
    process.exit(1);
  } else if (config.aiSelected === 'OpenAI' && (!config.openAIKey || !config.openAIAssistant)) {
    logger.error('错误：选择了 OpenAI 服务，但缺少 OPENAI_KEY 或 OPENAI_ASSISTANT 环境变量。');
    process.exit(1);
  } else if (config.aiSelected === 'fastGPT' && (!config.fastGPTKey || !config.fastGPTEndpoint)) {
    logger.error('错误：选择了 fastGPT 服务，但缺少 FASTGPT_KEY 或 FASTGPT_ENDPOINT 环境变量。');
    process.exit(1);
  }

  // 验证 WhatsApp 客户端的配置
  if (!config.wppSessionName) {
    logger.error('错误：缺少 WPP_SESSION_NAME 环境变量。');
    process.exit(1);
  }

  logger.info('所有配置验证通过。');
}
