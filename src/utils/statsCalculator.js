// utils/statsCalculator.js
// 统计计算工具模块

import { generateFileCardUuid, generateConversationCardUuid } from '../hooks/useFileUuid.js';

// 计算所有文件的标记统计
export const getAllMarksStats = (files, processedData, currentFileIndex) => {
  let totalCompleted = 0;
  let totalImportant = 0;
  let totalDeleted = 0;
  
  files.forEach((file, index) => {
    // 普通文件的标记
    const fileUuid = generateFileCardUuid(index, file);
    const storageKey = `marks_${fileUuid}`;
    
    try {
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        totalCompleted += (parsed.completed || []).length;
        totalImportant += (parsed.important || []).length;
        totalDeleted += (parsed.deleted || []).length;
      }
    } catch (error) {
      console.error(`获取文件 ${file.name} 的标记失败:`, error);
    }
    
    // 如果是claude_full_export格式，还需要检查每个对话的标记
    if (index === currentFileIndex && processedData?.format === 'claude_full_export') {
      const conversations = processedData.views?.conversationList || [];
      
      conversations.forEach(conv => {
        const convUuid = generateConversationCardUuid(index, conv.uuid, file);
        const convStorageKey = `marks_${convUuid}`;
        
        try {
          const savedData = localStorage.getItem(convStorageKey);
          if (savedData) {
            const parsed = JSON.parse(savedData);
            totalCompleted += (parsed.completed || []).length;
            totalImportant += (parsed.important || []).length;
            totalDeleted += (parsed.deleted || []).length;
          }
        } catch (error) {
          console.error(`获取对话 ${conv.name} 的标记失败:`, error);
        }
      });
    }
  });
  
  return {
    completed: totalCompleted,
    important: totalImportant,
    deleted: totalDeleted,
    total: totalCompleted + totalImportant + totalDeleted
  };
};

// 计算当前视图的统计数据
export const calculateViewStats = (
  viewMode, 
  allCards, 
  sortedMessages, 
  timelineMessages,
  files, 
  allMarksStats, 
  stats,
  shouldUseStarSystem,
  starActions,
  currentConversation
) => {
  if (viewMode === 'conversations') {
    const fileCards = allCards.filter(card => card.type === 'file');
    const conversationCards = allCards.filter(card => card.type === 'conversation');
    
    if (conversationCards.length > 0) {
      // claude_full_export的对话网格模式
      const starStats = shouldUseStarSystem ? starActions.getStarStats(conversationCards) : { totalStarred: 0 };
      return {
        totalMessages: conversationCards.reduce((sum, conv) => sum + (conv.messageCount || 0), 0),
        conversationCount: conversationCards.length,
        fileCount: files.length,
        markedCount: allMarksStats.total,
        starredCount: starStats.totalStarred
      };
    } else {
      // 文件网格模式 - 使用预估数据
      const totalMessages = fileCards.reduce((sum, card) => sum + (card.messageCount || 0), 0);
      const totalConversations = fileCards.reduce((sum, card) => sum + (card.conversationCount || 0), 0);
      
      return {
        totalMessages,
        conversationCount: totalConversations,
        fileCount: files.length,
        markedCount: allMarksStats.total,
        starredCount: 0
      };
    }
  } else {
    // 时间线模式
    const messages = Array.isArray(sortedMessages) ? sortedMessages : timelineMessages;
    return {
      totalMessages: messages.length,
      conversationCount: 1,
      fileCount: files.length,
      markedCount: stats.total,
      starredCount: (shouldUseStarSystem && currentConversation?.is_starred) ? 1 : 0
    };
  }
};

// 获取搜索结果的统计数据
export const getSearchResultStats = (viewMode, filteredMessages, allCards, sortedMessages, timelineMessages) => {
  if (viewMode === 'conversations') {
    const hasConversationCards = allCards.some(card => card.type === 'conversation');
    if (hasConversationCards) {
      return {
        displayed: filteredMessages.length,
        total: allCards.length,
        unit: '个对话'
      };
    } else {
      return {
        displayed: filteredMessages.length,
        total: allCards.length,
        unit: '个文件'
      };
    }
  } else {
    const messages = Array.isArray(sortedMessages) ? sortedMessages : timelineMessages;
    return {
      displayed: filteredMessages.length,
      total: messages.length,
      unit: '条消息'
    };
  }
};
