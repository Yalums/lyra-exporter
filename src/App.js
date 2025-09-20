import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import './styles/base.css';
import './styles/themes.css';
import './styles/UniversalTimeline.css';
import './styles/message-gfm.css';
import './styles/SettingsPanel.css';

import { useI18n } from './hooks/useI18n.js';
// 组件导入
import WelcomePage from './components/WelcomePage';
import MessageDetail from './components/MessageDetail';
import ConversationGrid from './components/ConversationCardView';
import ConversationTimeline from './components/ConversationTimeline';
import FullExportCardFilter from './components/FullExportCardFilter';
import SettingsPanel from './components/SettingsPanel';
import FloatingActionButton from './components/FloatingActionButton';

// 自定义Hooks导入
import { useFileManager } from './hooks/useFileManager';
import { useMarkSystem } from './hooks/useMarkSystem';
import { useSearch } from './hooks/useSearch';
import { useMessageSort } from './hooks/useMessageSort';
import { useFullExportCardFilter } from './hooks/useFullExportCardFilter';
import { useFileUuid, generateFileCardUuid, generateConversationCardUuid, parseUuid } from './hooks/useFileUuid';
import { useStarSystem } from './hooks/useStarSystem';

// 工具模块导入 - 消除重复代码
import { handleExport as exportHandler, DEFAULT_EXPORT_CONFIG } from './utils/exportModule';
import { createPostMessageHandler } from './utils/messageHandler';
import { getAllMarksStats, calculateViewStats, getSearchResultStats } from './utils/statsCalculator';

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
  
  // 星标系统
  const shouldUseStarSystem = processedData?.format === 'claude_full_export';
  const { starredConversations, actions: starActions } = useStarSystem(shouldUseStarSystem);
  
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
  const [exportOptions, setExportOptions] = useState({
    ...DEFAULT_EXPORT_CONFIG,
    scope: 'current',
    includeCompleted: false,
    includeImportant: false
  });
  
  const fileInputRef = useRef(null);
  const contentAreaRef = useRef(null);

  // UUID管理
  const currentFileUuid = useFileUuid(viewMode, selectedFileIndex, selectedConversationUuid, processedData, files);
  const { marks, stats, actions: markActions } = useMarkSystem(currentFileUuid);

  // ==================== 数据计算和派生状态 ====================
  
  // 原始对话列表（用于筛选）
  const rawConversations = useMemo(() => {
    if (viewMode === 'conversations' && processedData?.format === 'claude_full_export') {
      return processedData.views?.conversationList?.map(conv => ({
        type: 'conversation',
        ...conv,
        fileIndex: currentFileIndex,
        fileName: files[currentFileIndex]?.name || 'unknown',
        fileFormat: processedData.format,
        uuid: generateConversationCardUuid(currentFileIndex, conv.uuid, files[currentFileIndex]),
        is_starred: conv.is_starred || false
      })) || [];
    }
    return [];
  }, [viewMode, processedData, currentFileIndex, files]);

  // 对话筛选
  const {
    filters,
    filteredConversations,
    availableProjects,
    filterStats,
    actions: filterActions
  } = useFullExportCardFilter(rawConversations);

  // 优化：分离文件卡片和对话卡片的计算
  const fileCards = useMemo(() => {
    if (viewMode !== 'conversations' || processedData?.format === 'claude_full_export') {
      return [];
    }
    
    return files.map((file, fileIndex) => {
      const isCurrentFile = fileIndex === currentFileIndex;
      const fileData = isCurrentFile ? processedData : null;
      const metadata = fileMetadata[file.name] || {};
      
      const format = fileData?.format || metadata.format || 'unknown';
      const messageCount = fileData?.chat_history?.length || metadata.messageCount || 0;
      const conversationCount = fileData?.format === 'claude_full_export' ? 
        (fileData?.views?.conversationList?.length || 0) : 
        (metadata.conversationCount || (fileData ? 1 : 0));
      
      const model = fileData?.meta_info?.model || metadata.model || (format === 'claude' ? '' : 'Claude');
      
      return {
        type: 'file',
        uuid: generateFileCardUuid(fileIndex, file),
        name: metadata.title ? metadata.title.replace('.json', '') : file.name.replace('.json', ''),
        fileName: file.name,
        fileIndex,
        isCurrentFile,
        fileData,
        format,
        model,
        messageCount,
        conversationCount,
        created_at: metadata.created_at || (file.lastModified ? new Date(file.lastModified).toISOString() : null),
        platform: metadata.platform || 'claude',
        summary: format === 'claude_full_export' ? 
          `${conversationCount}个对话，${messageCount}条消息` :
          (format !== 'unknown' ? `${messageCount}条消息的对话` : '点击加载文件内容...')
      };
    });
  }, [files, currentFileIndex, processedData, fileMetadata, viewMode]);

  // 优化：使用分离的计算结果
  const allCards = useMemo(() => {
    if (viewMode === 'conversations' && processedData?.format === 'claude_full_export') {
      return [...filteredConversations];
    }
    return fileCards;
  }, [viewMode, processedData, filteredConversations, fileCards]);

  // 搜索目标数据
  const searchTarget = useMemo(() => {
    if (viewMode === 'conversations') {
      return allCards;
    } else if (viewMode === 'timeline' && selectedFileIndex !== null) {
      if (selectedFileIndex === currentFileIndex && processedData) {
        if (processedData.format === 'claude_full_export' && selectedConversationUuid) {
          return processedData.chat_history?.filter(msg => 
            msg.conversation_uuid === selectedConversationUuid && !msg.is_conversation_header
          ) || [];
        } else {
          return processedData.chat_history || [];
        }
      }
    }
    return [];
  }, [viewMode, allCards, selectedConversationUuid, selectedFileIndex, currentFileIndex, processedData]);

  const { query, filteredMessages, actions: searchActions } = useSearch(searchTarget);

  // 时间线消息
  const timelineMessages = useMemo(() => {
    if (viewMode === 'timeline' && selectedFileIndex !== null) {
      if (selectedFileIndex === currentFileIndex && processedData) {
        if (processedData.format === 'claude_full_export' && selectedConversationUuid) {
          return processedData.chat_history?.filter(msg => 
            msg.conversation_uuid === selectedConversationUuid && !msg.is_conversation_header
          ) || [];
        } else {
          return processedData.chat_history || [];
        }
      }
    }
    return [];
  }, [viewMode, selectedFileIndex, currentFileIndex, processedData, selectedConversationUuid]);

  const { sortedMessages, hasCustomSort, actions: sortActions } = useMessageSort(
    timelineMessages, 
    currentFileUuid
  );

  // 当前对话信息
  const currentConversation = useMemo(() => {
    if (viewMode === 'timeline' && selectedFileIndex !== null) {
      if (selectedConversationUuid && processedData?.format === 'claude_full_export') {
        const conversation = processedData.views?.conversationList?.find(
          conv => conv.uuid === selectedConversationUuid
        );
        if (conversation && files[selectedFileIndex]) {
          const convUuid = generateConversationCardUuid(selectedFileIndex, conversation.uuid, files[selectedFileIndex]);
          return {
            ...conversation,
            uuid: convUuid,
            is_starred: shouldUseStarSystem ? 
              starActions.isStarred(convUuid, conversation.is_starred) :
              conversation.is_starred
          };
        }
        return null;
      } else {
        const file = files[selectedFileIndex];
        if (file) {
          const metadata = fileMetadata[file.name] || {};
          const isCurrentFile = selectedFileIndex === currentFileIndex;
          const fileData = isCurrentFile ? processedData : null;
          
          return {
            type: 'file',
            uuid: generateFileCardUuid(selectedFileIndex, file),
            name: fileData?.meta_info?.title || metadata.title || file.name.replace('.json', ''),
            fileName: file.name,
            fileIndex: selectedFileIndex,
            isCurrentFile,
            format: fileData?.format || metadata.format || 'unknown',
            model: fileData?.meta_info?.model || metadata.model || '',
            messageCount: fileData?.chat_history?.length || metadata.messageCount || 0,
            created_at: metadata.created_at || (file.lastModified ? new Date(file.lastModified).toISOString() : null),
            platform: metadata.platform || 'claude'
          };
        }
      }
    }
    return null;
  }, [viewMode, selectedFileIndex, selectedConversationUuid, processedData, files, currentFileIndex, fileMetadata, starActions, shouldUseStarSystem]);

  const isFullExportConversationMode = viewMode === 'conversations' && processedData?.format === 'claude_full_export';

  // ==================== 事件处理函数 ====================
  
  // 使用消息处理器模块
  const handlePostMessage = useCallback(
    createPostMessageHandler(fileActions, setError),
    [fileActions]
  );

  const handleFileLoad = (e) => {
    const fileList = Array.from(e.target.files);
    fileActions.loadFiles(fileList);
  };

  const handleCardSelect = (card) => {
    // 保存滚动位置
    if (contentAreaRef.current && viewMode === 'conversations') {
      const key = currentFile ? `file-${currentFileIndex}` : 'main';
      setScrollPositions(prev => ({
        ...prev,
        [key]: contentAreaRef.current.scrollTop
      }));
    }
    
    if (card.type === 'file') {
      if (card.fileIndex !== currentFileIndex) {
        fileActions.switchFile(card.fileIndex);
      }
      
      if (card.fileData?.format === 'claude_full_export') {
        setViewMode('conversations');
        setSelectedFileIndex(null);
        setSelectedConversationUuid(null);
      } else {
        setSelectedFileIndex(card.fileIndex);
        setSelectedConversationUuid(null);
        setViewMode('timeline');
      }
    } else if (card.type === 'conversation') {
      const parsed = parseUuid(card.uuid);
      const fileIndex = card.fileIndex;
      const conversationUuid = parsed.conversationUuid;
      
      setSelectedFileIndex(fileIndex);
      setSelectedConversationUuid(conversationUuid);
      setViewMode('timeline');
      
      if (fileIndex !== currentFileIndex) {
        fileActions.switchFile(fileIndex);
      }
    }
  };

  const handleFileRemove = (fileIndex) => {
    fileActions.removeFile(fileIndex);
    
    if (fileIndex === currentFileIndex || fileIndex === selectedFileIndex) {
      setViewMode('conversations');
      setSelectedFileIndex(null);
      setSelectedConversationUuid(null);
    }
  };

  const handleBackToConversations = () => {
    setViewMode('conversations');
    setSelectedFileIndex(null);
    setSelectedConversationUuid(null);
    
    // 恢复滚动位置
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

  // 修复：标记消息时正确记录operatedFiles
  const handleMarkToggle = (messageIndex, markType) => {
    markActions.toggleMark(messageIndex, markType);
    
    // 修复：确保在时间线模式下正确记录操作的文件
    if (viewMode === 'timeline' && selectedFileIndex !== null) {
      const file = files[selectedFileIndex];
      if (file) {
        const fileUuid = selectedConversationUuid && processedData?.format === 'claude_full_export'
          ? generateConversationCardUuid(selectedFileIndex, selectedConversationUuid, file)
          : generateFileCardUuid(selectedFileIndex, file);
        
        setOperatedFiles(prev => new Set(prev).add(fileUuid));
      }
    }
  };

  const handleStarToggle = (conversationUuid, nativeIsStarred) => {
    starActions.toggleStar(conversationUuid, nativeIsStarred);
  };

  // 导出功能 - 简化版
  const handleExport = async () => {
    const success = await exportHandler(
      exportOptions,
      viewMode,
      processedData,
      currentFile,
      sortedMessages,
      hasCustomSort,
      marks,
      operatedFiles,
      files,
      currentFileIndex
    );
    
    if (success) {
      setShowExportPanel(false);
    }
  };

  // ==================== 工具函数 ====================
  
  // 使用统计计算模块
  const getStats = () => {
    const allMarksStats = getAllMarksStats(files, processedData, currentFileIndex);
    return calculateViewStats(
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
    );
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

  const searchStats = getSearchResultStats(viewMode, filteredMessages, allCards, sortedMessages, timelineMessages);

  // ==================== 副作用 ====================
  
  // 初始化时扫描已有操作记录
  useEffect(() => {
    if (files.length > 0) {
      const operatedSet = new Set();
      
      // 扫描所有文件的操作记录
      files.forEach((file, index) => {
        // 检查普通文件的操作记录
        const fileUuid = generateFileCardUuid(index, file);
        const marksKey = `marks_${fileUuid}`;
        const sortKey = `message_order_${fileUuid}`;
        
        if (localStorage.getItem(marksKey) || localStorage.getItem(sortKey)) {
          operatedSet.add(fileUuid);
        }
        
        // 如果是完整导出格式，检查每个对话
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
  
  // 主题初始化
  useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    if (window.updatePWAThemeColor) {
      setTimeout(() => window.updatePWAThemeColor(), 100);
    }
  }, []);

  // postMessage监听器
  useEffect(() => {
    window.addEventListener('message', handlePostMessage);
    return () => window.removeEventListener('message', handlePostMessage);
  }, [handlePostMessage]);

  // 文件自动切换视图
  useEffect(() => {
    if (files.length > 0 && processedData && !error) {
      const latestFile = files[files.length - 1];
      
      if (viewMode === 'conversations' && 
          currentFileIndex === files.length - 1 &&
          (latestFile.name.includes('claude_') || latestFile.name.includes('_export_'))) {
        
        if (processedData.format !== 'claude_full_export') {
          setSelectedFileIndex(files.length - 1);
          setSelectedConversationUuid(null);
          setViewMode('timeline');
        }
      }
    }
  }, [files.length, currentFileIndex, error, files, processedData, viewMode]);

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
              
              {viewMode === 'timeline'  && (
                <button 
                  className="btn-secondary small"
                  onClick={handleBackToConversations}
                >
                  ← 返回对话列表
                </button>
              )}
              
              {!isFullExportConversationMode && (
                <div className="search-box">
                  <span className="search-icon">🔍</span>
                  <input 
                    type="text" 
                    className="search-input"
                    placeholder={getSearchPlaceholder()}
                    value={query}
                    onChange={(e) => searchActions.search(e.target.value)}
                  />
                  {query && (
                    <div className="search-stats">
                      显示 {searchStats.displayed} / {searchStats.total} {searchStats.unit}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="navbar-right">
              {/* 设置按钮替代原来的导出按钮 */}
              <button 
                className="btn-secondary small"
                onClick={() => setShowSettingsPanel(true)}
                title="设置"
              >
                ⚙️ 设置
              </button>
              
              {isFullExportConversationMode && shouldUseStarSystem && (
                <button 
                  className="btn-secondary small"
                  onClick={() => starActions.clearAllStars()}
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
                />
              )}

              {/* 视图内容 */}
              <div className="view-content">
                {viewMode === 'conversations' ? (
                  <ConversationGrid
                    items={query ? filteredMessages : allCards}
                    viewType="grid"
                    onItemSelect={handleCardSelect}
                    onItemRemove={handleFileRemove}
                    onAddItem={() => fileInputRef.current?.click()}
                    selectedItem={selectedConversation}
                    onStarToggle={isFullExportConversationMode && shouldUseStarSystem ? handleStarToggle : null}
                    starredItems={shouldUseStarSystem ? starredConversations : new Map()}
                    showFileManagement={true}
                    className=""
                  />
                ) : (
                  <ConversationTimeline
                    data={processedData}
                    conversation={currentConversation}
                    messages={hasCustomSort && sortedMessages.length > 0 ? 
                      (query ? filteredMessages : sortedMessages) : 
                      (query ? filteredMessages : timelineMessages)
                    }
                    marks={marks}
                    onMessageSelect={handleMessageSelect}
                    markActions={{
                      ...markActions,
                      toggleMark: (messageIndex, markType) => {
                        markActions.toggleMark(messageIndex, markType);
                        // 记录操作的文件
                        if (selectedFileIndex !== null && files[selectedFileIndex]) {
                          const file = files[selectedFileIndex];
                          const fileUuid = selectedConversationUuid && processedData?.format === 'claude_full_export'
                            ? generateConversationCardUuid(selectedFileIndex, selectedConversationUuid, file)
                            : generateFileCardUuid(selectedFileIndex, file);
                          
                          setOperatedFiles(prev => {
                            const newSet = new Set(prev);
                            newSet.add(fileUuid);
                            return newSet;
                          });
                        }
                      }
                    }}
                    format={processedData?.format}
                    sortActions={{
                      ...sortActions,
                      moveMessage: (index, direction) => {
                        sortActions.moveMessage(index, direction);
                        // 修复：排序时也记录操作的文件
                        if (viewMode === 'timeline' && selectedFileIndex !== null) {
                          const file = files[selectedFileIndex];
                          if (file) {
                            const fileUuid = selectedConversationUuid && processedData?.format === 'claude_full_export'
                              ? generateConversationCardUuid(selectedFileIndex, selectedConversationUuid, file)
                              : generateFileCardUuid(selectedFileIndex, file);
                            
                            setOperatedFiles(prev => new Set(prev).add(fileUuid));
                          }
                        }
                      }
                    }}
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
                    searchQuery={query}
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
                    searchQuery={query}
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
                    {markActions.isMarked(selectedMessageIndex, 'completed') ? '取消完成' : '标记完成'} ✔
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
                  
                  <div className="option-group">
                    <h3>导出内容</h3>
                    <label className="checkbox-option">
                      <input 
                        type="checkbox" 
                        checked={exportOptions.includeTimestamps}
                        onChange={(e) => setExportOptions({...exportOptions, includeTimestamps: e.target.checked})}
                      />
                      <div className="option-label">
                        <span>时间戳</span>
                        <span className="option-description">包含消息的发送时间</span>
                      </div>
                    </label>
                    <label className="checkbox-option">
                      <input 
                        type="checkbox" 
                        checked={exportOptions.includeThinking}
                        onChange={(e) => setExportOptions({...exportOptions, includeThinking: e.target.checked})}
                      />
                      <div className="option-label">
                        <span>思考过程</span>
                        <span className="option-description">Claude 的内部思考过程</span>
                      </div>
                    </label>
                    <label className="checkbox-option">
                      <input 
                        type="checkbox" 
                        checked={exportOptions.includeArtifacts}
                        onChange={(e) => setExportOptions({...exportOptions, includeArtifacts: e.target.checked})}
                      />
                      <div className="option-label">
                        <span>Artifacts</span>
                        <span className="option-description">代码、文档等生成内容</span>
                      </div>
                    </label>
                    <label className="checkbox-option">
                      <input 
                        type="checkbox" 
                        checked={exportOptions.includeTools}
                        onChange={(e) => setExportOptions({...exportOptions, includeTools: e.target.checked})}
                      />
                      <div className="option-label">
                        <span>工具使用</span>
                        <span className="option-description">搜索、计算等工具调用记录</span>
                      </div>
                    </label>
                    <label className="checkbox-option">
                      <input 
                        type="checkbox" 
                        checked={exportOptions.includeCitations}
                        onChange={(e) => setExportOptions({...exportOptions, includeCitations: e.target.checked})}
                      />
                      <div className="option-label">
                        <span>引用来源</span>
                        <span className="option-description">网页链接等引用信息</span>
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
                      完成 {getAllMarksStats(files, processedData, currentFileIndex).completed} · 
                      重要 {getAllMarksStats(files, processedData, currentFileIndex).important} · 
                      删除 {getAllMarksStats(files, processedData, currentFileIndex).deleted}
                    </span>
                  </div>
                  {isFullExportConversationMode && shouldUseStarSystem && (
                    <div className="info-row">
                      <span className="label">星标统计:</span>
                      <span className="value">
                        {starActions.getStarStats(allCards.filter(card => card.type === 'conversation')).totalStarred} 个星标对话
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="modal-buttons">
                  <button className="btn-secondary" onClick={() => setShowExportPanel(false)}>
                    取消
                  </button>
                  <button className="btn-primary" onClick={handleExport}>
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