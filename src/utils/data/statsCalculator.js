// data/statsCalculator.js
// 统计计算器 - 计算文件、对话、消息的统计信息

import { getFileMarks } from './markManager';
import { generateFileCardUuid } from './uuidManager';

/**
 * 统计计算器类
 */
export class StatsCalculator {
  /**
   * 计算所有文件的标记统计
   */
  static getAllMarksStats(files) {
    const stats = {
      completed: 0,
      important: 0,
      deleted: 0,
      total: 0
    };

    // 统计普通文件标记
    files.forEach((file, index) => {
      const fileUuid = generateFileCardUuid(index, file);
      const marks = getFileMarks(fileUuid);

      stats.completed += marks.completed.size;
      stats.important += marks.important.size;
      stats.deleted += marks.deleted.size;
    });

    stats.total = stats.completed + stats.important + stats.deleted;
    return stats;
  }

  /**
   * 计算当前视图的统计数据
   */
  static calculateViewStats(params) {
    const {
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
    } = params;

    if (viewMode === 'conversations') {
      return this.calculateConversationStats(
        allCards, files, allMarksStats, shouldUseStarSystem, starActions
      );
    } else {
      return this.calculateTimelineStats(
        sortedMessages, timelineMessages, files, stats, shouldUseStarSystem, currentConversation
      );
    }
  }

  /**
   * 计算对话视图统计
   */
  static calculateConversationStats(allCards, files, allMarksStats, shouldUseStarSystem, starActions) {
    const fileCards = allCards.filter(card => card.type === 'file');
    const conversationCards = allCards.filter(card => card.type === 'conversation');

    if (conversationCards.length > 0) {
      // 对话网格模式（已废弃claude_full_export，但保留兼容）
      const starStats = shouldUseStarSystem && starActions ?
        starActions.getStarStats(conversationCards) :
        { totalStarred: 0 };

      return {
        totalMessages: conversationCards.reduce((sum, conv) => sum + (conv.messageCount || 0), 0),
        conversationCount: conversationCards.length,
        fileCount: files.length,
        markedCount: allMarksStats.total,
        starredCount: starStats.totalStarred
      };
    } else {
      // 文件网格模式
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
  }

  /**
   * 计算时间线视图统计
   */
  static calculateTimelineStats(sortedMessages, timelineMessages, files, stats, shouldUseStarSystem, currentConversation) {
    const messages = Array.isArray(sortedMessages) ? sortedMessages : timelineMessages;

    return {
      totalMessages: messages.length,
      conversationCount: 1,
      fileCount: files.length,
      markedCount: stats.total,
      starredCount: (shouldUseStarSystem && currentConversation?.is_starred) ? 1 : 0
    };
  }

  /**
   * 获取搜索结果统计
   */
  static getSearchResultStats(viewMode, filteredMessages, allCards, sortedMessages, timelineMessages, t) {
    if (!t || typeof t !== 'function') {
      console.error('getSearchResultStats: t is not a function', t);
      t = (key) => key;
    }

    if (viewMode === 'conversations') {
      const hasConversationCards = allCards.some(card => card.type === 'conversation');
      const unit = hasConversationCards ?
        t('units.conversation') :
        t('units.file');

      return {
        displayed: filteredMessages.length,
        total: allCards.length,
        unit
      };
    } else {
      const messages = Array.isArray(sortedMessages) ? sortedMessages : timelineMessages;

      return {
        displayed: filteredMessages.length,
        total: messages.length,
        unit: t('units.message')
      };
    }
  }

  /**
   * 获取当前统计
   */
  static getStats(params) {
    const {
      viewMode,
      allCards,
      sortedMessages,
      timelineMessages,
      files,
      markManagerRef,
      starManagerRef,
      shouldUseStarSystem,
      currentConversation,
      processedData,
      currentFileIndex
    } = params;

    const markStats = markManagerRef?.current ? markManagerRef.current.getStats() : {
      completed: 0,
      important: 0,
      deleted: 0,
      total: 0
    };

    const allMarksStats = this.getAllMarksStats(files);

    return this.calculateViewStats({
      viewMode,
      allCards,
      sortedMessages,
      timelineMessages,
      files,
      allMarksStats,
      stats: markStats,
      shouldUseStarSystem,
      starActions: starManagerRef?.current,
      currentConversation
    });
  }
}
