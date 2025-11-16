// utils/globalSearchManager.js
// 全局搜索管理器 - 支持跨文件搜索消息内容

import { generateConversationCardUuid, generateFileCardUuid } from './data/uuidManager';
import { extractChatData } from './fileParser';

export class GlobalSearchManager {
  constructor() {
    this.messageIndex = new Map();
    this.fileData = new Map();
    this.searchCache = new Map();
  }

  /**
   * 构建全局消息索引（异步）
   * @param {Array} files - 文件列表
   * @param {Object} processedData - 当前处理的数据
   * @param {number} currentFileIndex - 当前文件索引
   * @param {Object} customNames - 用户自定义名称映射 {uuid: customName}
   */
  async buildGlobalIndex(files, processedData, currentFileIndex, customNames = {}) {
    this.customNames = customNames;  // 保存以便后续使用
    const startTime = Date.now();
    this.messageIndex.clear();
    this.fileData.clear();
    
    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
      const file = files[fileIndex];
      let data;
      
      // 如果是当前文件且已有解析数据，直接使用
      if (fileIndex === currentFileIndex && processedData) {
        data = processedData;
      } else {
        // 否则需要读取并解析文件
        try {
          const text = await file.text();
          const jsonData = JSON.parse(text);
          data = extractChatData(jsonData, file.name);
        } catch (error) {
          console.error(`[GlobalSearch] 解析文件 ${file.name} 失败:`, error);
          continue;
        }
      }
      
      // 处理不同格式的数据
      if (data.format === 'claude_full_export') {
        this.indexFullExportData(data, file, fileIndex);
      } else if (data.chat_history) {
        this.indexSimpleData(data, file, fileIndex);
      }
    }
    
