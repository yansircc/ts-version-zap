// src/utils/intervention.ts
import { config } from '../config';
import { logger } from './logger';
import { getChatHistory } from './chatHistory';
import * as stateManager from '../services/stateManager';

export async function checkForManualIntervention(chatId: string): Promise<void> {
    const messages = await getChatHistory(chatId);
    const messagesSentByMe = messages.filter(message => (message as any).fromMe);
    const lastMessageSentByMe = messagesSentByMe.pop() ?? null;

    if (lastMessageSentByMe && lastMessageSentByMe.body.endsWith(config.humanInterventionKeyword)) {
        stateManager.activateManualIntervention(chatId);
        logger.info(`检测到人工干预关键词: ${lastMessageSentByMe.body}`);
        return;
    }
    if (lastMessageSentByMe && lastMessageSentByMe.body.endsWith(config.aiInterventionKeyword)) {
        stateManager.deactivateManualIntervention(chatId);
        logger.info(`检测到AI接管关键词: ${lastMessageSentByMe.body}`);
        return;
    }
}
