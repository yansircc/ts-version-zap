// src/config/index.ts
import * as dotenv from 'dotenv';
dotenv.config();

export const config = {
  aiSelected: process.env.AI_SELECTED || 'GEMINI',
  maxRetries: 3,
  wppSessionName: 'YANSIR',
  geminiKey: process.env.GEMINI_KEY,
  openAIKey: process.env.OPENAI_KEY,
  openAIAssistant: process.env.OPENAI_ASSISTANT,
  fastGPTKey: process.env.FASTGPT_KEY,
  fastGPTEndpoint: process.env.FASTGPT_ENDPOINT,
  fastGPTPrompt: process.env.FASTGPT_PROMPT || 'Long time no see!',
};

export function validateConfig() {
  // 验证 AI 服务相关的配置
  if (config.aiSelected === 'GEMINI' && !config.geminiKey) {
    console.error('错误：选择了 GEMINI AI 服务，但缺少 GEMINI_KEY 环境变量。');
    process.exit(1);
  } else if (config.aiSelected === 'OpenAI' && (!config.openAIKey || !config.openAIAssistant)) {
    console.error('错误：选择了 OpenAI 服务，但缺少 OPENAI_KEY 或 OPENAI_ASSISTANT 环境变量。');
    process.exit(1);
  } else if (config.aiSelected === 'FastGPT' && (!config.fastGPTKey || !config.fastGPTEndpoint)) {
    console.error('错误：选择了 FastGPT 服务，但缺少 FASTGPT_KEY 或 FASTGPT_ENDPOINT 环境变量。');
    process.exit(1);
  }

  // 验证 WhatsApp 客户端的配置
  if (!config.wppSessionName) {
    console.error('错误：缺少 WPP_SESSION_NAME 环境变量。');
    process.exit(1);
  }

  console.log('所有配置验证通过。');
}
