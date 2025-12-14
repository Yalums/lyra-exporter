// components/MobileGlobalSearchPanel.js
// 移动端全局搜索面板 - 全屏模态框样式

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getGlobalSearchManager } from '../utils/globalSearchManager';
import { getRenameManager } from '../utils/renameManager';
import { useI18n } from '../index.js';

/**
 * 移动端全局搜索面板组件
 */
export default function MobileGlobalSearchPanel({
  isOpen,
  onClose,
  files,
  processedData,
  currentFileIndex,
  onNavigateToMessage
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  const searchInputRef = useRef(null);
  const searchManagerRef = useRef(null);
  const debounceTimer = useRef(null);
  const panelRef = useRef(null);

  // 手势支持
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // 从 localStorage 读取搜索选项
  const getSearchOptions = () => {
    const stored = localStorage.getItem('search-options');
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

  // 构建索引（当文件变化时）
  useEffect(() => {
    if (files.length > 0 && processedData && searchManagerRef.current) {
      console.log('[MobileGlobalSearchPanel] 重建搜索索引...');

      const renameManager = getRenameManager();
      const customNames = renameManager.getAllRenames();

      searchManagerRef.current.buildGlobalIndex(files, processedData, currentFileIndex, customNames)
        .then(() => {
          console.log('[MobileGlobalSearchPanel] 索引构建完成');
          if (query) {
            performSearch(query);
          }
        })
        .catch(error => {
          console.error('[MobileGlobalSearchPanel] 索引构建失败:', error);
        });
    }
  }, [files, processedData, currentFileIndex]);

  // 浏览器回退支持
  useEffect(() => {
    if (!isOpen) return;

    // 添加 history 记录
    window.history.pushState({ view: 'mobile-global-search' }, '');

    const handlePopState = () => {
      // 无论 event.state 是什么，只要触发了 popstate 就关闭面板
      onClose();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, onClose]);

  // 处理返回按钮点击
  const handleBackClick = () => {
    // 先尝试 history.back()，如果没有历史记录则直接关闭
    if (window.history.length > 1) {
      window.history.back();
    } else {
      onClose();
    }
  };

  // 自动聚焦搜索框
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current.focus();
      }, 100);
    }
  }, [isOpen]);

  // 手势支持
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    // 同时记录 X 和 Y 坐标
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const onTouchMove = (e) => {
    // 同时记录 X 和 Y 坐标
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;

    // 计算绝对距离
    const absDistanceX = Math.abs(distanceX);
    const absDistanceY = Math.abs(distanceY);

    // 只有当水平移动距离 > 垂直移动距离，且水平移动距离 > 阈值时，才判定为水平滑动
    const isHorizontalSwipe = absDistanceX > absDistanceY && absDistanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;

    // 右滑关闭面板（需要满足水平滑动条件）
    if (isHorizontalSwipe && isRightSwipe) {
      window.history.back();
    }
  };

  // 执行搜索
  const performSearch = useCallback((searchQuery) => {
    if (!searchQuery || !searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    setIsSearching(true);

    // 防抖处理
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      try {
        const currentOptions = getSearchOptions();
        const results = searchManagerRef.current.search(searchQuery, currentOptions, 'all');
        setSearchResults(results);
        setIsSearching(false);

        console.log(`[MobileGlobalSearchPanel] 搜索完成: ${results.results.length} 个结果`);
      } catch (error) {
        console.error('[MobileGlobalSearchPanel] 搜索错误:', error);
        setIsSearching(false);
      }
    }, 300);
  }, []);

  // 处理输入变化
  const handleInputChange = (e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    performSearch(newQuery);
  };

  // 处理结果点击
  const handleResultClick = (result) => {
    console.log('[MobileGlobalSearchPanel] 导航到消息:', result);

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

  if (!isOpen) return null;

  const stats = searchManagerRef.current?.getStats() || {};

  return (
    <div className="mobile-search-overlay" onClick={onClose}>
      <div
        className="mobile-search-panel"
        onClick={e => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        ref={panelRef}
      >
        {/* 头部 */}
        <div className="mobile-search-header">
          <button className="back-btn" onClick={handleBackClick}>
            ←
          </button>
          <div className="search-input-wrapper">
            <input
              ref={searchInputRef}
              type="text"
              className="mobile-search-input"
              placeholder={t('search.placeholderAll')}
              value={query}
              onChange={handleInputChange}
            />
            {query && (
              <button className="clear-btn" onClick={handleClear}>
                ×
              </button>
            )}
          </div>
        </div>

        {/* 搜索结果 */}
        <div className="mobile-search-results">
          {isSearching ? (
            <div className="search-loading">
              <div className="loading-spinner"></div>
              <p>{t('nodeLocator.searching')}</p>
            </div>
          ) : !query ? (
            <div className="search-placeholder">
              <p>{t('search.placeholderAll')}</p>
              {stats.totalMessages > 0 && (
                <p className="search-stats">
                  {t('search.indexStats', {
                    messages: stats.totalMessages,
                    files: stats.totalConversations
                  })}
                </p>
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
              {searchResults.results.map((result, index) => (
                <div
                  key={index}
                  className="result-item"
                  onClick={() => handleResultClick(result)}
                >
                  <div className="result-header">
                    <span className="result-conversation">
                      {result.conversationName}
                    </span>
                  </div>
                  <div className="result-content">
                    <span className="result-sender">{result.message?.sender || 'unknown'}:</span>
                    <span className="result-text">
                      {result.preview || result.message?.content?.slice(0, 200) || ''}
                    </span>
                  </div>
                  {result.message?.timestamp && (
                    <div className="result-meta">
                      <span className="result-time">
                        {new Date(result.message.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
