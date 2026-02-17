// components/ActionPanel.js
// Ubuntu风格操作面板 - 整合全局搜索、语义搜索、导出功能

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { getGlobalSearchManager } from '../utils/globalSearchManager';
import { getSemanticSearchManager, extractMessagesForSemantic } from '../utils/semanticSearchManager';
import { getAllMarksStats } from '../utils/data/markManager';
import { generateFileCardUuid, generateConversationCardUuid } from '../utils/data/uuidManager';
import { DateTimeUtils } from '../utils/fileParser';
import { useI18n } from '../index.js';
import StorageManager from '../utils/storageManager';

/**
 * 左侧导航项配置
 */
const NAV_ITEMS = [
  { id: 'globalSearch', icon: '', labelKey: 'actionPanel.nav.globalSearch' },
  { id: 'semanticSearch', icon: '', labelKey: 'actionPanel.nav.semanticSearch' },
  { id: 'exportMarkdown', icon: '', labelKey: 'actionPanel.nav.exportMarkdown' },
  { id: 'exportScreenshot', icon: '', labelKey: 'actionPanel.nav.exportScreenshot' },
  { id: 'exportPdf', icon: '', labelKey: 'actionPanel.nav.exportPdf' }
];

/**
 * Ubuntu风格操作面板
 */
