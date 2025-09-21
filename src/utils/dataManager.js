// utils/dataManager.js
// 数据管理和统计计算模块 - 整合messageHandler和statsCalculator

import { ValidationUtils, StorageUtils } from './commonUtils';
import { generateFileCardUuid, generateConversationCardUuid } from '../utils/uuidManager';

/**
 * PostMessage处理器类
 */
export class PostMessageHandler {
  constructor(fileActions, setError) {
    this.fileActions = fileActions;
    this.setError = setError;
    this.handleMessage = this.handleMessage.bind(this);
  }

  handleMessage(event) {
    // 日志记录
    this.logMessage(event);
    
    // 安全验证
    if (!ValidationUtils.isAllowedOrigin(event.origin)) {
      console.warn('[Lyra Exporter] 拒绝来自未知源的消息:', event.origin);
      return;
    }
    
    const { type, source, data } = event.data || {};
    
    // 处理握手
    if (type === 'LYRA_HANDSHAKE' && source === 'lyra-fetch-script') {
      this.handleHandshake(event);
      return;
    }
    
    // 处理数据加载
    if (type === 'LYRA_LOAD_DATA' && source === 'lyra-fetch-script') {
      this.handleDataLoad(event.data.data);
      return;
    }
  }

  logMessage(event) {
    console.log('[Lyra Exporter] 收到消息:', {
      origin: event.origin,
      type: event.data?.type,
      source: event.data?.source,
      hasData: !!event.data
    });
  }

  handleHandshake(event) {
    console.log('[Lyra Exporter] 收到握手请求');
    
    try {
      event.source.postMessage({
        type: 'LYRA_READY',
        source: 'lyra-exporter'
      }, event.origin);
      
      console.log('[Lyra Exporter] 已发送握手响应');
    } catch (error) {
      console.error('[Lyra Exporter] 握手响应失败:', error);
    }
  }

  handleDataLoad(data) {
    console.log('[Lyra Exporter] 处理数据加载');
    
    try {
      const { content, filename } = data;
      
      if (!content) {
        throw new Error('没有收到内容数据');
      }
      
      // 创建文件对象
      const file = this.createFileFromContent(content, filename);
      
      // 加载文件
      this.fileActions.loadFiles([file]);
      
      console.log('[Lyra Exporter] 成功加载数据:', filename);
      this.setError(null);
      
    } catch (error) {
      console.error('[Lyra Exporter] 处理数据失败:', error);
      this.setError('加载数据失败: ' + error.message);
    }
  }

  createFileFromContent(content, filename = 'imported_conversation.json') {
    const jsonData = typeof content === 'string' ? content : JSON.stringify(content);
    const blob = new Blob([jsonData], { type: 'application/json' });
    
    return new File([blob], filename, {
      type: 'application/json',
      lastModified: Date.now()
    });
  }

  // 设置监听器
  setup() {
    console.log('[Lyra Exporter] 设置 postMessage 监听器');
    window.addEventListener('message', this.handleMessage);
    
    return () => {
      console.log('[Lyra Exporter] 移除 postMessage 监听器');
      window.removeEventListener('message', this.handleMessage);
    };
  }
}

/**
 * 统计计算器类
 */
export class StatsCalculator {
  /**
   * 计算所有文件的标记统计
   */
  static getAllMarksStats(files, processedData, currentFileIndex) {
    const stats = {
      completed: 0,
      important: 0,
      deleted: 0,
      total: 0
    };
    
    // 统计普通文件标记
    files.forEach((file, index) => {
      const fileUuid = generateFileCardUuid(index, file);
      const marks = StorageUtils.getFileMarks(fileUuid);
      
      stats.completed += marks.completed.size;
      stats.important += marks.important.size;
      stats.deleted += marks.deleted.size;
    });
    
    // 统计对话标记（claude_full_export格式）
    if (currentFileIndex !== null && processedData?.format === 'claude_full_export') {
      const conversations = processedData.views?.conversationList || [];
      
      conversations.forEach(conv => {
        const convUuid = generateConversationCardUuid(currentFileIndex, conv.uuid, files[currentFileIndex]);
        const marks = StorageUtils.getFileMarks(convUuid);
        
        stats.completed += marks.completed.size;
        stats.important += marks.important.size;
        stats.deleted += marks.deleted.size;
      });
    }
    
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
      // claude_full_export的对话网格模式
      // 添加null检查
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
  static getSearchResultStats(viewMode, filteredMessages, allCards, sortedMessages, timelineMessages) {
    if (viewMode === 'conversations') {
      const hasConversationCards = allCards.some(card => card.type === 'conversation');
      const unit = hasConversationCards ? '个对话' : '个文件';
      
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
        unit: '条消息'
      };
    }
  }
}

/**
 * 创建PostMessage处理器的Hook
 */
export function usePostMessageHandler(fileActions, setError) {
  const handler = new PostMessageHandler(fileActions, setError);
  
  return {
    setup: () => handler.setup(),
    handleMessage: handler.handleMessage
  };
}
