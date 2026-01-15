// components/EnhancedSearchBox.js
// 简化搜索框 - 回车打开ActionPanel

import React, { useState, useRef, useEffect } from 'react';
import { useI18n } from '../index.js';

/**
 * 简化搜索框组件 - 输入后回车打开ActionPanel
 */
export default function EnhancedSearchBox({
  onSearch,
  onExpand,
  className = ''
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const searchInputRef = useRef(null);

  // 处理回车键
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      e.preventDefault();
      onSearch?.(query.trim());
      // 不再清空输入框，保留搜索内容
    }
  };

  // 处理展开按钮点击
  const handleExpand = () => {
    onExpand?.(query.trim());
  };

  // 处理快捷键 Ctrl/Cmd + G 聚焦搜索框
  useEffect(() => {
    const handleKeyPress = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div className={`enhanced-search-box ${className}`}>
      <div className="search-container">
        <div className="search-input-group">
          <input
            ref={searchInputRef}
            type="text"
            className="search-input"
            placeholder={t('search.placeholderAll')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ paddingLeft: '16px' }}
          />
          {query && (
            <>
              <button
                className="expand-btn"
                onClick={handleExpand}
                title={t('search.expandPanel')}
              >
                
              </button>
              <button
                className="clear-btn"
                onClick={() => setQuery('')}
              >
                ×
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