const ActionPanel = ({
  isOpen,
  onClose,
  onNavigateToMessage,
  files,
  processedData,
  currentFileIndex,
  exportOptions,
  setExportOptions,
  viewMode,
  currentBranchState,
  operatedFiles,
  stats,
  starManagerRef,
  shouldUseStarSystem,
  isFullExportConversationMode,
  allCards,
  onExport,
  initialSection = 'globalSearch',
  initialSearchQuery = ''
}) => {
  const { t } = useI18n();
  const [activeSection, setActiveSection] = useState(initialSection);
  const panelRef = useRef(null);

  // 手势支持
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // 使用 ref 保存 onClose，避免 useEffect 因 onClose 变化而重复执行
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  // 浏览器回退支持
  useEffect(() => {
    if (!isOpen) return;
    window.history.pushState({ view: 'action-panel' }, '');

    const handlePopState = () => onCloseRef.current();
    window.addEventListener('popstate', handlePopState);

    return () => window.removeEventListener('popstate', handlePopState);
  }, [isOpen]);

  // 当isOpen变化时重置到initialSection
  useEffect(() => {
    if (isOpen) {
      setActiveSection(initialSection);
    }
  }, [isOpen, initialSection]);

  // 手势处理
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const onTouchMove = (e) => {
    setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const absDistanceX = Math.abs(distanceX);
    const absDistanceY = Math.abs(distanceY);
    const isHorizontalSwipe = absDistanceX > absDistanceY && absDistanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;

    if (isHorizontalSwipe && isRightSwipe) {
      handleBackClick();
    }
  };

  const handleBackClick = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleBackClick}>
      <div
        className="action-panel-ubuntu"
        onClick={e => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        ref={panelRef}
      >
        {/* 顶部标题栏 */}
        <div className="action-panel-header">
          <h2>{t('actionPanel.title')}</h2>
          <button className="close-btn" onClick={handleBackClick}>×</button>
        </div>

        {/* 双栏布局 */}
        <div className="action-panel-body">
          {/* 左侧导航 */}
          <nav className="action-panel-nav">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveSection(item.id);
                  // 记住上次使用的导出格式
                  if (item.id.startsWith('export')) {
                    StorageManager.set('last_export_format', item.id);
                  }
                }}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{t(item.labelKey)}</span>
              </button>
            ))}
          </nav>

          {/* 右侧内容区 */}
          <div className="action-panel-content">
            {activeSection === 'globalSearch' && (
              <GlobalSearchSection
                onNavigateToMessage={onNavigateToMessage}
                onClose={handleBackClick}
                initialQuery={initialSearchQuery}
              />
            )}

            {activeSection === 'semanticSearch' && (
              <SemanticSearchSection
                files={files}
                processedData={processedData}
                currentFileIndex={currentFileIndex}
                onNavigateToMessage={onNavigateToMessage}
                onClose={handleBackClick}
              />
            )}

            {(activeSection === 'exportMarkdown' || activeSection === 'exportScreenshot' || activeSection === 'exportPdf') && (
              <ExportSection
                exportFormat={
                  activeSection === 'exportMarkdown' ? 'markdown' :
                  activeSection === 'exportScreenshot' ? 'screenshot' : 'pdf'
                }
                exportOptions={exportOptions}
                setExportOptions={setExportOptions}
                viewMode={viewMode}
                currentBranchState={currentBranchState}
                operatedFiles={operatedFiles}
                files={files}
                stats={stats}
                starManagerRef={starManagerRef}
                shouldUseStarSystem={shouldUseStarSystem}
                isFullExportConversationMode={isFullExportConversationMode}
                allCards={allCards}
                processedData={processedData}
                currentFileIndex={currentFileIndex}
                onExport={onExport}
                onClose={handleBackClick}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 搜索历史管理
 */
const SEARCH_HISTORY_KEY = 'search_history';
const MAX_HISTORY_SIZE = 20;

const getSearchHistory = () => {
  return StorageManager.get(SEARCH_HISTORY_KEY, []);
};

const saveSearchHistory = (history) => {
  try {
    StorageManager.set(SEARCH_HISTORY_KEY, history.slice(0, MAX_HISTORY_SIZE));
  } catch (e) {
    console.error('[SearchHistory] 保存失败:', e);
  }
};

const addToSearchHistory = (query) => {
  if (!query?.trim()) return;
  const history = getSearchHistory();
  // 移除重复项
  const filtered = history.filter(item => item.query !== query);
  // 添加到开头
  filtered.unshift({ query, timestamp: Date.now() });
  saveSearchHistory(filtered);
};

const removeFromSearchHistory = (query) => {
  const history = getSearchHistory();
  const filtered = history.filter(item => item.query !== query);
  saveSearchHistory(filtered);
  return filtered;
};

/**
 * 展开状态管理
 */
const EXPANDED_STATE_KEY = 'search_expanded';

const getExpandedState = () => {
  const stored = StorageManager.get(EXPANDED_STATE_KEY, []);
  return new Set(stored);
};

const saveExpandedState = (expandedSet) => {
  try {
    StorageManager.set(EXPANDED_STATE_KEY, [...expandedSet]);
  } catch (e) {
    console.error('[ExpandedState] 保存失败:', e);
  }
};

/**
 * 高亮关键词并渲染Markdown格式
 */
const highlightKeywords = (text, keywords) => {
  if (!text) return text;

  // 先处理Markdown格式：**bold** 和 *italic*
  const renderMarkdown = (str) => {
    const parts = [];
    let lastIndex = 0;
    // 匹配 **bold** 或 *italic* (不匹配 ** 或 *)
    const mdRegex = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
    let match;

    while ((match = mdRegex.exec(str)) !== null) {
      // 添加匹配前的文本
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: str.slice(lastIndex, match.index) });
      }

      if (match[2]) {
        // **bold**
        parts.push({ type: 'bold', content: match[2] });
      } else if (match[3]) {
        // *italic*
        parts.push({ type: 'italic', content: match[3] });
      }
      lastIndex = mdRegex.lastIndex;
    }

    // 添加剩余文本
    if (lastIndex < str.length) {
      parts.push({ type: 'text', content: str.slice(lastIndex) });
    }

    return parts.length > 0 ? parts : [{ type: 'text', content: str }];
  };

  // 高亮关键词
  const highlightInPart = (content, partKey) => {
    if (!keywords?.trim()) return content;

    const words = keywords.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return content;

    const escapedWords = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(${escapedWords.join('|')})`, 'gi');

    const parts = content.split(regex);
    return parts.map((part, index) => {
      if (words.some(w => part.toLowerCase() === w.toLowerCase())) {
        return <mark key={`${partKey}-${index}`} className="search-highlight">{part}</mark>;
      }
      return part;
    });
  };

  // 先解析Markdown，再对每个部分应用高亮
  const mdParts = renderMarkdown(text);

  return mdParts.map((part, index) => {
    const highlighted = highlightInPart(part.content, index);

    if (part.type === 'bold') {
      return <strong key={index} className="search-bold">{highlighted}</strong>;
    } else if (part.type === 'italic') {
      return <em key={index} className="search-italic">{highlighted}</em>;
    }
    return <span key={index}>{highlighted}</span>;
  });
};

/**
 * 全局搜索部分
 */
const GlobalSearchSection = ({ onNavigateToMessage, onClose, initialQuery = '' }) => {
  const { t } = useI18n();
  const [query, setQuery] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState(() => getExpandedState());
  const [searchHistory, setSearchHistory] = useState(() => getSearchHistory());

  const searchInputRef = useRef(null);
  const searchManagerRef = useRef(null);
  const debounceTimer = useRef(null);
  const initialSearchDone = useRef(false);

  // 从 localStorage 读取搜索选项
  const getSearchOptions = () => {
    const stored = StorageManager.get('search-options');
    if (stored) {
      return JSON.parse(stored);
    }
    return {
      removeDuplicates: true,
      includeThinking: true,
      includeArtifacts: true
    };
  };

  // 初始化搜索管理器
  useEffect(() => {
    searchManagerRef.current = getGlobalSearchManager();
  }, []);

  // 自动聚焦搜索框
  useEffect(() => {
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // 处理初始查询
  useEffect(() => {
    if (initialQuery && !initialSearchDone.current && searchManagerRef.current) {
      initialSearchDone.current = true;
      setQuery(initialQuery);
      // 立即执行搜索并添加到历史
      const currentOptions = getSearchOptions();
      const results = searchManagerRef.current.search(initialQuery, currentOptions, 'all');
      setSearchResults(results);
      addToSearchHistory(initialQuery);
      setSearchHistory(getSearchHistory());
    }
  }, [initialQuery]);

  // 执行搜索
  const performSearch = useCallback((searchQuery, addHistory = false) => {
    if (!searchQuery || !searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    setIsSearching(true);

    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      try {
        const currentOptions = getSearchOptions();
        const results = searchManagerRef.current.search(searchQuery, currentOptions, 'all');
        setSearchResults(results);
        setIsSearching(false);

        // 只在需要时添加到历史（回车搜索或点击历史）
        if (addHistory) {
          addToSearchHistory(searchQuery);
          setSearchHistory(getSearchHistory());
        }
      } catch (error) {
        console.error('[GlobalSearchSection] 搜索错误:', error);
        setIsSearching(false);
      }
    }, 300);
  }, []);

  // 处理输入变化
  const handleInputChange = (e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    performSearch(newQuery, false);
  };

  // 处理回车键搜索
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      e.preventDefault();
      performSearch(query, true);
    }
  };

  // 处理历史记录点击
  const handleHistoryClick = (historyQuery) => {
    setQuery(historyQuery);
    performSearch(historyQuery, true);
  };

  // 删除历史记录
  const handleDeleteHistory = (e, historyQuery) => {
    e.stopPropagation();
    const newHistory = removeFromSearchHistory(historyQuery);
    setSearchHistory(newHistory);
  };

  // 处理结果点击
  const handleResultClick = (result) => {
    if (onNavigateToMessage) {
      onNavigateToMessage({
        fileIndex: result.fileIndex,
        conversationUuid: result.conversationUuid,
        messageIndex: result.messageIndex,
        messageId: result.messageId,
        messageUuid: result.messageUuid,
        highlight: true
      });
    }
    onClose();
  };

  // 清空搜索
  const handleClear = () => {
    setQuery('');
    setSearchResults(null);
    searchInputRef.current?.focus();
  };

  // 切换展开/收起
  const handleFileToggle = (fileId) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(fileId)) {
      newExpanded.delete(fileId);
    } else {
      newExpanded.add(fileId);
    }
    setExpandedFiles(newExpanded);
    saveExpandedState(newExpanded);
  };

  // 按对话分组搜索结果
  const resultsByConversation = useMemo(() => {
    if (!searchResults?.results) return {};

    const grouped = {};
    searchResults.results.forEach(result => {
      const convKey = result.conversationUuid || result.fileUuid || result.fileId;
      if (!grouped[convKey]) {
        grouped[convKey] = {
          conversationId: result.conversationId,
          conversationName: result.conversationName || result.fileName,
          fileName: result.fileName,
          fileIndex: result.fileIndex,
          conversationUuid: result.conversationUuid,
          results: []
        };
      }
      grouped[convKey].results.push(result);
    });

    return grouped;
  }, [searchResults]);

  const indexStats = searchManagerRef.current?.getStats() || {};

  return (
    <div className="action-section-content global-search-section">
      {/* 搜索输入 */}
      <div className="search-input-container">
        <input
          ref={searchInputRef}
          type="text"
          className="action-search-input"
          placeholder={t('search.placeholderAll')}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />
        {query && (
          <button className="clear-btn" onClick={handleClear}>×</button>
        )}
      </div>

      {/* 搜索结果 */}
      <div className="search-results-container">
        {isSearching ? (
          <div className="search-loading">
            <div className="loading-spinner"></div>
            <p>{t('nodeLocator.searching')}</p>
          </div>
        ) : !query ? (
          <div className="search-placeholder">
            <p>{t('search.placeholderAll')}</p>
            {indexStats.totalMessages > 0 && (
              <p className="search-stats">
                {t('search.indexStats', {
                  messages: indexStats.totalMessages,
                  files: indexStats.totalConversations
                })}
              </p>
            )}

            {/* 搜索历史 */}
            {searchHistory.length > 0 && (
              <div className="search-history">
                <div className="history-header">
                  <span className="history-title">{t('search.history.title')}</span>
                </div>
                <div className="history-list">
                  {searchHistory.map((item, index) => (
                    <div
                      key={index}
                      className="history-item"
                      onClick={() => handleHistoryClick(item.query)}
                    >
                      <span className="history-icon">🕐</span>
                      <span className="history-query">{item.query}</span>
                      <button
                        className="history-delete"
                        onClick={(e) => handleDeleteHistory(e, item.query)}
                        title={t('search.history.delete')}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : searchResults && searchResults.results.length === 0 ? (
          <div className="search-no-results">
            <p>{t('semanticSearch.chat.noResults')}</p>
          </div>
        ) : searchResults && searchResults.results.length > 0 ? (
          <div className="search-results-list">
            <div className="results-header">
              <span className="results-count">
                {t('nodeLocator.resultCount', { count: searchResults.results.length })}
              </span>
            </div>
            {Object.entries(resultsByConversation).map(([convKey, convData]) => (
              <div key={convKey} className="conversation-group">
                <div
                  className="conversation-header"
                  onClick={() => handleFileToggle(convKey)}
                >
                  <span className="expand-icon">{expandedFiles.has(convKey) ? '▼' : '▶'}</span>
                  <span className="conversation-name">{convData.conversationName}</span>
                  <span className="result-count">({convData.results.length})</span>
                </div>
                {expandedFiles.has(convKey) && (
                  <div className="conversation-results">
                    {convData.results.map((result, index) => (
                      <div
                        key={index}
                        className="result-item"
                        onClick={() => handleResultClick(result)}
                      >
                        <div className="result-header">
                          <span className="result-sender">{result.message?.sender || 'unknown'}</span>
                          <span className="result-index">#{result.messageIndex + 1}</span>
                        </div>
                        <div
                          className="result-content"
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 6,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                        >
                          {highlightKeywords(
                            result.preview || result.message?.content?.slice(0, 400) || '',
                            query
                          )}
                        </div>
                        {result.message?.timestamp && (
                          <div className="result-meta">
                            <span className="result-time">
                              {DateTimeUtils.formatDateTime(result.message.timestamp)}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

/**
 * 语义搜索部分
 */
const SemanticSearchSection = ({
  files,
  processedData,
  currentFileIndex,
  onNavigateToMessage,
  onClose
}) => {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [progress, setProgress] = useState({ status: '', progress: 0, message: '' });
  const [searchResults, setSearchResults] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);

  // Embedding 配置
  const [embeddingConfig, setEmbeddingConfig] = useState(() => {
    return StorageManager.get('semantic-embedding-config', {
      provider: 'lmstudio',
      lmStudioUrl: 'http://localhost:1234',
      modelName: 'qwen3-embedding'
    });
  });

  const inputRef = useRef(null);
  const chatContainerRef = useRef(null);
  const semanticManagerRef = useRef(null);
  const globalManagerRef = useRef(null);
  const pendingQueryRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const prevFilesSignatureRef = useRef('');

  // 初始化管理器
  useEffect(() => {
    semanticManagerRef.current = getSemanticSearchManager();
    globalManagerRef.current = getGlobalSearchManager();
    setIsModelReady(semanticManagerRef.current?.isReady || false);
    if (semanticManagerRef.current) {
      semanticManagerRef.current.configure(embeddingConfig);
    }
  }, []);

  // 监听文件变化
  useEffect(() => {
    const currentSignature = files?.length
      ? `${files.length}:${files.map(f => f.name || f.filename || '').join(',')}`
      : '';

    const prevSignature = prevFilesSignatureRef.current;
    const filesChanged = prevSignature !== '' && currentSignature !== prevSignature;
    prevFilesSignatureRef.current = currentSignature;

    if (filesChanged) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      setProgress({ status: 'waiting', progress: 0, message: t('semanticSearch.status.filesChanging') });

      debounceTimerRef.current = setTimeout(() => {
        if (semanticManagerRef.current?.isReady) {
          semanticManagerRef.current.clear();
        }
        setProgress({ status: 'stale', progress: 0, message: t('semanticSearch.status.filesChanged') });
        setIsModelReady(false);
        debounceTimerRef.current = null;

        if (pendingQueryRef.current) {
          setTimeout(() => initializeAndIndex(), 100);
        }
      }, 5000);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [files]);

  // 自动滚动
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // 初始化模型并构建索引
  const initializeAndIndex = useCallback(async () => {
    if (!semanticManagerRef.current || !globalManagerRef.current) return;
    if (isIndexing || isLoading) return;

    setIsIndexing(true);

    try {
      const initSuccess = await semanticManagerRef.current.initialize((p) => {
        setProgress(p);
        if (p.status === 'ready') {
          setIsModelReady(true);
        }
      });

      if (!initSuccess) {
        throw new Error('模型初始化失败');
      }

      if (globalManagerRef.current.messageIndex.size === 0) {
        setProgress({ status: 'building', progress: 0, message: '构建消息索引...' });
        await globalManagerRef.current.buildGlobalIndex(files, processedData, currentFileIndex);
      }

      const messages = extractMessagesForSemantic(globalManagerRef.current);
      await semanticManagerRef.current.buildIndex(messages, setProgress);

      setProgress({ status: 'ready', progress: 100, message: '准备就绪' });
      setIsModelReady(true);

      if (pendingQueryRef.current) {
        const pendingQuery = pendingQueryRef.current;
        pendingQueryRef.current = null;
        setTimeout(() => executePendingSearch(pendingQuery), 100);
      }
    } catch (error) {
      console.error('[SemanticSearchSection] 初始化失败:', error);
      setProgress({ status: 'error', progress: 0, message: `初始化失败: ${error.message}` });
      setIsModelReady(false);
    } finally {
      setIsIndexing(false);
    }
  }, [files, processedData, currentFileIndex, isIndexing, isLoading]);

  // 执行语义搜索
  const performSearch = async (searchQuery) => {
    if (!semanticManagerRef.current?.isReady) return [];
    const results = await semanticManagerRef.current.search(searchQuery, 5);
    setSearchResults(results);
    return results;
  };

  // 执行搜索
  const executeSearch = async (userQuery) => {
    setIsLoading(true);
    try {
      const results = await performSearch(userQuery);
      if (results.length === 0) {
        setChatHistory(prev => [...prev, {
          role: 'assistant',
          content: t('semanticSearch.chat.noResults'),
          results: [],
          timestamp: new Date().toISOString()
        }]);
      } else {
        setChatHistory(prev => [...prev, {
          role: 'assistant',
          content: t('semanticSearch.chat.resultsIntro'),
          results: results,
          timestamp: new Date().toISOString()
        }]);
      }
    } catch (error) {
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: t('semanticSearch.chat.searchError', { error: error.message }),
        results: [],
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const executePendingSearch = (userQuery) => {
    setChatHistory(prev => prev.filter(msg => !msg.isPending));
    executeSearch(userQuery);
  };

  // 处理提交
  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!query.trim() || isLoading) return;

    const userQuery = query.trim();
    setQuery('');

    setChatHistory(prev => [...prev, {
      role: 'user',
      content: userQuery,
      timestamp: new Date().toISOString()
    }]);

    if (!isModelReady) {
      pendingQueryRef.current = userQuery;
      const waitingMessage = progress.status === 'waiting'
        ? t('semanticSearch.chat.waitingFiles')
        : t('semanticSearch.chat.waitingIndex');

      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: waitingMessage,
        results: [],
        timestamp: new Date().toISOString(),
        isPending: true
      }]);

      if (progress.status !== 'waiting' && !isIndexing) {
        initializeAndIndex();
      }
      return;
    }

    await executeSearch(userQuery);
  };

  // 跳转到消息
  const handleResultClick = (result) => {
    if (onNavigateToMessage) {
      onNavigateToMessage({
        fileIndex: result.metadata.fileIndex,
        conversationUuid: result.metadata.conversationUuid,
        messageIndex: result.metadata.messageIndex,
        messageUuid: result.metadata.messageUuid,
        highlight: true
      });
      onClose?.();
    }
  };

  const stats = semanticManagerRef.current?.getStats() || {};

  return (
    <div className="action-section-content semantic-search-section">
      {/* 状态栏 */}
      <div className="semantic-status">
        {!isModelReady ? (
          <div className="status-init">
            {isIndexing && (
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress.progress}%` }} />
              </div>
            )}
            <p className="status-message" style={{
              color: progress.status === 'error' ? '#ef4444'
                : progress.status === 'stale' ? '#f59e0b'
                  : progress.status === 'waiting' ? '#3b82f6'
                    : 'inherit'
            }}>
              {progress.message || `${embeddingConfig.lmStudioUrl}`}
            </p>
          </div>
        ) : (
          <div className="status-ready">
            <span className="status-badge">{t('semanticSearch.status.ready')}</span>
            <span className="status-info">
              {t('semanticSearch.status.embeddingInfo', { count: stats.indexSize || 0 })}
            </span>
          </div>
        )}
      </div>

      {/* 对话区域 */}
      <div className="semantic-chat" ref={chatContainerRef}>
        {chatHistory.length === 0 ? (
          <div className="chat-placeholder">
            <p>{t('semanticSearch.chat.greeting')}</p>
          </div>
        ) : (
          chatHistory.map((msg, idx) => (
            <div key={idx} className={`chat-message ${msg.role}`}>
              <div className="message-content">{msg.content}</div>
              {msg.results && msg.results.length > 0 && (
                <div className="search-results">
                  {msg.results.map((result, rIdx) => (
                    <div
                      key={rIdx}
                      className="result-card"
                      onClick={() => handleResultClick(result)}
                    >
                      <div className="result-header">
                        <span className="result-source">{result.metadata.conversationName}</span>
                        <span className="result-score">
                          {t('semanticSearch.results.score', { score: Math.round(result.score * 100) })}
                        </span>
                      </div>
                      <div className="result-preview">{result.content.slice(0, 150)}...</div>
                      <div className="result-meta">
                        <span>{result.metadata.sender}</span>
                        {result.metadata.timestamp && (
                          <span>{new Date(result.metadata.timestamp).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
        {isLoading && (
          <div className="chat-message assistant loading">
            <div className="typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
      </div>

      {/* 输入区域 */}
      <form className="semantic-input" onSubmit={handleSubmit}>
        <textarea
          ref={inputRef}
          placeholder={
            isModelReady
              ? t('semanticSearch.chat.placeholder')
              : progress.status === 'waiting'
                ? t('semanticSearch.chat.placeholderWaiting')
                : isIndexing
                  ? t('semanticSearch.chat.placeholderIndexing')
                  : t('semanticSearch.chat.placeholderNotReady')
          }
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !query.trim()}>
          {isLoading ? '...' : isModelReady ? t('semanticSearch.chat.send') : t('semanticSearch.chat.search')}
        </button>
      </form>
    </div>
  );
};

/**
 * 导出部分
 */
const ExportSection = ({
  exportFormat,
  exportOptions,
  setExportOptions,
  viewMode,
  currentBranchState,
  operatedFiles,
  files,
  stats,
  starManagerRef,
  shouldUseStarSystem,
  isFullExportConversationMode,
  allCards,
  processedData,
  currentFileIndex,
  onExport,
  onClose
}) => {
  const { t } = useI18n();

  // 同步导出格式
  useEffect(() => {
    if (exportFormat && exportOptions.exportFormat !== exportFormat) {
      setExportOptions(prev => ({ ...prev, exportFormat }));
    }
  }, [exportFormat, exportOptions.exportFormat, setExportOptions]);

  const markStats = getAllMarksStats(
    files,
    processedData,
    currentFileIndex,
    generateFileCardUuid,
    generateConversationCardUuid
  );

  return (
    <div className="action-section-content export-section">
      {/* PDF 页面格式选择 */}
      {exportFormat === 'pdf' && (
        <div className="export-group">
          <h3>PDF</h3>
          <div className="export-options-list">
            <label className="export-radio-option">
              <input
                type="radio"
                name="pageFormat"
                value="a4"
                checked={exportOptions.pageFormat === 'a4' || !exportOptions.pageFormat}
                onChange={(e) => setExportOptions({...exportOptions, pageFormat: e.target.value})}
              />
              <div className="option-content">
                <span className="option-title">A4</span>
                <span className="option-desc">210mm × 297mm {t('app.export.pageFormat.standard')}</span>
              </div>
            </label>
            <label className="export-radio-option">
              <input
                type="radio"
                name="pageFormat"
                value="letter"
                checked={exportOptions.pageFormat === 'letter'}
                onChange={(e) => setExportOptions({...exportOptions, pageFormat: e.target.value})}
              />
              <div className="option-content">
                <span className="option-title">Letter</span>
                <span className="option-desc">8.5" × 11" {t('app.export.pageFormat.northAmerica')}</span>
              </div>
            </label>
            <label className="export-radio-option">
              <input
                type="radio"
                name="pageFormat"
                value="supernote"
                checked={exportOptions.pageFormat === 'supernote'}
                onChange={(e) => setExportOptions({...exportOptions, pageFormat: e.target.value})}
              />
              <div className="option-content">
                <span className="option-title">Supernote Manta</span>
                <span className="option-desc">227mm × 303mm {t('app.export.pageFormat.supernote')}</span>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* 导出范围选择 */}
      <div className="export-group">
        <h3>{t('app.export.scope.title')}</h3>
        <div className="export-options-list">
          <label className="export-radio-option">
            <input
              type="radio"
              name="scope"
              value="currentBranch"
              checked={exportOptions.scope === 'currentBranch'}
              onChange={(e) => setExportOptions({...exportOptions, scope: e.target.value})}
              disabled={viewMode !== 'timeline' || currentBranchState?.showAllBranches}
            />
            <div className="option-content">
              <span className="option-title">{t('app.export.scope.currentBranch')}</span>
              {viewMode === 'timeline' ? (
                currentBranchState?.showAllBranches ? (
                  <span className="option-hint">{t('app.export.scope.hint.showAllBranches')}</span>
                ) : (
                  <span className="option-desc">{t('app.export.scope.currentBranchDesc')}</span>
                )
              ) : (
                <span className="option-hint">{t('app.export.scope.hint.enterTimeline')}</span>
              )}
            </div>
          </label>
          <label className="export-radio-option">
            <input
              type="radio"
              name="scope"
              value="current"
              checked={exportOptions.scope === 'current'}
              onChange={(e) => setExportOptions({...exportOptions, scope: e.target.value})}
              disabled={viewMode !== 'timeline'}
            />
            <div className="option-content">
              <span className="option-title">{t('app.export.scope.current')}</span>
              {viewMode === 'timeline' ? (
                <span className="option-desc">{t('app.export.scope.currentDesc')}</span>
              ) : (
                <span className="option-hint">{t('app.export.scope.hint.enterTimeline')}</span>
              )}
            </div>
          </label>
          <label className="export-radio-option">
            <input
              type="radio"
              name="scope"
              value="operated"
              checked={exportOptions.scope === 'operated'}
              onChange={(e) => setExportOptions({...exportOptions, scope: e.target.value})}
              disabled={operatedFiles?.size === 0}
            />
            <div className="option-content">
              <span className="option-title">
                {t('app.export.scope.operated')} <span className="option-count">({operatedFiles?.size || 0}个)</span>
              </span>
              {operatedFiles?.size > 0 ? (
                <span className="option-desc">{t('app.export.scope.operatedDesc')}</span>
              ) : (
                <span className="option-hint">{t('app.export.scope.hint.markFirst')}</span>
              )}
            </div>
          </label>
          <label className="export-radio-option">
            <input
              type="radio"
              name="scope"
              value="all"
              checked={exportOptions.scope === 'all'}
              onChange={(e) => setExportOptions({...exportOptions, scope: e.target.value})}
            />
            <div className="option-content">
              <span className="option-title">
                {t('app.export.scope.all')} <span className="option-count">({files?.length || 0}个)</span>
              </span>
              <span className="option-desc">{t('app.export.scope.allDesc')}</span>
            </div>
          </label>
        </div>
      </div>

      {/* 过滤器 */}
      <div className="export-group">
        <h3>{t('app.export.filters.title')}</h3>
        <div className="export-options-list">
          <label className="export-checkbox-option">
            <input
              type="checkbox"
              checked={exportOptions.excludeDeleted}
              onChange={(e) => setExportOptions({...exportOptions, excludeDeleted: e.target.checked})}
            />
            <div className="option-content">
              <span className="option-title">{t('app.export.filters.excludeDeleted')}</span>
              <span className="option-desc">{t('app.export.filters.excludeDeletedDesc')}</span>
            </div>
          </label>
          <label className="export-checkbox-option">
            <input
              type="checkbox"
              checked={exportOptions.includeCompleted}
              onChange={(e) => setExportOptions({...exportOptions, includeCompleted: e.target.checked})}
            />
            <div className="option-content">
              <span className="option-title">{t('app.export.filters.includeCompleted')}</span>
              <span className="option-desc">{t('app.export.filters.includeCompletedDesc')}</span>
            </div>
          </label>
          <label className="export-checkbox-option">
            <input
              type="checkbox"
              checked={exportOptions.includeImportant}
              onChange={(e) => setExportOptions({...exportOptions, includeImportant: e.target.checked})}
            />
            <div className="option-content">
              <span className="option-title">{t('app.export.filters.includeImportant')}</span>
              <span className="option-desc">
                {t('app.export.filters.includeImportantDesc')}
                {exportOptions.includeCompleted && exportOptions.includeImportant ? t('app.export.filters.importantAndCompleted') : ''}
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* 导出信息 */}
      <div className="export-info">
        <div className="info-row">
          <span className="label">{t('app.export.stats.files')}</span>
          <span className="value">{t('app.export.stats.filesDesc', {
            fileCount: files?.length || 0,
            conversationCount: stats?.conversationCount || 0,
            totalMessages: stats?.totalMessages || 0
          })}</span>
        </div>
        <div className="info-row">
          <span className="label">{t('app.export.stats.marks')}</span>
          <span className="value">
            {t('app.export.stats.marksDesc', {
              completed: markStats.completed,
              important: markStats.important,
              deleted: markStats.deleted
            })}
          </span>
        </div>
        {isFullExportConversationMode && shouldUseStarSystem && starManagerRef?.current && (
          <div className="info-row">
            <span className="label">{t('app.export.stats.stars')}</span>
            <span className="value">
              {t('app.export.stats.starsDesc', {
                starred: starManagerRef.current.getStarStats(allCards?.filter(card => card.type === 'conversation') || []).totalStarred
              })}
            </span>
          </div>
        )}
        <div className="info-row">
          <span className="label">{t('app.export.stats.content')}</span>
          <span className="value">
            {t('app.export.stats.contentDesc', {
              settings: [
                exportOptions.includeTimestamps && t('settings.exportContent.timestamps.label'),
                exportOptions.includeThinking && t('settings.exportContent.thinking.label'),
                exportOptions.includeArtifacts && t('settings.exportContent.artifacts.label'),
                exportOptions.includeTools && t('settings.exportContent.tools.label'),
                exportOptions.includeCitations && t('settings.exportContent.citations.label')
              ].filter(Boolean).join(' · ') || t('app.export.stats.basicOnly')
            })}
          </span>
        </div>
      </div>

      {/* 导出按钮 */}
      <div className="export-actions">
        <button className="btn-secondary" onClick={onClose}>
          {t('common.cancel')}
        </button>
        <button className="btn-primary" onClick={onExport}>
          {exportFormat === 'screenshot'
            ? t('app.export.previewAndExport')
            : exportFormat === 'pdf'
            ? t('app.export.exportToPDF')
            : t('app.export.exportToMarkdown')}
        </button>
      </div>
    </div>
  );
};

export default ActionPanel;
