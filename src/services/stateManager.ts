// src/services/stateManager.ts

// 初始化和导出动态状态变量
export let activeChatsHistory = new Map<string, any[]>();
export let excludedNumbersIntervention = new Map<string, boolean>();
export let lastSentMessageWarningByChatId = new Map<string, string>();

// 提供操作这些状态的函数
export function addToActiveChatsHistory(chatId: string, chatData: any) {
    // 逻辑添加到 activeChatsHistory
}

export function getExcludedNumbersIntervention() {
    return excludedNumbersIntervention;
}

export function updateExcludedNumbersIntervention(chatId: string, shouldExclude: boolean) {
    if (shouldExclude) {
        excludedNumbersIntervention.set(chatId, true);
    } else {
        excludedNumbersIntervention.delete(chatId);
    }
}

export function updateLastSentMessageWarningByChatId(chatId: string, message: string) {
    lastSentMessageWarningByChatId.set(chatId, message);
}
