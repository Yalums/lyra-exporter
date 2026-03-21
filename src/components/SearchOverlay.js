// components/SearchOverlay.js
// Spotlight 风格全局搜索浮层

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { getGlobalSearchManager } from '../utils/globalSearchManager';
import { DateTimeUtils } from '../utils/fileParser';
import { useI18n } from '../index.js';
import StorageManager from '../utils/data/storageManager.js';

// ===== 搜索历史 =====
const SEARCH_HISTORY_KEY = 'search_history';
const MAX_HISTORY_SIZE = 20;

const getSearchHistory = () => StorageManager.get(SEARCH_HISTORY_KEY, []);

const saveSearchHistory = (history) => {
  try { StorageManager.set(SEARCH_HISTORY_KEY, history.slice(0, MAX_HISTORY_SIZE)); }
  catch (e) { /* ignore */ }
};

const addToSearchHistory = (query) => {
  if (!query?.trim()) return;
  const history = getSearchHistory();
  const filtered = history.filter(item => item.query !== query);
  filtered.unshift({ query, timestamp: Date.now() });
  saveSearchHistory(filtered);
};

const removeFromSearchHistory = (query) => {
  const history = getSearchHistory();
  const filtered = history.filter(item => item.query !== query);
  saveSearchHistory(filtered);
  return filtered;
};

// ===== 展开状态 =====
const EXPANDED_STATE_KEY = 'search_expanded';
const getExpandedState = () => new Set(StorageManager.get(EXPANDED_STATE_KEY, []));
const saveExpandedState = (set) => {
  try { StorageManager.set(EXPANDED_STATE_KEY, [...set]); }
  catch (e) { /* ignore */ }
};

// ===== 高亮关键词（支持简单 Markdown 粗体/斜体） =====
const highlightKeywords = (text, keywords) => {
  if (!text) return text;

  const renderMarkdown = (str) => {
    const parts = [];
    let lastIndex = 0;
    const mdRegex = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
    let match;
    while ((match = mdRegex.exec(str)) !== null) {
      if (match.index > lastIndex) parts.push({ type: 'text', content: str.slice(lastIndex, match.index) });
      if (match[2]) parts.push({ type: 'bold', content: match[2] });
      else if (match[3]) parts.push({ type: 'italic', content: match[3] });
      lastIndex = mdRegex.lastIndex;
    }
    if (lastIndex < str.length) parts.push({ type: 'text', content: str.slice(lastIndex) });
    return parts.length > 0 ? parts : [{ type: 'text', content: str }];
  };

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

  const mdParts = renderMarkdown(text);
  return mdParts.map((part, index) => {
    const highlighted = highlightInPart(part.content, index);
    if (part.type === 'bold') return <strong key={index} className="search-bold">{highlighted}</strong>;
    if (part.type === 'italic') return <em key={index} className="search-italic">{highlighted}</em>;
    return <span key={index}>{highlighted}</span>;
  });
};

