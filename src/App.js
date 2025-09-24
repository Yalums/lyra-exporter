// App.js - 大幅简化版本
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import './styles/index.css';

// 组件导入
import WelcomePage from './components/WelcomePage';
import MessageDetail from './components/MessageDetail';
import ConversationTimeline from './components/ConversationTimeline';
import FullExportCardFilter from './components/FullExportCardFilter';
import FloatingActionButton from './components/FloatingActionButton';
import SettingsPanel from './components/SettingsManager';
import { CardGrid } from './components/UnifiedCard';

// 工具函数导入
import { ThemeUtils, StorageUtils } from './utils/commonUtils';
import { PostMessageHandler, StatsCalculator, DataProcessor } from './utils/dataManager';
import { extractChatData, detectBranches } from './utils/fileParser';
import { 
  generateFileCardUuid, 
  generateConversationCardUuid, 
  parseUuid, 
  getCurrentFileUuid,
  generateFileHash 
} from './utils/uuidManager';
import { MarkManager, getAllMarksStats } from './utils/markManager';
import { StarManager } from './utils/starManager';
import { SortManager } from './utils/sortManager';
import { SearchManager } from './utils/searchManager';

// Hooks导入
import { useFileManager } from './hooks/useFileManager';
import { useFullExportCardFilter } from './hooks/useFullExportCardFilter';

