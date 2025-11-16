// components/EnhancedSearchBox.js
// 增强搜索框 - 整合全局搜索和节点定位功能

import React, { useState, useRef, useEffect, useCallback } from 'react';
import NodeLocatorPanel from './NodeLocatorPanel';
import { getGlobalSearchManager } from '../utils/globalSearchManager';
import { getRenameManager } from '../utils/renameManager';
import { useI18n } from '../index.js';

/**
 * 增强搜索框组件
 */
export default function EnhancedSearchBox({
  files,
  processedData,
  currentFileIndex,
  onNavigateToMessage,
  className = ''
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [showNodePanel, setShowNodePanel] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  
  const searchInputRef = useRef(null);
  const searchManagerRef = useRef(null);
  const debounceTimer = useRef(null);
  
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
      console.log('[EnhancedSearchBox] 重建搜索索引...');
      
      // 获取用户自定义名称
      const renameManager = getRenameManager();
      const customNames = renameManager.getAllRenames();
      console.log(`[EnhancedSearchBox] 加载了 ${Object.keys(customNames).length} 个自定义名称`);
      
      // buildGlobalIndex 现在是异步的，并且支持自定义名称
      searchManagerRef.current.buildGlobalIndex(files, processedData, currentFileIndex, customNames)
        .then(() => {
          console.log('[EnhancedSearchBox] 索引构建完成');
          // 如果有查询，重新搜索
          if (query) {
            performSearch(query);
          }
        })
        .catch(error => {
          console.error('[EnhancedSearchBox] 索引构建失败:', error);
        });
    }
  }, [files, processedData, currentFileIndex]);
  
  // 执行搜索
  const performSearch = useCallback((searchQuery) => {
    if (!searchQuery || !searchQuery.trim()) {
      setSearchResults(null);
      setShowNodePanel(false);
      return;
    }
    
    setIsSearching(true);
    
    // 防抖处理
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      try {
        // 固定使用 'all' 模式搜索，并从 localStorage 读取选项
        const currentOptions = getSearchOptions();
        const results = searchManagerRef.current.search(searchQuery, currentOptions, 'all');
        setSearchResults(results);
        setShowNodePanel(true);
        setIsSearching(false);
        
        console.log(`[EnhancedSearchBox] 搜索完成: ${results.results.length} 个结果`);
      } catch (error) {
        console.error('[EnhancedSearchBox] 搜索错误:', error);
        setIsSearching(false);
      }
    }, 300);
  }, []); // 移除 searchOptions 依赖
  
  // 处理输入变化
  const handleInputChange = (e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    performSearch(newQuery);
  };
  
  // 处理节点点击（导航到消息）
  const handleNodeClick = (nodeData) => {
    console.log('[EnhancedSearchBox] 导航到消息:', nodeData);
    
    if (onNavigateToMessage) {
      onNavigateToMessage({
        fileIndex: nodeData.fileIndex,
        conversationUuid: nodeData.conversationUuid,
        messageIndex: nodeData.messageIndex,
        messageId: nodeData.messageId,
        messageUuid: nodeData.messageUuid, // 添加messageUuid
        highlight: true
      });
    }
  };
  
  // 处理快捷键
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ctrl/Cmd + G 聚焦搜索框
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setShowNodePanel(true);
      }
      
      // Escape 关闭面板
      if (e.key === 'Escape' && showNodePanel) {
        setShowNodePanel(false);
        searchInputRef.current?.blur();
      }
      
      // Enter 跳转到第一个结果
      if (e.key === 'Enter' && searchResults?.results.length > 0 && showNodePanel) {
        handleNodeClick(searchResults.results[0]);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showNodePanel, searchResults]);
  
  // 获取索引统计
  const indexStats = searchManagerRef.current?.getStats() || {};
  
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
            onChange={handleInputChange}
            onFocus={() => {
              if (query) {
                setShowNodePanel(true);
              }
            }}
            style={{paddingLeft: '16px'}}
          />
          
          {query && (
            <button 
              className="clear-btn"
              onClick={() => {
                setQuery('');
                setSearchResults(null);
                setShowNodePanel(false);
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>
      
      {showNodePanel && (
        <NodeLocatorPanel
          searchResults={searchResults}
          onNodeClick={handleNodeClick}
          onClose={() => setShowNodePanel(false)}
          isLoading={isSearching}
        />
      )}
    </div>
  );
}