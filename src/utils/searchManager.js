// utils/searchManager.js
// 搜索功能管理

const SEARCH_DEBOUNCE_MS = 300;

export class SearchManager {
  constructor() {
    this.query = '';
    this.results = [];
    this.filteredMessages = [];
    this.debounceTimer = null;
  }

  /**
   * 执行搜索
   */
  performSearch(searchText, messageList) {
    if (!searchText.trim()) {
      this.results = [];
      this.filteredMessages = messageList;
      return { results: this.results, filteredMessages: this.filteredMessages };
    }

    const lowerQuery = searchText.toLowerCase();
    const searchResults = [];
    const filtered = [];

    messageList.forEach((message, index) => {
      const matches = [];
      let shouldInclude = false;

      // 搜索主要内容
      if (message.display_text?.toLowerCase().includes(lowerQuery)) {
        matches.push({
          type: 'content',
          text: message.display_text,
          excerpt: this.getExcerpt(message.display_text, lowerQuery)
        });
        shouldInclude = true;
      }

      // 搜索思考过程
      if (message.thinking?.toLowerCase().includes(lowerQuery)) {
        matches.push({
          type: 'thinking',
          text: message.thinking,
          excerpt: this.getExcerpt(message.thinking, lowerQuery)
        });
        shouldInclude = true;
      }

      // 搜索artifacts
      if (message.artifacts && message.artifacts.length > 0) {
        message.artifacts.forEach((artifact, artifactIndex) => {
          if (artifact.content?.toLowerCase().includes(lowerQuery) ||
              artifact.title?.toLowerCase().includes(lowerQuery)) {
            matches.push({
              type: 'artifact',
              artifactIndex,
              text: artifact.content || artifact.title,
              excerpt: this.getExcerpt(artifact.content || artifact.title, lowerQuery)
            });
            shouldInclude = true;
          }
        });
      }

      // 搜索对话标题和项目名（对于对话开始标记）
      if (message.is_conversation_header) {
        if (message.conversation_name?.toLowerCase().includes(lowerQuery) ||
            message.project_name?.toLowerCase().includes(lowerQuery) ||
            message.display_text?.toLowerCase().includes(lowerQuery)) {
          shouldInclude = true;
          matches.push({
            type: 'header',
            text: message.display_text
          });
        }
      }

      // 对于文件和对话卡片的搜索
      if (message.type === 'file' || message.type === 'conversation') {
        const searchableText = [
          message.name,
          message.fileName,
          message.summary,
          message.model,
          message.platform
        ].filter(Boolean).join(' ').toLowerCase();

        if (searchableText.includes(lowerQuery)) {
          shouldInclude = true;
          matches.push({
            type: 'card',
            text: message.name || message.fileName
          });
        }
      }

      if (shouldInclude) {
        filtered.push(message);
        searchResults.push({
          messageIndex: index,
          message,
          matches
        });
      }
    });

    this.results = searchResults;
    this.filteredMessages = filtered;

    return { results: this.results, filteredMessages: this.filteredMessages };
  }

  /**
   * 获取搜索摘要
   */
  getExcerpt(text, query) {
    if (!text) return '';

    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return text.slice(0, 100) + '...';

    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + query.length + 50);

    let excerpt = text.slice(start, end);
    if (start > 0) excerpt = '...' + excerpt;
    if (end < text.length) excerpt = excerpt + '...';

    return excerpt;
  }

  /**
   * 防抖搜索
   */
  searchWithDebounce(searchText, messageList, callback) {
    clearTimeout(this.debounceTimer);

    if (!searchText.trim()) {
      this.query = '';
      this.results = [];
      this.filteredMessages = messageList;
      if (callback) callback({ results: this.results, filteredMessages: this.filteredMessages });
      return;
    }

    this.query = searchText;

    this.debounceTimer = setTimeout(() => {
      const result = this.performSearch(searchText, messageList);
      if (callback) callback(result);
    }, SEARCH_DEBOUNCE_MS);
  }

  /**
   * 清除搜索
   */
  clearSearch(messageList) {
    this.query = '';
    this.results = [];
    this.filteredMessages = messageList;
    clearTimeout(this.debounceTimer);
    return { results: this.results, filteredMessages: this.filteredMessages };
  }

  /**
   * 高亮文本
   */
  highlightText(text, searchQuery) {
    if (!searchQuery || !text) return text;

    const parts = text.split(new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === searchQuery.toLowerCase()
        ? `<mark key="${index}">${part}</mark>`
        : part
    ).join('');
  }

  /**
   * 获取结果统计
   */
  getResultStats() {
    const totalMatches = this.results.reduce((acc, result) =>
      acc + result.matches.length, 0
    );

    return {
      messageCount: this.results.length,
      totalMatches,
      hasResults: this.results.length > 0
    };
  }

  /**
   * 获取当前查询
   */
  getQuery() {
    return this.query;
  }

  /**
   * 获取过滤后的消息
   */
  getFilteredMessages() {
    return this.filteredMessages;
  }
}
