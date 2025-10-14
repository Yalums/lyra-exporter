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
import { useI18n } from './hooks/useI18n';

import EnhancedSearchBox from './components/EnhancedSearchBox';
import { getGlobalSearchManager } from './utils/globalSearchManager';

function App() {
  // ==================== Hooks和状态管理 ====================
  // i18n
  const { t } = useI18n();
  
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
  const [hideNavbar, setHideNavbar] = useState(false); // 新增：控制导航栏显示
  const [operatedFiles, setOperatedFiles] = useState(new Set());
  const [scrollPositions, setScrollPositions] = useState({});
  const [error, setError] = useState(null);
  const [sortVersion, setSortVersion] = useState(0);
  const [markVersion, setMarkVersion] = useState(0);
  const [renameVersion, setRenameVersion] = useState(0);
  const [starredConversations, setStarredConversations] = useState(new Map());
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
      // 同步星标状态到state
      setStarredConversations(new Map(starManagerRef.current.getStarredConversations()));
    } else {
      starManagerRef.current = null;
      setStarredConversations(new Map());
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
    [viewMode, processedData, currentFileIndex, files, renameVersion]
  );

  const {
    filters,
    filteredConversations,
    availableProjects,
    filterStats,
    actions: filterActions
  } = useFullExportCardFilter(rawConversations, operatedFiles);

  const fileCards = useMemo(() => 
    DataProcessor.getFileCards(viewMode, processedData, files, currentFileIndex, fileMetadata, t),
    [files, currentFileIndex, processedData, fileMetadata, viewMode, t, renameVersion]
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
  }, [viewMode, selectedFileIndex, selectedConversationUuid, processedData, files, currentFileIndex, fileMetadata, renameVersion]);

  const isFullExportConversationMode = viewMode === 'conversations' && processedData?.format === 'claude_full_export';

  // ==================== 事件处理函数 ====================
  
  const postMessageHandler = useMemo(() => {
    return new PostMessageHandler(fileActions, setError);
  }, [fileActions]);

  const handleFileLoad = (e) => {
    const fileList = Array.from(e.target.files);
    fileActions.loadFiles(fileList);
  };

  const handleNavigateToMessage = useCallback((navigationData) => {
    const { fileIndex, conversationUuid, messageIndex, messageId, messageUuid, highlight } = navigationData;
    
    // 记录当前文件索引，用于判断是否需要切换文件
    const needFileSwitch = fileIndex !== selectedFileIndex || fileIndex !== currentFileIndex;
    
    // 切换到时间线视图
    setViewMode('timeline');
    
    // 切换文件（如果需要）
    if (needFileSwitch) {
      // 先切换当前文件
      if (fileIndex !== currentFileIndex) {
        fileActions.switchFile(fileIndex);
      }
      setSelectedFileIndex(fileIndex);
    } else if (selectedFileIndex !== fileIndex) {
      setSelectedFileIndex(fileIndex);
    }
    
    // 设置对话UUID
    if (conversationUuid) {
      // 如果是完整导出格式，需要提取真实的对话UUID
      let realConversationUuid = conversationUuid;
      if (conversationUuid.startsWith('file-')) {
        // 从 file-xxx_uuid 格式中提取UUID
        const parts = conversationUuid.split('_');
        if (parts.length > 1) {
          realConversationUuid = parts.slice(1).join('_');
        }
      }
      setSelectedConversationUuid(realConversationUuid);
    }
    
    // 通知ConversationTimeline滚动到消息，传递messageId和messageUuid
    // 根据不同情况设置不同延迟
    let delay;
    if (needFileSwitch && fileIndex !== currentFileIndex) {
      // 需要切换文件并加载数据，需要更长延迟
      delay = 1000;
    } else if (needFileSwitch || conversationUuid !== selectedConversationUuid) {
      // 只是切换视图或对话
      delay = 600;
    } else {
      // 同一对话内导航
      delay = 300;
    }
    
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('scrollToMessage', {
        detail: { 
          messageIndex, 
          messageId, 
          messageUuid, 
          highlight,
          fileIndex,  // 添加文件索引
          conversationUuid  // 添加对话UUID
        }
      }));
    }, delay);
  }, [selectedFileIndex, currentFileIndex, selectedConversationUuid, setViewMode, setSelectedFileIndex, setSelectedConversationUuid, fileActions]);

  const handleCardSelect = useCallback((card) => {
    if (contentAreaRef.current && viewMode === 'conversations') {
      const key = currentFile ? `file-${currentFileIndex}` : 'main';
      setScrollPositions(prev => ({
        ...prev,
        [key]: contentAreaRef.current.scrollTop
      }));
    }
    
    setSelectedMessageIndex(null);
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
      const newStars = starManagerRef.current.toggleStar(conversationUuid, nativeIsStarred);
      setStarredConversations(newStars);
    }
  };
  
  const handleItemRename = (uuid, newName) => {
    // 强制刷新视图以应用重命名
    setRenameVersion(v => v + 1);
    setSortVersion(v => v + 1);
    setMarkVersion(v => v + 1);
  };

  // 导出功能 - 使用exportManager中的handleExport
  const handleExportClick = async () => {
    const { handleExport } = await import('./utils/exportManager');
    const success = await handleExport({
      exportOptions: {
        ...exportOptions,
        selectedConversationUuid // 传递当前选中的对话UUID
      },
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
    if (!window.confirm(t('app.confirmations.clearAllMarks'))) {
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
      return t('app.search.placeholder.conversations');
    } else if (viewMode === 'conversations') {
      return t('app.search.placeholder.files');
    } else {
      return t('app.search.placeholder.messages');
    }
  };

  const searchStats = StatsCalculator.getSearchResultStats(
    viewMode, displayedItems, allCards, sortedMessages, timelineMessages, t
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
        accept=".json,.jsonl"
        onChange={handleFileLoad}
        style={{ display: 'none' }}
      />

      {files.length === 0 ? (
        <WelcomePage handleLoadClick={() => fileInputRef.current?.click()} />
      ) : (
        <>
          {/* 顶部导航栏 */}
          <nav className={`navbar-redesigned ${hideNavbar ? 'hide-on-mobile' : ''}`}>
            <div className="navbar-left">
              <div className="logo">
                <span className="logo-text">Lyra Exporter</span>
              </div>
              
              {viewMode === 'timeline' && (
                <button 
                  className="btn-secondary small"
                  onClick={handleBackToConversations}
                  >
                  ← {t('app.navbar.backToList')}
                  </button>
              )}
              
              {!isFullExportConversationMode && (
                <EnhancedSearchBox
                  files={files}
                  processedData={processedData}
                  currentFileIndex={currentFileIndex}
                  onNavigateToMessage={handleNavigateToMessage}
                />
              )}
            </div>
            <div className="navbar-right">
              <button 
                className="btn-secondary small"
                onClick={() => setShowSettingsPanel(true)}
                title={t('app.navbar.settings')}
              >
                ⚙️ {t('app.navbar.settings')}
              </button>
              
              {isFullExportConversationMode && shouldUseStarSystem && starManagerRef.current && (
                <button 
                  className="btn-secondary small"
                  onClick={() => {
                    const newStars = starManagerRef.current.clearAllStars();
                    setStarredConversations(newStars);
                  }}
                  title={t('app.navbar.restoreStars')}
                >
                  ⭐ {t('app.navbar.restoreStars')}
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
                    <div className="stat-label">{t('app.stats.totalMessages')}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{getStats().conversationCount}</div>
                    <div className="stat-label">{t('app.stats.conversationCount')}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{getStats().fileCount}</div>
                    <div className="stat-label">{t('app.stats.fileCount')}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{getStats().markedCount}</div>
                    <div className="stat-label">{t('app.stats.markedCount')}</div>
                  </div>
                  {isFullExportConversationMode && shouldUseStarSystem && (
                    <div className="stat-card">
                      <div className="stat-value">{getStats().starredCount}</div>
                      <div className="stat-label">{t('app.stats.starredCount')}</div>
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
                    starredItems={starredConversations}
                    onItemSelect={handleCardSelect}
                    onItemStar={isFullExportConversationMode && shouldUseStarSystem ? handleStarToggle : null}
                    onItemRemove={handleFileRemove}
                    onItemRename={handleItemRename}
                    onAddItem={() => fileInputRef.current?.click()}
                  />
                ) : (
                  <ConversationTimeline
                    data={processedData}
                    conversation={currentConversation}
                    messages={displayedItems}
                    marks={currentMarks}
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
                    onShowSettings={() => setShowSettingsPanel(true)}
                    onHideNavbar={setHideNavbar}
                    onRename={handleItemRename}
                  />
                )}
              </div>
            </div>
          </div>

          {/* 悬浮导出按钮 */}
          <FloatingActionButton 
            onClick={() => setShowExportPanel(true)}
            title={t('app.export.button')}
          />

          {/* 文件类型冲突模态框 */}
          {showTypeConflictModal && (
            <div className="modal-overlay" onClick={() => fileActions.cancelReplaceFiles()}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{t('app.typeConflict.title')}</h2>
                  <button className="close-btn" onClick={() => fileActions.cancelReplaceFiles()}>×</button>
                </div>
                <div className="modal-body">
                  <p dangerouslySetInnerHTML={{ __html: t('app.typeConflict.message') }} />
                  <br />
                  <p><strong>{t('app.typeConflict.currentFiles', { count: files.length })}</strong></p>
                  <p><strong>{t('app.typeConflict.newFiles', { count: pendingFiles.length })}</strong></p>
                  <br />
                  <p>{t('app.typeConflict.hint')}</p>
                </div>
                <div className="modal-footer">
                  <button className="btn-secondary" onClick={() => fileActions.cancelReplaceFiles()}>
                    {t('app.typeConflict.cancel')}
                  </button>
                  <button className="btn-primary" onClick={() => fileActions.confirmReplaceFiles()}>
                    {t('app.typeConflict.replace')}
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
                  <h2>{t('app.export.title')}</h2>
                  <button className="close-btn" onClick={() => setShowExportPanel(false)}>×</button>
                </div>
                
                <div className="export-options">
                  <div className="option-group">
                    <h3>{t('app.export.scope.title')}</h3>
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
                        <span>{t('app.export.scope.current')}</span>
                        {viewMode === 'timeline' ? (
                          <span className="option-description">
                            {t('app.export.scope.currentDesc')}
                          </span>
                        ) : (
                          <span className="hint">{t('app.export.scope.hint.enterTimeline')}</span>
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
                        <span>{t('app.export.scope.currentBranch')}</span>
                        {viewMode === 'timeline' ? (
                          currentBranchState.showAllBranches ? (
                            <span className="hint">{t('app.export.scope.hint.showAllBranches')}</span>
                          ) : (
                            <span className="option-description">
                              {t('app.export.scope.currentBranchDesc')}
                            </span>
                          )
                        ) : (
                          <span className="hint">{t('app.export.scope.hint.enterTimeline')}</span>
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
                        <span>{t('app.export.scope.operated')} <span className="option-count">({operatedFiles.size}个)</span></span>
                        {operatedFiles.size > 0 ? (
                          <span className="option-description">
                            {t('app.export.scope.operatedDesc')}
                          </span>
                        ) : (
                          <span className="hint">{t('app.export.scope.hint.markFirst')}</span>
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
                        <span>{t('app.export.scope.all')} <span className="option-count">({files.length}个)</span></span>
                        <span className="option-description">
                          {t('app.export.scope.allDesc')}
                        </span>
                      </div>
                    </label>
                  </div>
                  
                  <div className="option-group">
                    <h3>{t('app.export.filters.title')}</h3>
                    <label className="checkbox-option">
                      <input 
                        type="checkbox" 
                        checked={exportOptions.excludeDeleted}
                        onChange={(e) => setExportOptions({...exportOptions, excludeDeleted: e.target.checked})}
                      />
                      <div className="option-label">
                        <span>{t('app.export.filters.excludeDeleted')}</span>
                        <span className="option-description">
                          {t('app.export.filters.excludeDeletedDesc')}
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
                        <span>{t('app.export.filters.includeCompleted')}</span>
                        <span className="option-description">
                          {t('app.export.filters.includeCompletedDesc')}
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
                        <span>{t('app.export.filters.includeImportant')}</span>
                        <span className="option-description">
                          {t('app.export.filters.includeImportantDesc')}{exportOptions.includeCompleted && exportOptions.includeImportant ? t('app.export.filters.importantAndCompleted') : ''}
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
                
                <div className="export-info">
                  <div className="info-row">
                    <span className="label">{t('app.export.stats.files')}</span>
                    <span className="value">{t('app.export.stats.filesDesc', {
                      fileCount: files.length,
                      conversationCount: getStats().conversationCount,
                      totalMessages: getStats().totalMessages
                    })}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">{t('app.export.stats.marks')}</span>
                    <span className="value">
                      {t('app.export.stats.marksDesc', {
                        completed: getAllMarksStats(files, processedData, currentFileIndex, generateFileCardUuid, generateConversationCardUuid).completed,
                        important: getAllMarksStats(files, processedData, currentFileIndex, generateFileCardUuid, generateConversationCardUuid).important,
                        deleted: getAllMarksStats(files, processedData, currentFileIndex, generateFileCardUuid, generateConversationCardUuid).deleted
                      })}
                    </span>
                  </div>
                  {isFullExportConversationMode && shouldUseStarSystem && starManagerRef.current && (
                    <div className="info-row">
                      <span className="label">{t('app.export.stats.stars')}</span>
                      <span className="value">
                        {t('app.export.stats.starsDesc', {
                          starred: starManagerRef.current.getStarStats(allCards.filter(card => card.type === 'conversation')).totalStarred
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
                
                <div className="modal-buttons">
                  <button className="btn-secondary" onClick={() => setShowExportPanel(false)}>
                    {t('common.cancel')}
                  </button>
                  <button className="btn-primary" onClick={handleExportClick}>
                    {t('app.export.exportToMarkdown')}
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