    console.log(`[GlobalSearch] 索引构建完成: ${this.messageIndex.size} 条消息, 来自 ${files.length} 个文件, 耗时 ${Date.now() - startTime}ms`);
    return this.messageIndex;
  }

  /**
   * 索引完整导出格式的数据
   */
  indexFullExportData(data, file, fileIndex) {
    const conversations = data.views?.conversationList || [];
    
    conversations.forEach(conv => {
      const convUuid = generateConversationCardUuid(fileIndex, conv.uuid, file);
      
      // 优先使用用户自定义名称
      const displayName = this.customNames[conv.uuid] || this.customNames[convUuid] || conv.name || '未命名对话';
      
      // 获取该对话的所有消息
      const convMessages = data.chat_history?.filter(msg => 
        msg.conversation_uuid === conv.uuid && !msg.is_conversation_header
      ) || [];
      
      convMessages.forEach((msg, msgIndex) => {
        const messageId = `${convUuid}_${msg.uuid}`;
        
        this.messageIndex.set(messageId, {
          // 文件和对话信息
          fileId: file.name,
          fileName: file.name,
          fileIndex,
          conversationId: conv.uuid,
          conversationName: displayName,  // 使用自定义名称
          originalName: conv.name,  // 保留原始名称
          conversationUuid: convUuid,
          
          // 消息信息
          messageIndex: msgIndex,
          messageUuid: msg.uuid,
          message: {
            content: this.extractContent(msg),
            sender: msg.sender,
            timestamp: msg.created_at,
            parentUuid: msg.parent_message_uuid,
            uuid: msg.uuid,
            isBlank: this.isBlankMessage(msg),
            stopReason: msg.stop_reason,
            hasBranch: msg.has_branch || false,
            inputMode: msg.input_mode
          },
          
          // 搜索相关
          searchableText: this.extractSearchableText(msg),
          
          // 特殊内容标记
          hasThinking: !!msg.thinking,
          hasArtifacts: msg.artifacts && msg.artifacts.length > 0,
          hasAttachments: msg.attachments && msg.attachments.length > 0,
          hasTools: msg.tools && msg.tools.length > 0
        });
      });
    });
  }

  /**
   * 索引简单格式的数据
   */
  indexSimpleData(data, file, fileIndex) {
    const fileUuid = generateFileCardUuid(fileIndex, file);
    const messages = data.chat_history || [];
    
    // 对于单个对话文件，使用 meta_info.uuid 或 fileUuid 作为对话 ID
    const conversationId = data.meta_info?.uuid || fileUuid;
    const originalTitle = data.meta_info?.title || file.name.replace('.json', '');
    const displayName = this.customNames[conversationId] || this.customNames[fileUuid] || originalTitle;
    
    messages.forEach((msg, msgIndex) => {
      const messageId = `${fileUuid}_${msg.uuid || msgIndex}`;
      
      this.messageIndex.set(messageId, {
        fileId: file.name,
        fileName: file.name,
        fileIndex,
        conversationId: conversationId,  // 添加对话 ID
        conversationName: displayName,  // 使用自定义名称
        originalName: originalTitle,  // 保留原始名称
        conversationUuid: fileUuid,
        fileUuid,
        messageIndex: msgIndex,
        messageUuid: msg.uuid || `msg_${msgIndex}`,
        message: {
          content: this.extractContent(msg),
          sender: msg.sender,
          timestamp: msg.created_at,
          uuid: msg.uuid || `msg_${msgIndex}`,
          isBlank: this.isBlankMessage(msg),
          stopReason: msg.stop_reason
        },
        searchableText: this.extractSearchableText(msg),
        hasThinking: !!msg.thinking,
        hasArtifacts: msg.artifacts && msg.artifacts.length > 0
      });
    });
  }

  /**
   * 提取消息内容
   */
  extractContent(msg) {
    if (msg.content) {
      if (Array.isArray(msg.content)) {
        return msg.content
          .filter(item => item.type === 'text')
          .map(item => item.text)
          .join('\n');
      }
      return msg.content;
    }
    return msg.text || msg.display_text || '';
  }

  /**
   * 检查是否为空白消息
   */
  isBlankMessage(msg) {
    const content = this.extractContent(msg);
    return !content || content.trim() === '';
  }

  /**
   * 提取可搜索文本
   */
  extractSearchableText(msg) {
    const parts = [];
    
    // 主要内容
    const content = this.extractContent(msg);
    if (content) parts.push(content);
    
    // 思考过程
    if (msg.thinking) {
      if (typeof msg.thinking === 'string') {
        parts.push(msg.thinking);
      } else if (msg.thinking.thinking) {
        parts.push(msg.thinking.thinking);
      }
    }
    
    // Artifacts
    if (msg.artifacts && Array.isArray(msg.artifacts)) {
      msg.artifacts.forEach(artifact => {
        if (artifact.title) parts.push(artifact.title);
        if (artifact.content) parts.push(artifact.content);
      });
    }
    
    // 工具使用
    if (msg.tools && Array.isArray(msg.tools)) {
      msg.tools.forEach(tool => {
        if (tool.name) parts.push(tool.name);
        if (tool.input) parts.push(JSON.stringify(tool.input));
      });
    }
    
    return parts.join('\n').toLowerCase();
  }

  /**
   * 执行搜索
   * @param {string} query - 搜索查询
   * @param {Object} options - 搜索选项
   * @param {string} searchMode - 搜索模式: 'all' | 'titles' | 'content'
   */
  search(query, options = {}, searchMode = 'all') {
    if (!query || !query.trim()) {
      return { results: [], stats: { total: 0, files: 0, conversations: 0 } };
    }
    
    const lowerQuery = query.toLowerCase().trim();
    const results = [];
    const fileSet = new Set();
    const conversationSet = new Set();
    
    // 根据搜索模式决定搜索范围
    if (searchMode === 'titles') {
      // 仅搜索对话标题 - 按对话分组
      const conversationMap = new Map();
      
      this.messageIndex.forEach((data, messageId) => {
        const convId = data.conversationId || data.fileId;
        if (!conversationMap.has(convId)) {
          conversationMap.set(convId, {
            conversationId: convId,
            conversationName: data.conversationName || data.fileName,
            fileId: data.fileId,
            fileName: data.fileName,
            fileIndex: data.fileIndex,
            conversationUuid: data.conversationUuid,
            messageCount: 0,
            firstMessage: data
          });
        }
        conversationMap.get(convId).messageCount++;
      });
      
      // 搜索对话标题
      conversationMap.forEach((conv) => {
        const titleLower = (conv.conversationName || '').toLowerCase();
        if (titleLower.includes(lowerQuery)) {
          results.push({
            messageId: `title_${conv.conversationId}`,
            ...conv.firstMessage,
            conversationName: conv.conversationName,
            fileName: conv.fileName,
            score: this.calculateRelevance(lowerQuery, titleLower),
            preview: conv.conversationName,
            messageCount: conv.messageCount,
            isConversationResult: true
          });
          fileSet.add(conv.fileId);
          if (conv.conversationId) {
            conversationSet.add(conv.conversationId);
          }
        }
      });
    } else {
      // 搜索消息内容（'all' 或 'content' 模式）
      this.messageIndex.forEach((data, messageId) => {
        if (this.matchesQuery(data, lowerQuery, options, searchMode)) {
          const result = {
            messageId,
            ...data,
            score: this.calculateRelevance(lowerQuery, data.searchableText),
            preview: this.generatePreview(data.searchableText, lowerQuery)
          };
          
          results.push(result);
          fileSet.add(data.fileId);
          if (data.conversationId) {
            conversationSet.add(data.conversationId);
          }
        }
      });
    }
    
    // 按相关度排序
    results.sort((a, b) => b.score - a.score);
    
    // 处理重复内容（仅对消息内容搜索）
    const processedResults = (searchMode !== 'titles' && options.removeDuplicates) ? 
      this.removeDuplicates(results) : results;
    
    return {
      results: processedResults,
      stats: {
        total: processedResults.length,
        files: fileSet.size,
        conversations: conversationSet.size
      }
    };
  }

  /**
   * 检查是否匹配查询
   */
  matchesQuery(data, query, options, searchMode = 'all') {
    // 标题模式在search方法中单独处理
    if (searchMode === 'titles') {
      return false;
    }
    
    // 基础文本匹配
    if (data.searchableText.includes(query)) {
      return true;
    }
    
    // 可选：仅搜索特定类型内容
    if (options.contentOnly && data.message.content.toLowerCase().includes(query)) {
      return true;
    }
    if (options.thinkingOnly && data.hasThinking) {
      // 需要单独检查thinking内容
      return data.searchableText.includes(query);
    }
    
    return false;
  }

  /**
   * 计算相关度分数
   */
  calculateRelevance(query, text) {
    let score = 0;
    const lowerText = text.toLowerCase();
    
    // 完全匹配得分最高
    if (lowerText === query) {
      score += 100;
    }
    
    // 计算出现次数
    const matches = (lowerText.match(new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length;
    score += matches * 10;
    
    // 位置权重（越靠前权重越高）
    const firstIndex = lowerText.indexOf(query);
    if (firstIndex !== -1) {
      score += Math.max(0, 50 - firstIndex / 10);
    }
    
    return score;
  }

  /**
   * 生成预览文本
   */
  generatePreview(text, query, maxLength = 200) {
    if (!text) return '';
    
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) {
      return text.slice(0, maxLength) + (text.length > maxLength ? '...' : '');
    }
    
    // 在匹配位置周围提取文本
    const start = Math.max(0, index - 80);
    const end = Math.min(text.length, index + query.length + 80);
    
    let preview = text.slice(start, end);
    if (start > 0) preview = '...' + preview;
    if (end < text.length) preview = preview + '...';
    
    return preview;
  }

  /**
   * 去除重复结果
   */
  removeDuplicates(results) {
    const seen = new Map();
    const unique = [];
    
    results.forEach(result => {
      const content = result.message.content;
      const contentHash = this.hashContent(content);
      
      if (!seen.has(contentHash)) {
        seen.set(contentHash, result);
        unique.push(result);
      } else {
        // 标记为重复
        const original = seen.get(contentHash);
        if (!original.duplicates) {
          original.duplicates = [];
        }
        original.duplicates.push({
          fileId: result.fileId,
          conversationName: result.conversationName,
          messageIndex: result.messageIndex
        });
      }
    });
    
    return unique;
  }

  /**
   * 简单的内容哈希
   */
  hashContent(content) {
    if (!content) return 'empty';
    const normalized = content.toLowerCase().replace(/\s+/g, ' ').trim();
    return normalized.slice(0, 100); // 使用前100个字符作为简单哈希
  }

  /**
   * 获取消息的分支路径
   */
  getMessagePath(messageId) {
    const data = this.messageIndex.get(messageId);
    if (!data) return null;
    
    const path = [];
    let currentUuid = data.message.uuid;
    let attempts = 0;
    const maxAttempts = 100;
    
    while (currentUuid && currentUuid !== '00000000-0000-4000-8000-000000000000' && attempts < maxAttempts) {
      path.unshift(currentUuid);
      
      // 查找父消息
      let foundParent = false;
      for (const [id, msgData] of this.messageIndex.entries()) {
        if (msgData.message.uuid === currentUuid && msgData.message.parentUuid) {
          currentUuid = msgData.message.parentUuid;
          foundParent = true;
          break;
        }
      }
      
      if (!foundParent) break;
      attempts++;
    }
    
    return path;
  }

  /**
   * 清空索引
   */
  clear() {
    this.messageIndex.clear();
    this.fileData.clear();
    this.searchCache.clear();
  }

  /**
   * 获取索引统计
   */
  getStats() {
    const fileSet = new Set();
    const conversationSet = new Set();
    let blankCount = 0;
    let withThinking = 0;
    let withArtifacts = 0;
    
    this.messageIndex.forEach(data => {
      fileSet.add(data.fileId);
      if (data.conversationId) {
        conversationSet.add(data.conversationId);
      }
      if (data.message.isBlank) blankCount++;
      if (data.hasThinking) withThinking++;
      if (data.hasArtifacts) withArtifacts++;
    });
    
    return {
      totalMessages: this.messageIndex.size,
      totalFiles: fileSet.size,
      totalConversations: conversationSet.size,
      blankMessages: blankCount,
      messagesWithThinking: withThinking,
      messagesWithArtifacts: withArtifacts
    };
  }
}

/**
 * 高亮搜索文本
 * @param {string} text - 要处理的文本
 * @param {string} query - 搜索查询
 * @returns {string} 带有 <mark> 标签的高亮文本
 */
export function highlightSearchText(text, query) {
  if (!query || !text) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

// 单例模式
let globalSearchInstance = null;

export function getGlobalSearchManager() {
  if (!globalSearchInstance) {
    globalSearchInstance = new GlobalSearchManager();
  }
  return globalSearchInstance;
}