function App() {
  // ==================== Hooks和状态管理 ====================
  const { 
    files, 
    currentFile, 
    currentFileIndex, 
    processedData, 
    showTypeConflictModal,
    pendingFiles,
    fileMetadata,
    actions: fileActions 
  } = useFileManager();
  
  // 状态管理
  const [selectedMessageIndex, setSelectedMessageIndex] = useState(null);
  const [activeTab, setActiveTab] = useState('content');
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [viewMode, setViewMode] = useState('conversations');
  const [selectedFileIndex, setSelectedFileIndex] = useState(null);
  const [selectedConversationUuid, setSelectedConversationUuid] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showMessageDetail, setShowMessageDetail] = useState(false);
  const [operatedFiles, setOperatedFiles] = useState(new Set());
  const [scrollPositions, setScrollPositions] = useState({});
  const [error, setError] = useState(null);
  const [sortVersion, setSortVersion] = useState(0);
  const [markVersion, setMarkVersion] = useState(0);
  const [currentBranchState, setCurrentBranchState] = useState({
    showAllBranches: false,
    currentBranchIndexes: new Map()
  });
  const [exportOptions, setExportOptions] = useState(() => {
    const savedExportConfig = StorageUtils.getLocalStorage('export-config', {});
    return {
      scope: 'current',
      excludeDeleted: true,
      includeCompleted: false,
      includeImportant: false,
      includeTimestamps: savedExportConfig.includeTimestamps || false,
      includeThinking: savedExportConfig.includeThinking || false,
      includeArtifacts: savedExportConfig.includeArtifacts !== undefined ? savedExportConfig.includeArtifacts : true,
      includeTools: savedExportConfig.includeTools || false,
      includeCitations: savedExportConfig.includeCitations || false,
      includeAttachments: savedExportConfig.includeAttachments !== undefined ? savedExportConfig.includeAttachments : true
    };
  });
  
  // 搜索状态
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ results: [], filteredMessages: [] });
  
  const fileInputRef = useRef(null);
  const contentAreaRef = useRef(null);
  
  // 管理器实例引用
  const markManagerRef = useRef(null);
  const starManagerRef = useRef(null);
  const sortManagerRef = useRef(null);
  const searchManagerRef = useRef(null);

  // ==================== 管理器初始化 ====================
  
  // UUID管理
  const currentFileUuid = useMemo(() => {
    return getCurrentFileUuid(viewMode, selectedFileIndex, selectedConversationUuid, processedData, files);
  }, [viewMode, selectedFileIndex, selectedConversationUuid, processedData, files]);

  // 星标系统
  const shouldUseStarSystem = processedData?.format === 'claude_full_export';
  
  useEffect(() => {
    if (shouldUseStarSystem) {
      if (!starManagerRef.current) {
        starManagerRef.current = new StarManager(true);
      }
    } else {
      starManagerRef.current = null;
    }
  }, [shouldUseStarSystem]);

  useEffect(() => {
    if (currentFileUuid) {
      markManagerRef.current = new MarkManager(currentFileUuid);
    }
  }, [currentFileUuid]);

  useEffect(() => {
    if (!searchManagerRef.current) {
      searchManagerRef.current = new SearchManager();
    }
  }, []);

  // ==================== 数据计算 - 使用DataProcessor简化 ====================
  
  const rawConversations = useMemo(() => 
    DataProcessor.getRawConversations(viewMode, processedData, currentFileIndex, files),
    [viewMode, processedData, currentFileIndex, files]
  );

  const {
    filters,
    filteredConversations,
    availableProjects,
    filterStats,
    actions: filterActions
  } = useFullExportCardFilter(rawConversations, operatedFiles);

  const fileCards = useMemo(() => 
    DataProcessor.getFileCards(viewMode, processedData, files, currentFileIndex, fileMetadata),
    [files, currentFileIndex, processedData, fileMetadata, viewMode]
  );

  const allCards = useMemo(() => {
    if (viewMode === 'conversations' && processedData?.format === 'claude_full_export') {
      return [...filteredConversations];
    }
    return fileCards;
  }, [viewMode, processedData, filteredConversations, fileCards]);

  const timelineMessages = useMemo(() => 
    DataProcessor.getTimelineMessages(viewMode, selectedFileIndex, currentFileIndex, processedData, selectedConversationUuid),
    [viewMode, processedData, selectedConversationUuid, selectedFileIndex, currentFileIndex]
  );

  // 排序管理器初始化
  useEffect(() => {
    if (currentFileUuid && timelineMessages.length > 0) {
      sortManagerRef.current = new SortManager(timelineMessages, currentFileUuid);
      setSortVersion(v => v + 1);
    } else {
      sortManagerRef.current = null;
    }
  }, [currentFileUuid]);

  useEffect(() => {
    if (sortManagerRef.current && timelineMessages.length > 0 && currentFileUuid) {
      if (sortManagerRef.current.fileUuid === currentFileUuid) {
        sortManagerRef.current.updateMessages(timelineMessages);
        setSortVersion(v => v + 1);
      }
    }
  }, [timelineMessages, currentFileUuid]);

  const sortedMessages = useMemo(() => {
    if (sortManagerRef.current && viewMode === 'timeline' && timelineMessages.length > 0) {
      const sorted = sortManagerRef.current.getSortedMessages();
      if (sorted.length !== timelineMessages.length) {
        return timelineMessages;
      }
      return sorted;
    }
    return timelineMessages;
  }, [timelineMessages, viewMode, sortVersion]);

  // 搜索处理
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    if (!searchManagerRef.current) return;
    const searchTarget = viewMode === 'conversations' ? allCards : sortedMessages;
    searchManagerRef.current.searchWithDebounce(query, searchTarget, (result) => {
      setSearchResults(result);
    });
  }, [viewMode, allCards, sortedMessages]);

  const displayedItems = useMemo(() => {
    if (!searchQuery) {
      return viewMode === 'conversations' ? allCards : sortedMessages;
    }
    return searchResults.filteredMessages;
  }, [searchQuery, searchResults.filteredMessages, viewMode, allCards, sortedMessages]);

  const currentMarks = useMemo(() => {
    return markManagerRef.current ? markManagerRef.current.getMarks() : {
      completed: new Set(),
      important: new Set(),
      deleted: new Set()
    };
  }, [markVersion, currentFileUuid]);

  const hasCustomSort = useMemo(() => {
    return sortManagerRef.current ? sortManagerRef.current.hasCustomSort() : false;
  }, [sortVersion, currentFileUuid]);

  const currentConversation = useMemo(() => {
    return DataProcessor.getCurrentConversation({
      viewMode,
      selectedFileIndex,
      selectedConversationUuid,
      processedData,
      files,
      currentFileIndex,
      fileMetadata,
      starActions: starManagerRef.current
    });
  }, [viewMode, selectedFileIndex, selectedConversationUuid, processedData, files, currentFileIndex, fileMetadata]);

  const isFullExportConversationMode = viewMode === 'conversations' && processedData?.format === 'claude_full_export';

  // ==================== 事件处理函数 ====================
  
  const postMessageHandler = useMemo(() => {
    return new PostMessageHandler(fileActions, setError);
  }, [fileActions]);

  const handleFileLoad = (e) => {
    const fileList = Array.from(e.target.files);
    fileActions.loadFiles(fileList);
  };

  const handleCardSelect = useCallback((card) => {
    if (contentAreaRef.current && viewMode === 'conversations') {
      const key = currentFile ? `file-${currentFileIndex}` : 'main';
      setScrollPositions(prev => ({
        ...prev,
        [key]: contentAreaRef.current.scrollTop
      }));
    }
    
    setSelectedMessageIndex(null);
    setShowMessageDetail(false);
    setSearchQuery('');
    setSortVersion(v => v + 1);
    
    if (card.type === 'file') {
      const needsFileSwitch = card.fileIndex !== currentFileIndex;
      
      if (needsFileSwitch) {
        fileActions.switchFile(card.fileIndex);
        setTimeout(() => {
          if (card.format === 'claude_full_export' || card.fileData?.format === 'claude_full_export') {
            setViewMode('conversations');
            setSelectedFileIndex(null);
            setSelectedConversationUuid(null);
          } else {
            setSelectedFileIndex(card.fileIndex);
            setSelectedConversationUuid(null);
            setViewMode('timeline');
          }
        }, 100);
      } else {
        if (card.format === 'claude_full_export' || card.fileData?.format === 'claude_full_export') {
          setViewMode('conversations');
          setSelectedFileIndex(null);
          setSelectedConversationUuid(null);
        } else {
          setSelectedFileIndex(card.fileIndex);
          setSelectedConversationUuid(null);
          setViewMode('timeline');
        }
      }
    } else if (card.type === 'conversation') {
      const parsed = parseUuid(card.uuid);
      const fileIndex = card.fileIndex;
      const conversationUuid = parsed.conversationUuid;
      const needsFileSwitch = fileIndex !== currentFileIndex;
      
      if (needsFileSwitch) {
        fileActions.switchFile(fileIndex);
        setTimeout(() => {
          setSelectedFileIndex(fileIndex);
          setSelectedConversationUuid(conversationUuid);
          setViewMode('timeline');
        }, 100);
      } else {
        setSelectedFileIndex(fileIndex);
        setSelectedConversationUuid(conversationUuid);
        setViewMode('timeline');
      }
    }
  }, [currentFileIndex, fileActions, viewMode, currentFile]);

  const handleFileRemove = useCallback((fileIndexOrUuid) => {
    if (typeof fileIndexOrUuid === 'number') {
      fileActions.removeFile(fileIndexOrUuid);
      if (fileIndexOrUuid === currentFileIndex || fileIndexOrUuid === selectedFileIndex) {
        setViewMode('conversations');
        setSelectedFileIndex(null);
        setSelectedConversationUuid(null);
        setSortVersion(v => v + 1);
      }
      return;
    }
    
    const parsed = parseUuid(fileIndexOrUuid);
    if (parsed.fileHash) {
      const index = files.findIndex((file, idx) => {
        const hash = generateFileHash(file);
        return hash === parsed.fileHash || generateFileCardUuid(idx, file) === fileIndexOrUuid;
      });
      
      if (index !== -1) {
        fileActions.removeFile(index);
        if (index === currentFileIndex || index === selectedFileIndex) {
          setViewMode('conversations');
          setSelectedFileIndex(null);
          setSelectedConversationUuid(null);
          setSortVersion(v => v + 1);
        }
      }
    }
  }, [currentFileIndex, selectedFileIndex, files, fileActions]);

  const handleBackToConversations = () => {
    setViewMode('conversations');
    setSelectedFileIndex(null);
    setSelectedConversationUuid(null);
    setSearchQuery('');
    setSortVersion(v => v + 1);
    
    setTimeout(() => {
      if (contentAreaRef.current) {
        const key = currentFile ? `file-${currentFileIndex}` : 'main';
        const savedPosition = scrollPositions[key] || 0;
        contentAreaRef.current.scrollTop = savedPosition;
      }
    }, 0);
  };

  const handleMessageSelect = (messageIndex) => {
    setSelectedMessageIndex(messageIndex);
    setShowMessageDetail(true);
  };

  const handleMarkToggle = (messageIndex, markType) => {
    if (markManagerRef.current) {
      markManagerRef.current.toggleMark(messageIndex, markType);
      
      if (viewMode === 'timeline' && selectedFileIndex !== null) {
        const file = files[selectedFileIndex];
        if (file) {
          const fileUuid = selectedConversationUuid && processedData?.format === 'claude_full_export'
            ? generateConversationCardUuid(selectedFileIndex, selectedConversationUuid, file)
            : generateFileCardUuid(selectedFileIndex, file);
          
          setOperatedFiles(prev => new Set(prev).add(fileUuid));
        }
      }
      
      setMarkVersion(v => v + 1);
    }
  };

  const handleStarToggle = (conversationUuid, nativeIsStarred) => {
    if (starManagerRef.current) {
      starManagerRef.current.toggleStar(conversationUuid, nativeIsStarred);
      // 强制重新渲染以更新星标显示
      setSortVersion(v => v + 1);
    }
  };

  // 导出功能 - 使用exportManager中的handleExport
  const handleExportClick = async () => {
    const { handleExport } = await import('./utils/exportManager');
    const success = await handleExport({
      exportOptions,
      processedData,
      sortManagerRef,
      sortedMessages,
      markManagerRef,
      currentBranchState,
      operatedFiles,
      files,
      currentFileIndex
    });
    
    if (success) {
      setShowExportPanel(false);
    }
  };

  // 排序操作
  const sortActions = {
    enableSort: () => {
      if (sortManagerRef.current) {
        sortManagerRef.current.enableSort();
        setSortVersion(v => v + 1);
      }
    },
    resetSort: () => {
      if (sortManagerRef.current) {
        sortManagerRef.current.resetSort();
        setSortVersion(v => v + 1);
      }
    },
    moveMessage: (fromIndex, direction) => {
      if (sortManagerRef.current) {
        sortManagerRef.current.moveMessage(fromIndex, direction);
        setSortVersion(v => v + 1);
      }
    }
  };

  // 标记操作
  const markActions = {
    toggleMark: handleMarkToggle,
    isMarked: (messageIndex, markType) => {
      return markManagerRef.current ? markManagerRef.current.isMarked(messageIndex, markType) : false;
    },
    clearAllMarks: () => {
      if (markManagerRef.current) {
        markManagerRef.current.clearAllMarks();
        if (currentFileUuid) {
          setOperatedFiles(prev => {
            const newSet = new Set(prev);
            newSet.delete(currentFileUuid);
            localStorage.removeItem(`marks_${currentFileUuid}`);
            localStorage.removeItem(`message_order_${currentFileUuid}`);
            return newSet;
          });
        }
        setMarkVersion(v => v + 1);
      }
    }
  };

  const handleClearAllFilesMarks = () => {
    if (!window.confirm('确定要清除所有文件和对话的标记吗？这个操作不可恢复。')) {
      return;
    }
    
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('marks_') || key.startsWith('message_order_'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    setOperatedFiles(new Set());
    
    if (markManagerRef.current) {
      markManagerRef.current.clearAllMarks();
    }
    
    if (sortManagerRef.current) {
      sortManagerRef.current.resetSort();
    }
    
    setMarkVersion(v => v + 1);
    setSortVersion(v => v + 1);
  };

  // 获取统计 - 使用dataManager中的StatsCalculator
  const getStats = () => {
    return StatsCalculator.getStats({
      viewMode,
      allCards,
      sortedMessages,
      timelineMessages,
      files,
      markManagerRef,
      starManagerRef,
      shouldUseStarSystem,
      currentConversation,
      getAllMarksStats,
      generateFileCardUuid,
      generateConversationCardUuid,
      processedData,
      currentFileIndex
    });
  };

  const getSearchPlaceholder = () => {
    if (isFullExportConversationMode) {
      return "搜索对话标题、项目名称...";
    } else if (viewMode === 'conversations') {
      return "搜索文件名称、格式...";
    } else {
      return "搜索消息内容、思考过程、Artifacts...";
    }
  };

  const searchStats = StatsCalculator.getSearchResultStats(
    viewMode, displayedItems, allCards, sortedMessages, timelineMessages
  );

  // ==================== 副作用 ====================
  
  useEffect(() => {
    if (viewMode === 'timeline' && timelineMessages.length > 0) {
      if (window.innerWidth >= 1024 && selectedMessageIndex === null) {
        const firstMessageIndex = timelineMessages[0]?.index;
        if (firstMessageIndex !== undefined) {
          setSelectedMessageIndex(firstMessageIndex);
        }
      }
    }
  }, [viewMode, timelineMessages, selectedMessageIndex]);

  useEffect(() => {
    if (files.length > 0) {
      const operatedSet = new Set();
      
      files.forEach((file, index) => {
        const fileUuid = generateFileCardUuid(index, file);
        const marksKey = `marks_${fileUuid}`;
        const sortKey = `message_order_${fileUuid}`;
        
        if (localStorage.getItem(marksKey) || localStorage.getItem(sortKey)) {
          operatedSet.add(fileUuid);
        }
        
        if (index === currentFileIndex && processedData?.format === 'claude_full_export') {
          const conversations = processedData.views?.conversationList || [];
          conversations.forEach(conv => {
            const convUuid = generateConversationCardUuid(index, conv.uuid, file);
            const convMarksKey = `marks_${convUuid}`;
            const convSortKey = `message_order_${convUuid}`;
            
            if (localStorage.getItem(convMarksKey) || localStorage.getItem(convSortKey)) {
              operatedSet.add(convUuid);
            }
          });
        }
      });
      
      if (operatedSet.size > 0) {
        setOperatedFiles(operatedSet);
      }
    }
  }, [files, currentFileIndex, processedData]);
  
  useEffect(() => {
    ThemeUtils.applyTheme(ThemeUtils.getCurrentTheme());
  }, []);

  useEffect(() => {
    const cleanup = postMessageHandler.setup();
    return cleanup;
  }, [postMessageHandler]);

  // ==================== 渲染 ====================
  
  return (
    <div className="app-redesigned">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".json"
        onChange={handleFileLoad}
        style={{ display: 'none' }}
      />

      {files.length === 0 ? (
        <WelcomePage handleLoadClick={() => fileInputRef.current?.click()} />
      ) : (
        <>
          {/* 顶部导航栏 */}
          <nav className="navbar-redesigned">
            <div className="navbar-left">
              <div className="logo">
                <span className="logo-text">Lyra Exporter</span>
              </div>
              
              {viewMode === 'timeline' && (
                <button 
                  className="btn-secondary small"
                  onClick={handleBackToConversations}
                >
                  ← 返回对话列表
                </button>
              )}
              
              {!isFullExportConversationMode && (
                <div className="search-box">
                  <input 
                    type="text" 
                    className="search-input"
                    placeholder={getSearchPlaceholder()}
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                  {searchQuery && (
                    <div className="search-stats">
                      显示 {searchStats.displayed} / {searchStats.total} {searchStats.unit}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="navbar-right">
              <button 
                className="btn-secondary small"
                onClick={() => setShowSettingsPanel(true)}
                title="设置"
              >
                ⚙️ 设置
              </button>
              
              {isFullExportConversationMode && shouldUseStarSystem && starManagerRef.current && (
                <button 
                  className="btn-secondary small"
                  onClick={() => starManagerRef.current.clearAllStars()}
                  title="重置所有星标为原始状态"
                >
                  ⭐ 恢复原始
                </button>
              )}
            </div>
          </nav>

          {/* 主容器 */}
          <div className="main-container">
            <div className="content-area" ref={contentAreaRef}>
              {/* 统计面板 */}
              <div className="stats-panel">
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{getStats().totalMessages}</div>
                    <div className="stat-label">总消息数</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{getStats().conversationCount}</div>
                    <div className="stat-label">对话数</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{getStats().fileCount}</div>
                    <div className="stat-label">文件数</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{getStats().markedCount}</div>
                    <div className="stat-label">标记消息</div>
                  </div>
                  {isFullExportConversationMode && shouldUseStarSystem && (
                    <div className="stat-card">
                      <div className="stat-value">{getStats().starredCount}</div>
                      <div className="stat-label">星标对话</div>
                    </div>
                  )}
                </div>
              </div>

              {/* 筛选器 */}
              {isFullExportConversationMode && (
                <FullExportCardFilter
                  filters={filters}
                  availableProjects={availableProjects}
                  filterStats={filterStats}
                  onFilterChange={filterActions.setFilter}
                  onReset={filterActions.resetFilters}
                  onClearAllMarks={handleClearAllFilesMarks}
                  operatedCount={operatedFiles.size}
                />
              )}

              {/* 视图内容 */}
              <div className="view-content">
                {viewMode === 'conversations' ? (
                  <CardGrid
                    items={displayedItems}
                    selectedItem={selectedConversation}
                    starredItems={starManagerRef.current ? starManagerRef.current.getStarredConversations() : new Map()}
                    onItemSelect={handleCardSelect}
                    onItemStar={isFullExportConversationMode && shouldUseStarSystem ? handleStarToggle : null}
                    onItemRemove={handleFileRemove}
                    onAddItem={() => fileInputRef.current?.click()}
                  />
                ) : (
                  <ConversationTimeline
                    data={processedData}
                    conversation={currentConversation}
                    messages={displayedItems}
                    marks={currentMarks}
                    onMessageSelect={handleMessageSelect}
                    markActions={markActions}
                    format={processedData?.format}
                    sortActions={sortActions}
                    hasCustomSort={hasCustomSort}
                    enableSorting={true}
                    files={files}
                    currentFileIndex={currentFileIndex}
                    onFileSwitch={(index) => {
                      if (contentAreaRef.current) {
                        const key = currentFile ? `file-${currentFileIndex}` : 'main';
                        setScrollPositions(prev => ({
                          ...prev,
                          [key]: contentAreaRef.current.scrollTop
                        }));
                      }
                      
                      fileActions.switchFile(index);
                      setSelectedFileIndex(index);
                      setSelectedConversationUuid(null);
                    }}
                    searchQuery={searchQuery}
                    branchState={currentBranchState}
                    onBranchStateChange={setCurrentBranchState}
                  />
                )}
              </div>
            </div>
          </div>

          {/* 悬浮导出按钮 */}
          <FloatingActionButton 
            onClick={() => setShowExportPanel(true)}
            title="导出"
          />

          {/* 消息详情模态框 */}
          {showMessageDetail && selectedMessageIndex !== null && (
            <div className="modal-overlay" onClick={() => setShowMessageDetail(false)}>
              <div className="modal-content large" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>消息详情</h2>
                  <button className="close-btn" onClick={() => setShowMessageDetail(false)}>×</button>
                </div>
                <div className="modal-tabs">
                  <button 
                    className={`tab ${activeTab === 'content' ? 'active' : ''}`}
                    onClick={() => setActiveTab('content')}
                  >
                    内容
                  </button>
                  <button 
                    className={`tab ${activeTab === 'thinking' ? 'active' : ''}`}
                    onClick={() => setActiveTab('thinking')}
                  >
                    思考过程
                  </button>
                  <button 
                    className={`tab ${activeTab === 'artifacts' ? 'active' : ''}`}
                    onClick={() => setActiveTab('artifacts')}
                  >
                    Artifacts
                  </button>
                </div>
                <div className="modal-body">
                  <MessageDetail
                    processedData={processedData}
                    selectedMessageIndex={selectedMessageIndex}
                    activeTab={activeTab}
                    searchQuery={searchQuery}
                    format={processedData?.format}
                    onTabChange={setActiveTab}
                    showTabs={false}
                  />
                </div>
                <div className="modal-footer">
                  <button 
                    className="btn-secondary"
                    onClick={() => handleMarkToggle(selectedMessageIndex, 'completed')}
                  >
                    {markActions.isMarked(selectedMessageIndex, 'completed') ? '取消完成' : '标记完成'} ✓
                  </button>
                  <button 
                    className="btn-secondary"
                    onClick={() => handleMarkToggle(selectedMessageIndex, 'important')}
                  >
                    {markActions.isMarked(selectedMessageIndex, 'important') ? '取消重要' : '标记重要'} ⭐
                  </button>
                  <button 
                    className="btn-secondary"
                    onClick={() => handleMarkToggle(selectedMessageIndex, 'deleted')}
                  >
                    {markActions.isMarked(selectedMessageIndex, 'deleted') ? '取消删除' : '标记删除'} 🗑️
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 文件类型冲突模态框 */}
          {showTypeConflictModal && (
            <div className="modal-overlay" onClick={() => fileActions.cancelReplaceFiles()}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>文件类型冲突</h2>
                  <button className="close-btn" onClick={() => fileActions.cancelReplaceFiles()}>×</button>
                </div>
                <div className="modal-body">
                  <p>你正在尝试加载不同类型的文件。为了保证正常显示，<strong>Claude 完整导出</strong>格式不能与其他格式同时加载。</p>
                  <br />
                  <p><strong>当前文件：</strong> {files.length} 个文件</p>
                  <p><strong>新文件：</strong> {pendingFiles.length} 个文件</p>
                  <br />
                  <p>选择"替换"将关闭当前所有文件并加载新文件。</p>
                </div>
                <div className="modal-footer">
                  <button className="btn-secondary" onClick={() => fileActions.cancelReplaceFiles()}>
                    取消
                  </button>
                  <button className="btn-primary" onClick={() => fileActions.confirmReplaceFiles()}>
                    替换所有文件
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 设置面板 */}
          <SettingsPanel 
            isOpen={showSettingsPanel}
            onClose={() => setShowSettingsPanel(false)}
            exportOptions={exportOptions}
            setExportOptions={setExportOptions}
          />

          {/* 导出面板 */}
          {showExportPanel && (
            <div className="modal-overlay" onClick={() => setShowExportPanel(false)}>
              <div className="modal-content export-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>导出选项</h2>
                  <button className="close-btn" onClick={() => setShowExportPanel(false)}>×</button>
                </div>
                
                <div className="export-options">
                  <div className="option-group">
                    <h3>导出范围</h3>
                    <label className="radio-option">
                      <input 
                        type="radio" 
                        name="scope" 
                        value="current"
                        checked={exportOptions.scope === 'current'}
                        onChange={(e) => setExportOptions({...exportOptions, scope: e.target.value})}
                        disabled={viewMode !== 'timeline'}
                      />
                      <div className="option-label">
                        <span>当前时间线文件</span>
                        {viewMode === 'timeline' ? (
                          <span className="option-description">
                            仅导出当前正在查看的单个文件
                          </span>
                        ) : (
                          <span className="hint">请先进入时间线视图</span>
                        )}
                      </div>
                    </label>
                    <label className="radio-option">
                      <input 
                        type="radio" 
                        name="scope" 
                        value="currentBranch"
                        checked={exportOptions.scope === 'currentBranch'}
                        onChange={(e) => setExportOptions({...exportOptions, scope: e.target.value})}
                        disabled={viewMode !== 'timeline' || currentBranchState.showAllBranches}
                      />
                      <div className="option-label">
                        <span>当前时间线的当前分支</span>
                        {viewMode === 'timeline' ? (
                          currentBranchState.showAllBranches ? (
                            <span className="hint">显示全部分支时不可选择</span>
                          ) : (
                            <span className="option-description">
                              仅导出当前时间线中展示的分支
                            </span>
                          )
                        ) : (
                          <span className="hint">请先进入时间线视图</span>
                        )}
                      </div>
                    </label>
                    <label className="radio-option">
                      <input 
                        type="radio" 
                        name="scope" 
                        value="operated"
                        checked={exportOptions.scope === 'operated'}
                        onChange={(e) => setExportOptions({...exportOptions, scope: e.target.value})}
                        disabled={operatedFiles.size === 0}
                      />
                      <div className="option-label">
                        <span>有过操作的文件 <span className="option-count">({operatedFiles.size}个)</span></span>
                        {operatedFiles.size > 0 ? (
                          <span className="option-description">
                            导出所有进行过标记或排序操作的文件
                          </span>
                        ) : (
                          <span className="hint">请先对消息进行标记或排序</span>
                        )}
                      </div>
                    </label>
                    <label className="radio-option">
                      <input 
                        type="radio" 
                        name="scope" 
                        value="all"
                        checked={exportOptions.scope === 'all'}
                        onChange={(e) => setExportOptions({...exportOptions, scope: e.target.value})}
                      />
                      <div className="option-label">
                        <span>所有加载的文件 <span className="option-count">({files.length}个)</span></span>
                        <span className="option-description">
                          导出当前已加载的全部文件，无论是否有过操作
                        </span>
                      </div>
                    </label>
                  </div>
                  
                  <div className="option-group">
                    <h3>标记筛选</h3>
                    <label className="checkbox-option">
                      <input 
                        type="checkbox" 
                        checked={exportOptions.excludeDeleted}
                        onChange={(e) => setExportOptions({...exportOptions, excludeDeleted: e.target.checked})}
                      />
                      <div className="option-label">
                        <span>排除"已删除"标记</span>
                        <span className="option-description">
                          不导出标记为已删除的消息
                        </span>
                      </div>
                    </label>
                    <label className="checkbox-option">
                      <input 
                        type="checkbox" 
                        checked={exportOptions.includeCompleted}
                        onChange={(e) => setExportOptions({...exportOptions, includeCompleted: e.target.checked})}
                      />
                      <div className="option-label">
                        <span>仅导出"已完成"标记</span>
                        <span className="option-description">
                          只导出标记为已完成的消息
                        </span>
                      </div>
                    </label>
                    <label className="checkbox-option">
                      <input 
                        type="checkbox" 
                        checked={exportOptions.includeImportant}
                        onChange={(e) => setExportOptions({...exportOptions, includeImportant: e.target.checked})}
                      />
                      <div className="option-label">
                        <span>仅导出"重要"标记</span>
                        <span className="option-description">
                          只导出标记为重要的消息{exportOptions.includeCompleted && exportOptions.includeImportant ? '（需同时满足已完成）' : ''}
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
                
                <div className="export-info">
                  <div className="info-row">
                    <span className="label">文件统计:</span>
                    <span className="value">{files.length} 个文件，{getStats().conversationCount} 个对话，{getStats().totalMessages} 条消息</span>
                  </div>
                  <div className="info-row">
                    <span className="label">标记统计:</span>
                    <span className="value">
                      完成 {getAllMarksStats(files, processedData, currentFileIndex, generateFileCardUuid, generateConversationCardUuid).completed} · 
                      重要 {getAllMarksStats(files, processedData, currentFileIndex, generateFileCardUuid, generateConversationCardUuid).important} · 
                      删除 {getAllMarksStats(files, processedData, currentFileIndex, generateFileCardUuid, generateConversationCardUuid).deleted}
                    </span>
                  </div>
                  {isFullExportConversationMode && shouldUseStarSystem && starManagerRef.current && (
                    <div className="info-row">
                      <span className="label">星标统计:</span>
                      <span className="value">
                        {starManagerRef.current.getStarStats(allCards.filter(card => card.type === 'conversation')).totalStarred} 个星标对话
                      </span>
                    </div>
                  )}
                  <div className="info-row">
                    <span className="label">当前内容设置:</span>
                    <span className="value">
                      {[
                        exportOptions.includeTimestamps && '时间戳',
                        exportOptions.includeThinking && '思考过程', 
                        exportOptions.includeArtifacts && 'Artifacts',
                        exportOptions.includeAttachments && '附加文件',
                        exportOptions.includeTools && '工具使用',
                        exportOptions.includeCitations && '引用来源'
                      ].filter(Boolean).join(' · ') || '仅基础内容'}
                    </span>
                  </div>
                </div>
                
                <div className="modal-buttons">
                  <button className="btn-secondary" onClick={() => setShowExportPanel(false)}>
                    取消
                  </button>
                  <button className="btn-primary" onClick={handleExportClick}>
                    导出为 Markdown
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;