// ===== 主组件 =====
const SearchOverlay = ({ isOpen, onClose, onNavigateToMessage, initialQuery = '' }) => {
  const { t } = useI18n();

  const [query, setQuery] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState(() => getExpandedState());
  const [searchHistory, setSearchHistory] = useState(() => getSearchHistory());

  const inputRef = useRef(null);
  const searchManagerRef = useRef(null);
  const debounceTimer = useRef(null);
  const initialSearchDone = useRef(false);

  // 每次打开时重置
  useEffect(() => {
    if (isOpen) {
      initialSearchDone.current = false;
      setSearchHistory(getSearchHistory());
    }
  }, [isOpen]);

  // 初始化搜索管理器
  useEffect(() => {
    searchManagerRef.current = getGlobalSearchManager();
  }, []);

  // 自动聚焦
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // 处理初始查询（从 EnhancedSearchBox 传入）
  useEffect(() => {
    if (isOpen && initialQuery && !initialSearchDone.current && searchManagerRef.current) {
      initialSearchDone.current = true;
      setQuery(initialQuery);
      const opts = StorageManager.get('search-options') || { removeDuplicates: true, includeThinking: true, includeArtifacts: true };
      const results = searchManagerRef.current.search(initialQuery, typeof opts === 'string' ? JSON.parse(opts) : opts, 'all');
      setSearchResults(results);
      addToSearchHistory(initialQuery);
      setSearchHistory(getSearchHistory());
    }
  }, [isOpen, initialQuery]);

  // 打开时锁住外部滚动，防止滚动穿透到 Conversation Timeline
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Esc 关闭 + 浏览器回退
  useEffect(() => {
    if (!isOpen) return;
    window.history.pushState({ loominarySearch: true }, '');
    const handlePop = () => onClose();
    const handleKey = (e) => { if (e.key === 'Escape') window.history.back(); };
    window.addEventListener('popstate', handlePop);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('popstate', handlePop);
      window.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);

  const getSearchOptions = () => {
    const stored = StorageManager.get('search-options');
    if (stored) return typeof stored === 'string' ? JSON.parse(stored) : stored;
    return { removeDuplicates: true, includeThinking: true, includeArtifacts: true };
  };

  const performSearch = useCallback((searchQuery, addHistory = false) => {
    if (!searchQuery?.trim()) { setSearchResults(null); return; }
    setIsSearching(true);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      try {
        const results = searchManagerRef.current.search(searchQuery, getSearchOptions(), 'all');
        setSearchResults(results);
        setIsSearching(false);
        if (addHistory) {
          addToSearchHistory(searchQuery);
          setSearchHistory(getSearchHistory());
        }
      } catch (e) {
        setIsSearching(false);
      }
    }, 250);
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    performSearch(val, false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      e.preventDefault();
      performSearch(query, true);
    }
  };

  const handleClear = () => {
    setQuery('');
    setSearchResults(null);
    inputRef.current?.focus();
  };

  const handleHistoryClick = (hq) => {
    setQuery(hq);
    performSearch(hq, true);
  };

  const handleDeleteHistory = (e, hq) => {
    e.stopPropagation();
    setSearchHistory(removeFromSearchHistory(hq));
  };

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

  const handleFileToggle = (fileId) => {
    const next = new Set(expandedFiles);
    next.has(fileId) ? next.delete(fileId) : next.add(fileId);
    setExpandedFiles(next);
    saveExpandedState(next);
  };

  const resultsByConversation = useMemo(() => {
    if (!searchResults?.results) return {};
    const grouped = {};
    searchResults.results.forEach(result => {
      const key = result.conversationUuid || result.fileUuid || result.fileId;
      if (!grouped[key]) {
        grouped[key] = {
          conversationName: result.conversationName || result.fileName,
          fileIndex: result.fileIndex,
          conversationUuid: result.conversationUuid,
          results: []
        };
      }
      grouped[key].results.push(result);
    });
    return grouped;
  }, [searchResults]);

  const indexStats = searchManagerRef.current?.getStats() || {};
  const hasResults = searchResults?.results?.length > 0;
  const noResults = searchResults && searchResults.results?.length === 0;
  const showResults = hasResults || noResults || isSearching;

  if (!isOpen) return null;

  return (
    <div className="so-backdrop" onClick={() => window.history.back()}>
      <div className="so-panel" onClick={e => e.stopPropagation()}>

        {/* 搜索输入行 */}
        <div className="so-input-row">
          <span className="so-search-icon">
            {isSearching
              ? <span className="so-spinner" />
              : <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
            }
          </span>
          <input
            ref={inputRef}
            className="so-input"
            placeholder={t('search.placeholderAll')}
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck="false"
          />
          {query && (
            <button className="so-clear" onClick={handleClear} tabIndex={-1}>×</button>
          )}
        </div>

        {/* 内容区 */}
        {!query ? (
          // 空状态：索引统计 + 历史记录
          (indexStats.totalMessages > 0 || searchHistory.length > 0) && (
            <div className="so-empty-state">
              {indexStats.totalMessages > 0 && (
                <p className="so-index-stats">
                  {t('search.indexStats', {
                    messages: indexStats.totalMessages,
                    files: indexStats.totalConversations
                  })}
                </p>
              )}
              {searchHistory.length > 0 && (
                <div className="so-history">
                  <span className="so-history-label">{t('search.history.title')}</span>
                  <div className="so-history-list">
                    {searchHistory.map((item, i) => (
                      <div key={i} className="so-history-item" onClick={() => handleHistoryClick(item.query)}>
                        <span className="so-history-clock">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
                            <path d="M6 3.5V6L7.5 7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                          </svg>
                        </span>
                        <span className="so-history-query">{item.query}</span>
                        <button
                          className="so-history-del"
                          onClick={e => handleDeleteHistory(e, item.query)}
                          tabIndex={-1}
                        >×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        ) : showResults ? (
          <div className="so-results">
            {isSearching ? (
              <div className="so-status">{t('nodeLocator.searching')}</div>
            ) : noResults ? (
              <div className="so-status">{t('semanticSearch.chat.noResults')}</div>
            ) : (
              <>
                <div className="so-results-meta">
                  {t('nodeLocator.resultCount', { count: searchResults.results.length })}
                </div>
                {Object.entries(resultsByConversation).map(([key, conv]) => (
                  <div key={key} className="so-group">
                    <div className="so-group-header" onClick={() => handleFileToggle(key)}>
                      <span className="so-group-arrow">{expandedFiles.has(key) ? '▾' : '▸'}</span>
                      <span className="so-group-name">{conv.conversationName}</span>
                      <span className="so-group-count">{conv.results.length}</span>
                    </div>
                    {expandedFiles.has(key) && (
                      <div className="so-group-results">
                        {conv.results.map((result, idx) => (
                          <div key={idx} className="so-result-item" onClick={() => handleResultClick(result)}>
                            <div className="so-result-meta">
                              <span className="so-result-sender">{result.message?.sender || 'unknown'}</span>
                              <span className="so-result-idx">#{result.messageIndex + 1}</span>
                              {result.message?.timestamp && (
                                <span className="so-result-time">
                                  {DateTimeUtils.formatDateTime(result.message.timestamp)}
                                </span>
                              )}
                            </div>
                            <div className="so-result-preview">
                              {highlightKeywords(
                                result.preview || result.message?.content?.slice(0, 400) || '',
                                query
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        ) : null}

      </div>
    </div>
  );
};

export default SearchOverlay;
