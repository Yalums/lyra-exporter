// App.js - 修复数据同步问题版本
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import './styles/base.css';
import './styles/themes.css';
import './styles/UniversalTimeline.css';
import './styles/message-gfm.css';
import './styles/SettingsPanel.css';
import './styles/BranchSwitcher.css';

// 组件导入
import WelcomePage from './components/WelcomePage';
import MessageDetail from './components/MessageDetail';
import ConversationTimeline from './components/ConversationTimeline';
import FullExportCardFilter from './components/FullExportCardFilter';
import FloatingActionButton from './components/FloatingActionButton';
import SettingsPanel from './components/SettingsManager';
import { CardGrid } from './components/UnifiedCard';

// 工具函数导入
import { DateTimeUtils, PlatformUtils, ThemeUtils, StorageUtils  } from './utils/commonUtils';
import { copyMessage } from './utils/copyManager';
import { PostMessageHandler, StatsCalculator } from './utils/dataManager';
import { extractChatData, detectBranches } from './utils/fileParser';

// 新的工具模块导入
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

// 保留的Hooks导入
import { useFileManager } from './hooks/useFileManager';
import { useFullExportCardFilter } from './hooks/useFullExportCardFilter';

// 调试开关
const DEBUG = true;
const debugLog = (category, message, data) => {
  if (DEBUG) {
    console.log(`[${category}] ${message}`, data || '');
  }
};

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
      includeCitations: savedExportConfig.includeCitations || false
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

  // ==================== 调试日志 ====================
  
  // 监控关键状态变化
  useEffect(() => {
    debugLog('STATE_CHANGE', 'View Mode Changed', {
      viewMode,
      selectedFileIndex,
      currentFileIndex,
      selectedConversationUuid,
      processedDataFormat: processedData?.format,
      hasProcessedData: !!processedData
    });
  }, [viewMode, selectedFileIndex, currentFileIndex, selectedConversationUuid, processedData]);

  useEffect(() => {
    debugLog('DATA_CHANGE', 'ProcessedData Updated', {
      format: processedData?.format,
      messagesCount: processedData?.chat_history?.length,
      currentFileIndex,
      selectedFileIndex,
      selectedConversationUuid
    });
  }, [processedData]);

  // ==================== 管理器初始化 ====================
  
  // UUID管理
  const currentFileUuid = useMemo(() => {
    const uuid = getCurrentFileUuid(viewMode, selectedFileIndex, selectedConversationUuid, processedData, files);
    debugLog('UUID', 'Current File UUID', { uuid, viewMode, selectedFileIndex, selectedConversationUuid });
    return uuid;
  }, [viewMode, selectedFileIndex, selectedConversationUuid, processedData, files]);

  // 星标系统（仅claude_full_export格式）
  const shouldUseStarSystem = processedData?.format === 'claude_full_export';
  
  // 初始化星标管理器
  useEffect(() => {
    if (shouldUseStarSystem) {
      if (!starManagerRef.current) {
        starManagerRef.current = new StarManager(true);
        debugLog('STAR_MANAGER', 'Initialized', { shouldUseStarSystem });
      }
    } else {
      starManagerRef.current = null;
    }
  }, [shouldUseStarSystem]);

  // 初始化标记管理器
  useEffect(() => {
    if (currentFileUuid) {
      markManagerRef.current = new MarkManager(currentFileUuid);
      debugLog('MARK_MANAGER', 'Initialized', { currentFileUuid });
    }
  }, [currentFileUuid]);

  // 初始化搜索管理器
  useEffect(() => {
    if (!searchManagerRef.current) {
      searchManagerRef.current = new SearchManager();
      debugLog('SEARCH_MANAGER', 'Initialized');
    }
  }, []);

  // ==================== 数据计算和派生状态 ====================
  
  // 原始对话列表（用于筛选）
  const rawConversations = useMemo(() => {
    if (viewMode === 'conversations' && processedData?.format === 'claude_full_export') {
      const conversations = processedData.views?.conversationList?.map(conv => ({
        type: 'conversation',
        ...conv,
        fileIndex: currentFileIndex,
        fileName: files[currentFileIndex]?.name || 'unknown',
        fileFormat: processedData.format,
        uuid: generateConversationCardUuid(currentFileIndex, conv.uuid, files[currentFileIndex]),
        is_starred: conv.is_starred || false
      })) || [];
      
      debugLog('CONVERSATIONS', 'Raw Conversations Generated', { 
        count: conversations.length,
        firstConv: conversations[0]
      });
      
      return conversations;
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

  // 文件卡片数据
  const fileCards = useMemo(() => {
    if (viewMode !== 'conversations' || processedData?.format === 'claude_full_export') {
      return [];
    }
    
    const cards = files.map((file, fileIndex) => {
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
          (format !== 'unknown' ? `${messageCount}条消息的对话` : '点击加载文件内容...'),
        size: file.size
      };
    });
    
    debugLog('FILE_CARDS', 'Generated', { count: cards.length });
    return cards;
  }, [files, currentFileIndex, processedData, fileMetadata, viewMode]);

  // 所有卡片数据
  const allCards = useMemo(() => {
    if (viewMode === 'conversations' && processedData?.format === 'claude_full_export') {
      return [...filteredConversations];
    }
    return fileCards;
  }, [viewMode, processedData, filteredConversations, fileCards]);

  // 时间线消息 - 核心修复：确保数据同步
  const timelineMessages = useMemo(() => {
    // 只在timeline模式下计算消息
    if (viewMode !== 'timeline') {
      debugLog('TIMELINE_MESSAGES', 'Not in timeline mode', { viewMode });
      return [];
    }
    
    // 确保使用正确的数据源
    // 关键修复：确保selectedFileIndex和currentFileIndex同步
    const dataSource = (selectedFileIndex !== null && selectedFileIndex === currentFileIndex) 
      ? processedData 
      : null;
    
    if (!dataSource) {
      debugLog('TIMELINE_MESSAGES', 'No valid data source', { 
        currentFileIndex,
        selectedFileIndex,
        hasProcessedData: !!processedData,
        dataSync: selectedFileIndex === currentFileIndex
      });
      return [];
    }
    
    // 对于claude_full_export格式，需要过滤特定对话
    if (dataSource.format === 'claude_full_export' && selectedConversationUuid) {
      const messages = dataSource.chat_history?.filter(msg => 
        msg.conversation_uuid === selectedConversationUuid && !msg.is_conversation_header
      ) || [];
      
      debugLog('TIMELINE_MESSAGES', 'Claude Full Export Filtered', {
        totalMessages: dataSource.chat_history?.length,
        filteredMessages: messages.length,
        selectedConversationUuid,
        firstMessage: messages[0]
      });
      
      return messages;
    }
    
    // 对于其他格式，返回所有消息
    const messages = dataSource.chat_history || [];
    debugLog('TIMELINE_MESSAGES', 'Standard Format', {
      messageCount: messages.length,
      format: dataSource.format,
      firstMessage: messages[0]
    });
    
    return messages;
  }, [viewMode, processedData, selectedConversationUuid, selectedFileIndex, currentFileIndex]);

  // 关键修复：重置排序管理器当文件或对话改变
  useEffect(() => {
    // 当文件UUID改变时，强制重置排序管理器
    if (currentFileUuid) {
      // 总是创建新的排序管理器实例，避免数据混乱
      sortManagerRef.current = new SortManager(timelineMessages, currentFileUuid);
      setSortVersion(v => v + 1); // 强制重新渲染
      debugLog('SORT_MANAGER', 'Reset on UUID change', { 
        messageCount: timelineMessages.length, 
        fileUuid: currentFileUuid 
      });
    } else {
      sortManagerRef.current = null;
    }
  }, [currentFileUuid]); // 只依赖于UUID改变

  // 更新排序管理器的消息
  useEffect(() => {
    if (sortManagerRef.current && timelineMessages.length > 0 && currentFileUuid) {
      if (sortManagerRef.current.fileUuid === currentFileUuid) {
        sortManagerRef.current.updateMessages(timelineMessages);
        setSortVersion(v => v + 1);
        debugLog('SORT_MANAGER', 'Messages updated', { 
          messageCount: timelineMessages.length,
          fileUuid: currentFileUuid
        });
      }
    }
  }, [timelineMessages]);

  // 获取排序后的消息
  const sortedMessages = useMemo(() => {
    if (sortManagerRef.current && viewMode === 'timeline' && timelineMessages.length > 0) {
      const sorted = sortManagerRef.current.getSortedMessages();
      debugLog('SORTED_MESSAGES', 'Messages sorted', { 
        originalCount: timelineMessages.length,
        sortedCount: sorted.length,
        fileUuid: sortManagerRef.current?.fileUuid
      });
      
      // 验证排序后的消息数量应该等于原始消息数量
      if (sorted.length !== timelineMessages.length) {
        console.error('SORTED_MESSAGES', 'Count mismatch!', {
          expected: timelineMessages.length,
          actual: sorted.length
        });
        return timelineMessages; // 返回原始消息避免数据错误
      }
      
      return sorted;
    }
    return timelineMessages;
  }, [timelineMessages, viewMode, sortVersion]);

  // 处理搜索
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    
    if (!searchManagerRef.current) return;
    
    const searchTarget = viewMode === 'conversations' ? allCards : sortedMessages;
    
    debugLog('SEARCH', 'Performing search', { query, targetCount: searchTarget.length });
    
    searchManagerRef.current.searchWithDebounce(query, searchTarget, (result) => {
      setSearchResults(result);
      debugLog('SEARCH', 'Results', { resultCount: result.filteredMessages.length });
    });
  }, [viewMode, allCards, sortedMessages]);

  // 获取显示的消息/卡片
  const displayedItems = useMemo(() => {
    if (!searchQuery) {
      return viewMode === 'conversations' ? allCards : sortedMessages;
    }
    return searchResults.filteredMessages;
  }, [searchQuery, searchResults.filteredMessages, viewMode, allCards, sortedMessages]);

  // 获取当前marks
  const currentMarks = useMemo(() => {
    return markManagerRef.current ? markManagerRef.current.getMarks() : {
      completed: new Set(),
      important: new Set(),
      deleted: new Set()
    };
  }, [markVersion, currentFileUuid]);

  // 获取当前是否有自定义排序
  const hasCustomSort = useMemo(() => {
    return sortManagerRef.current ? sortManagerRef.current.hasCustomSort() : false;
  }, [sortVersion, currentFileUuid]);

  // 当前对话信息
  const currentConversation = useMemo(() => {
    if (viewMode === 'timeline' && selectedFileIndex !== null) {
      // 确保使用正确的数据源
      const dataSource = selectedFileIndex === currentFileIndex ? processedData : null;
      
      if (!dataSource) {
        debugLog('CURRENT_CONVERSATION', 'No data source', {
          selectedFileIndex,
          currentFileIndex,
          hasProcessedData: !!processedData
        });
        return null;
      }
      
      if (selectedConversationUuid && dataSource.format === 'claude_full_export') {
        const conversation = dataSource.views?.conversationList?.find(
          conv => conv.uuid === selectedConversationUuid
        );
        if (conversation && files[selectedFileIndex]) {
          const convUuid = generateConversationCardUuid(selectedFileIndex, conversation.uuid, files[selectedFileIndex]);
          
          debugLog('CURRENT_CONVERSATION', 'Full Export Conversation', {
            conversation,
            convUuid,
            selectedConversationUuid
          });
          
          return {
            ...conversation,
            uuid: convUuid,
            is_starred: starManagerRef.current ? 
              starManagerRef.current.isStarred(convUuid, conversation.is_starred) :
              conversation.is_starred
          };
        }
        return null;
      } else {
        const file = files[selectedFileIndex];
        if (file) {
          const metadata = fileMetadata[file.name] || {};
          const isCurrentFile = selectedFileIndex === currentFileIndex;
          const fileData = isCurrentFile ? dataSource : null;
          
          const fileConv = {
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
          
          debugLog('CURRENT_CONVERSATION', 'File Conversation', fileConv);
          return fileConv;
        }
      }
    }
    return null;
  }, [viewMode, selectedFileIndex, selectedConversationUuid, processedData, files, currentFileIndex, fileMetadata]);

  const isFullExportConversationMode = viewMode === 'conversations' && processedData?.format === 'claude_full_export';

  // ==================== 事件处理函数 ====================
  
  // PostMessage处理器
  const postMessageHandler = useMemo(() => {
    return new PostMessageHandler(fileActions, setError);
  }, [fileActions]);

  const handleFileLoad = (e) => {
    const fileList = Array.from(e.target.files);
    debugLog('FILE_LOAD', 'Loading files', { count: fileList.length });
    fileActions.loadFiles(fileList);
  };

  // 核心修复：改进卡片选择处理，确保数据同步
  const handleCardSelect = useCallback((card) => {
    debugLog('CARD_SELECT', 'Card selected', card);
    
    // 保存滚动位置
    if (contentAreaRef.current && viewMode === 'conversations') {
      const key = currentFile ? `file-${currentFileIndex}` : 'main';
      setScrollPositions(prev => ({
        ...prev,
        [key]: contentAreaRef.current.scrollTop
      }));
    }
    
    // 重置所有状态以避免数据混乱
    setSelectedMessageIndex(null);
    setShowMessageDetail(false);
    setSearchQuery(''); // 重置搜索
    setSortVersion(v => v + 1); // 重置排序
    
    if (card.type === 'file') {
      const needsFileSwitch = card.fileIndex !== currentFileIndex;
      
      debugLog('CARD_SELECT', 'File card processing', {
        fileIndex: card.fileIndex,
        currentFileIndex,
        needsFileSwitch,
        format: card.format || card.fileData?.format
      });
      
      // 处理文件切换
      if (needsFileSwitch) {
        // 先切换文件
        fileActions.switchFile(card.fileIndex);
        
        // 等待文件加载完成后再更新视图
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
        // 文件已经是当前文件，直接更新视图
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
      
      debugLog('CARD_SELECT', 'Conversation card processing', {
        fileIndex,
        currentFileIndex,
        needsFileSwitch,
        conversationUuid,
        parsedUuid: parsed
      });
      
      // 处理对话卡片选择
      if (needsFileSwitch) {
        // 需要切换文件
        fileActions.switchFile(fileIndex);
        
        // 等待文件加载完成后再更新视图
        setTimeout(() => {
          setSelectedFileIndex(fileIndex);
          setSelectedConversationUuid(conversationUuid);
          setViewMode('timeline');
        }, 100);
      } else {
        // 文件已经是当前文件，直接更新视图
        setSelectedFileIndex(fileIndex);
        setSelectedConversationUuid(conversationUuid);
        setViewMode('timeline');
      }
    }
  }, [currentFileIndex, fileActions, viewMode, currentFile]);

  // 修复文件移除处理
  const handleFileRemove = useCallback((fileIndexOrUuid) => {
    debugLog('FILE_REMOVE', 'Removing file', { fileIndexOrUuid });
    
    // 处理直接的文件索引
    if (typeof fileIndexOrUuid === 'number') {
      fileActions.removeFile(fileIndexOrUuid);
      
      // 如果移除的是当前查看的文件，重置视图
      if (fileIndexOrUuid === currentFileIndex || fileIndexOrUuid === selectedFileIndex) {
        setViewMode('conversations');
        setSelectedFileIndex(null);
        setSelectedConversationUuid(null);
        setSortVersion(v => v + 1); // 重置排序
      }
      return;
    }
    
    // 处理UUID（来自UnifiedCard的关闭按钮）
    const parsed = parseUuid(fileIndexOrUuid);
    if (parsed.fileHash) {
      // 找到对应的文件索引
      const index = files.findIndex((file, idx) => {
        const hash = generateFileHash(file);
        return hash === parsed.fileHash || generateFileCardUuid(idx, file) === fileIndexOrUuid;
      });
      
      debugLog('FILE_REMOVE', 'Found file index', { index, parsed });
      
      if (index !== -1) {
        fileActions.removeFile(index);
        
        if (index === currentFileIndex || index === selectedFileIndex) {
          setViewMode('conversations');
          setSelectedFileIndex(null);
          setSelectedConversationUuid(null);
          setSortVersion(v => v + 1); // 重置排序
        }
      }
    }
  }, [currentFileIndex, selectedFileIndex, files, fileActions]);

  const handleBackToConversations = () => {
    debugLog('NAVIGATION', 'Back to conversations');
    setViewMode('conversations');
    setSelectedFileIndex(null);
    setSelectedConversationUuid(null);
    setSearchQuery('');
    setSortVersion(v => v + 1); // 重置排序
    
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
    debugLog('MESSAGE_SELECT', 'Message selected', { messageIndex });
    setSelectedMessageIndex(messageIndex);
    setShowMessageDetail(true);
  };

  const handleMarkToggle = (messageIndex, markType) => {
    debugLog('MARK_TOGGLE', 'Toggling mark', { messageIndex, markType });
    
    if (markManagerRef.current) {
      markManagerRef.current.toggleMark(messageIndex, markType);
      
      // 记录操作的文件
      if (viewMode === 'timeline' && selectedFileIndex !== null) {
        const file = files[selectedFileIndex];
        if (file) {
          const fileUuid = selectedConversationUuid && processedData?.format === 'claude_full_export'
            ? generateConversationCardUuid(selectedFileIndex, selectedConversationUuid, file)
            : generateFileCardUuid(selectedFileIndex, file);
          
          setOperatedFiles(prev => new Set(prev).add(fileUuid));
        }
      }
      
      // 触发重新渲染
      setMarkVersion(v => v + 1);
    }
  };

  const handleStarToggle = (conversationUuid, nativeIsStarred) => {
    debugLog('STAR_TOGGLE', 'Toggling star', { conversationUuid, nativeIsStarred });
    
    if (starManagerRef.current) {
      starManagerRef.current.toggleStar(conversationUuid, nativeIsStarred);
      // 强制刷新
      setSelectedConversation(prev => prev);
    }
  };

  // 排序操作
  const sortActions = {
    enableSort: () => {
      if (sortManagerRef.current) {
        sortManagerRef.current.enableSort();
        setSortVersion(v => v + 1);
        debugLog('SORT', 'Enabled');
      }
    },
    resetSort: () => {
      if (sortManagerRef.current) {
        sortManagerRef.current.resetSort();
        setSortVersion(v => v + 1);
        debugLog('SORT', 'Reset');
      }
    },
    moveMessage: (fromIndex, direction) => {
      if (sortManagerRef.current) {
        sortManagerRef.current.moveMessage(fromIndex, direction);
        setSortVersion(v => v + 1);
        debugLog('SORT', 'Move message', { fromIndex, direction });
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
        
        // 从operatedFiles中移除当前对话的UUID
        if (currentFileUuid) {
          setOperatedFiles(prev => {
            const newSet = new Set(prev);
            newSet.delete(currentFileUuid);
            
            // 同时清理相关的localStorage条目
            localStorage.removeItem(`marks_${currentFileUuid}`);
            localStorage.removeItem(`message_order_${currentFileUuid}`);
            
            return newSet;
          });
        }
        
        setMarkVersion(v => v + 1);
        debugLog('MARKS', 'Cleared all marks');
      }
    }
  };

  // 导出功能
  const handleExport = async () => {
    debugLog('EXPORT', 'Starting export', { scope: exportOptions.scope });
    
    try {
      // 获取导出格式配置
      const exportFormatConfig = StorageUtils.getLocalStorage('export-config', {
        includeNumbering: true,
        numberingFormat: 'numeric',
        senderFormat: 'default',
        humanLabel: '人类',
        assistantLabel: 'Claude',
        includeHeaderPrefix: true,
        headerLevel: 2
      });
      
      // 准备导出数据
      let dataToExport = [];
      
      switch (exportOptions.scope) {
        case 'current':
          if (processedData) {
            const messagesToExport = sortManagerRef.current?.hasCustomSort() ? 
              sortedMessages : (processedData.chat_history || []);
            
            // 获取当前文件的标记
            const marks = markManagerRef.current ? markManagerRef.current.getMarks() : {
              completed: new Set(),
              important: new Set(),
              deleted: new Set()
            };
            
            dataToExport = [{
              ...processedData,
              chat_history: messagesToExport
            }];
          }
          break;
          
        case 'operated':
          // 处理有操作的文件
          for (const fileUuid of operatedFiles) {
            // 根据fileUuid找到对应的文件索引
            const fileIndex = files.findIndex((file, index) => {
              const fUuid = generateFileCardUuid(index, file);
              return fUuid === fileUuid || fileUuid.includes(generateFileHash(file));
            });
            
            if (fileIndex !== -1) {
              const file = files[fileIndex];
              try {
                const text = await file.text();
                const jsonData = JSON.parse(text);
                let data = extractChatData(jsonData, file.name);
                data = detectBranches(data);
                
                // 获取该文件的标记
                const fileMarkManager = new MarkManager(fileUuid);
                const marks = fileMarkManager.getMarks();
                
                // 获取该文件的排序
                const fileSortManager = new SortManager(data.chat_history || [], fileUuid);
                const sortedMsgs = fileSortManager.getSortedMessages();
                
                dataToExport.push({
                  ...data,
                  chat_history: sortedMsgs
                });
              } catch (err) {
                console.error(`无法处理文件 ${file.name}:`, err);
              }
            }
          }
          break;
          
        case 'all':
          // 导出所有文件
          for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
            const file = files[fileIndex];
            try {
              const text = await file.text();
              const jsonData = JSON.parse(text);
              let data = extractChatData(jsonData, file.name);
              data = detectBranches(data);
              
              // 获取文件UUID
              const fileUuid = generateFileCardUuid(fileIndex, file);
              
              // 获取该文件的标记
              const fileMarkManager = new MarkManager(fileUuid);
              const marks = fileMarkManager.getMarks();
              
              // 获取该文件的排序
              const fileSortManager = new SortManager(data.chat_history || [], fileUuid);
              const sortedMsgs = fileSortManager.getSortedMessages();
              
              dataToExport.push({
                ...data,
                chat_history: sortedMsgs
              });
            } catch (err) {
              console.error(`无法处理文件 ${file.name}:`, err);
            }
          }
          break;
      }
      
      if (dataToExport.length === 0) {
        alert('没有可导出的数据');
        return;
      }
      
      debugLog('EXPORT', 'Exporting data', { itemCount: dataToExport.length });
      
      // 执行导出
      const { exportData } = await import('./utils/exportManager');
      const success = await exportData({
        scope: dataToExport.length === 1 ? 'current' : 'multiple',
        data: dataToExport.length === 1 ? dataToExport[0] : null,
        dataList: dataToExport,
        config: {
          ...exportOptions,
          ...exportFormatConfig,
          marks: markManagerRef.current ? markManagerRef.current.getMarks() : {
            completed: new Set(),
            important: new Set(),
            deleted: new Set()
          }
        }
      });
      
      if (success) {
        setShowExportPanel(false);
      }
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败：' + error.message);
    }
  };

  // ==================== 工具函数 ====================
  
  // 获取统计数据
  const getStats = () => {
    const markStats = markManagerRef.current ? markManagerRef.current.getStats() : {
      completed: 0,
      important: 0,
      deleted: 0,
      total: 0
    };
    
    const allMarksStats = getAllMarksStats(
      files, 
      processedData, 
      currentFileIndex, 
      generateFileCardUuid, 
      generateConversationCardUuid
    );
    
    return StatsCalculator.calculateViewStats({
      viewMode,
      allCards,
      sortedMessages,
      timelineMessages,
      files,
      allMarksStats,
      stats: markStats,
      shouldUseStarSystem,
      starActions: starManagerRef.current,
      currentConversation
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
  
  // 文件切换后同步选中消息
  useEffect(() => {
    if (viewMode === 'timeline' && timelineMessages.length > 0) {
      // 如果是桌面端且没有选中消息，选中第一条
      if (window.innerWidth >= 1024 && selectedMessageIndex === null) {
        const firstMessageIndex = timelineMessages[0]?.index;
        if (firstMessageIndex !== undefined) {
          setSelectedMessageIndex(firstMessageIndex);
          debugLog('AUTO_SELECT', 'Selected first message', { index: firstMessageIndex });
        }
      }
    }
  }, [viewMode, timelineMessages, selectedMessageIndex]);

  // 初始化时扫描已有操作记录
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
        debugLog('OPERATED_FILES', 'Found operated files', { count: operatedSet.size });
      }
    }
  }, [files, currentFileIndex, processedData]);
  
  // 主题初始化
  useEffect(() => {
    ThemeUtils.applyTheme(ThemeUtils.getCurrentTheme());
  }, []);

  // postMessage监听器
  useEffect(() => {
    const cleanup = postMessageHandler.setup();
    return cleanup;
  }, [postMessageHandler]);

  // ==================== 渲染（保持原有的渲染逻辑不变） ====================
  
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
                  <span className="search-icon">🔍</span>
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