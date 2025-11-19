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
import ExportPanel from './components/ExportPanel';
import ScreenshotPreviewPanel from './components/ScreenshotPreviewPanel';
import { CardGrid } from './components/UnifiedCard';

// 工具函数导入
import { ThemeUtils } from './utils/themeManager';
import { PostMessageHandler, StatsCalculator, DataProcessor } from './utils/data';
import { extractChatData, detectBranches, parseJSONL } from './utils/fileParser';
import {
  generateFileCardUuid,
  generateConversationCardUuid,
  parseUuid,
  getCurrentFileUuid,
  generateFileHash
} from './utils/data/uuidManager';
import { MarkManager, getAllMarksStats } from './utils/data/markManager';
import { StarManager } from './utils/data/starManager';
import { SortManager } from './utils/data/sortManager';
import { SearchManager } from './utils/searchManager';

import EnhancedSearchBox from './components/EnhancedSearchBox';
import { getGlobalSearchManager } from './utils/globalSearchManager';
import { useI18n } from './index.js';

// ==================== 通用工具类 ====================

/**
 * Storage 工具类 - 封装 localStorage 操作
 */
export const StorageUtils = {
  getLocalStorage(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Failed to get ${key} from localStorage:`, error);
      return defaultValue;
    }
  },

  setLocalStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Failed to set ${key} in localStorage:`, error);
      return false;
    }
  }
};

/**
 * Validation 工具类 - 验证跨窗口通信来源
 */
export const ValidationUtils = {
  isAllowedOrigin(origin) {
    const allowedOrigins = [
      'https://claude.ai',
      'https://claude.easychat.top',
      'https://pro.easychat.top',
      'https://chatgpt.com',
      'https://gemini.google.com',
      'https://aistudio.google.com',
      'http://localhost:3789',
      'https://yalums.github.io'
    ];
    return allowedOrigins.some(allowed => origin === allowed) ||
           origin.includes('localhost') ||
           origin.includes('127.0.0.1');
  }
};

// ==================== 内联的 Hooks ====================

/**
 * useFullExportCardFilter - 卡片筛选Hook
 */
const useFullExportCardFilter = (conversations = [], operatedUuids = new Set()) => {
  const [filters, setFilters] = useState({
    name: '',
    dateRange: 'all',
    customDateStart: '',
    customDateEnd: '',
    project: 'all',
    starred: 'all',
    operated: 'all'
  });

  // 获取所有可用的项目
  const availableProjects = useMemo(() => {
    const projects = new Map();
    conversations.forEach(conv => {
      if (conv.project && conv.project.uuid) {
        projects.set(conv.project.uuid, conv.project);
      }
    });
    return Array.from(projects.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [conversations]);

  // 筛选逻辑
  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      // 名称筛选
      if (filters.name.trim()) {
        const nameMatch = conv.name?.toLowerCase().includes(filters.name.toLowerCase());
        const projectMatch = conv.project?.name?.toLowerCase().includes(filters.name.toLowerCase());
        if (!nameMatch && !projectMatch) return false;
      }

      // 项目筛选
      if (filters.project !== 'all') {
        if (filters.project === 'no_project') {
          if (conv.project && conv.project.uuid) return false;
        } else {
          if (!conv.project || conv.project.uuid !== filters.project) return false;
        }
      }

      // 星标筛选
      if (filters.starred !== 'all') {
        if (filters.starred === 'starred' && !conv.is_starred) return false;
        if (filters.starred === 'unstarred' && conv.is_starred) return false;
      }

      // 操作状态筛选
      if (filters.operated !== 'all') {
        const isOperated = operatedUuids.has(conv.uuid);
        if (filters.operated === 'operated' && !isOperated) return false;
        if (filters.operated === 'unoperated' && isOperated) return false;
      }

      // 日期筛选
      if (filters.dateRange !== 'all' && conv.created_at) {
        try {
          const convDate = new Date(conv.created_at);
          const now = new Date();
          switch (filters.dateRange) {
            case 'today':
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const convDay = new Date(convDate.getFullYear(), convDate.getMonth(), convDate.getDate());
              if (convDay.getTime() !== today.getTime()) return false;
              break;
            case 'week':
              const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              if (convDate < weekAgo) return false;
              break;
            case 'month':
              const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              if (convDate < monthAgo) return false;
              break;
            case 'custom':
              if (filters.customDateStart) {
                const startDate = new Date(filters.customDateStart);
                if (convDate < startDate) return false;
              }
              if (filters.customDateEnd) {
                const endDate = new Date(filters.customDateEnd + 'T23:59:59');
                if (convDate > endDate) return false;
              }
              break;
          }
        } catch (error) {
          console.warn('日期解析失败:', conv.created_at);
        }
      }

      return true;
    });
  }, [conversations, filters, operatedUuids]);

  // 设置单个筛选器
  const setFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // 批量设置筛选器
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // 重置筛选器
  const resetFilters = useCallback(() => {
    setFilters({
      name: '',
      dateRange: 'all',
      customDateStart: '',
      customDateEnd: '',
      project: 'all',
      starred: 'all',
      operated: 'all'
    });
  }, []);

  // 获取筛选统计
  const filterStats = useMemo(() => {
    const hasActiveFilters = filters.name.trim() ||
                           filters.dateRange !== 'all' ||
                           filters.project !== 'all' ||
                           filters.starred !== 'all' ||
                           filters.operated !== 'all';
    return {
      total: conversations.length,
      filtered: filteredConversations.length,
      hasActiveFilters,
      activeFilterCount: [
        filters.name.trim(),
        filters.dateRange !== 'all',
        filters.project !== 'all',
        filters.starred !== 'all',
        filters.operated !== 'all'
      ].filter(Boolean).length
    };
  }, [conversations.length, filteredConversations.length, filters]);

  // 获取筛选器摘要文本
  const getFilterSummary = useCallback(() => {
    const parts = [];
    if (filters.name.trim()) {
      parts.push(`名称: "${filters.name}"`);
    }
    if (filters.dateRange !== 'all') {
      const dateLabels = {
        today: '今天',
        week: '最近一周',
        month: '最近一月',
        custom: '自定义时间'
      };
      parts.push(`时间: ${dateLabels[filters.dateRange] || filters.dateRange}`);
    }
    if (filters.project !== 'all') {
      if (filters.project === 'no_project') {
        parts.push('项目: 无项目');
      } else {
        const project = availableProjects.find(p => p.uuid === filters.project);
        parts.push(`项目: ${project?.name || '未知项目'}`);
      }
    }
    if (filters.starred !== 'all') {
      parts.push(`星标: ${filters.starred === 'starred' ? '已星标' : '未星标'}`);
    }
    if (filters.operated !== 'all') {
      parts.push(`操作: ${filters.operated === 'operated' ? '有过操作' : '未操作'}`);
    }
    return parts.join(', ');
  }, [filters, availableProjects]);

  return {
    filters,
    filteredConversations,
    availableProjects,
    filterStats,
    actions: {
      setFilter,
      updateFilters,
      resetFilters,
      getFilterSummary
    }
  };
};

/**
 * useFileManager - 文件管理Hook
 */
const useFileManager = () => {
  const [files, setFiles] = useState([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [processedData, setProcessedData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showTypeConflictModal, setShowTypeConflictModal] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [fileMetadata, setFileMetadata] = useState({});

  // 智能解析文件（JSON或JSONL）
  const parseFile = useCallback(async (file) => {
    const text = await file.text();
    const isJSONL = file.name.endsWith('.jsonl') || (text.includes('\n{') && !text.trim().startsWith('['));
    return isJSONL ? parseJSONL(text) : JSON.parse(text);
  }, []);

  // 处理当前文件
  const processCurrentFile = useCallback(async () => {
    if (!files.length || currentFileIndex >= files.length) {
      setProcessedData(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const file = files[currentFileIndex];
      const jsonData = await parseFile(file);
      let data = extractChatData(jsonData, file.name);
      data = detectBranches(data);
      setProcessedData(data);
    } catch (err) {
      console.error('处理文件出错:', err);
      setError(err.message);
      setProcessedData(null);
    } finally {
      setIsLoading(false);
    }
  }, [files, currentFileIndex, parseFile]);

  useEffect(() => {
    processCurrentFile();
  }, [processCurrentFile]);

  // 检查文件兼容性
  const checkCompatibility = useCallback(async (newFiles) => {
    if (!files.length) return true;
    try {
      const newData = extractChatData(await parseFile(newFiles[0]), newFiles[0].name);
      const curData = extractChatData(await parseFile(files[currentFileIndex]), files[currentFileIndex].name);
      const isNewFull = newData.format === 'claude_full_export';
      const isCurFull = curData.format === 'claude_full_export';
      return !(isNewFull !== isCurFull);
    } catch {
      return true;
    }
  }, [files, currentFileIndex, parseFile]);

  // 加载文件
  const loadFiles = useCallback(async (fileList) => {
    const validFiles = fileList.filter(f =>
      f.name.endsWith('.json') || f.name.endsWith('.jsonl') || f.type === 'application/json'
    );
    if (!validFiles.length) {
      setError('未找到有效的JSON/JSONL文件');
      return;
    }
    const newFiles = validFiles.filter(nf =>
      !files.some(ef => ef.name === nf.name && ef.lastModified === nf.lastModified)
    );
    if (!newFiles.length) {
      setError('文件已加载');
      return;
    }
    const isCompatible = await checkCompatibility(newFiles);
    if (!isCompatible) {
      setPendingFiles(newFiles);
      setShowTypeConflictModal(true);
      return;
    }
    // 提取元数据
    const newMeta = {};
    for (const file of newFiles) {
      try {
        const data = extractChatData(await parseFile(file), file.name);
        newMeta[file.name] = {
          format: data.format,
          platform: data.platform || data.format,
          messageCount: data.chat_history?.length || 0,
          conversationCount: data.format === 'claude_full_export' ?
            (data.views?.conversationList?.length || 0) : 1,
          title: data.meta_info?.title || file.name,
          model: data.meta_info?.model || '',
          created_at: data.meta_info?.created_at,
          updated_at: data.meta_info?.updated_at
        };
      } catch (err) {
        console.warn(`提取元数据失败 ${file.name}:`, err);
        newMeta[file.name] = { format: 'unknown', messageCount: 0, title: file.name };
      }
    }
    setFileMetadata(prev => ({ ...prev, ...newMeta }));
    setFiles(prev => [...prev, ...newFiles]);
    setError(null);
  }, [files, checkCompatibility, parseFile]);

  const confirmReplaceFiles = useCallback(() => {
    setFiles(pendingFiles);
    setCurrentFileIndex(0);
    setPendingFiles([]);
    setShowTypeConflictModal(false);
    setError(null);
  }, [pendingFiles]);

  const cancelReplaceFiles = useCallback(() => {
    setPendingFiles([]);
    setShowTypeConflictModal(false);
  }, []);

  const removeFile = useCallback((index) => {
    const toRemove = files[index];
    if (toRemove) {
      setFileMetadata(prev => {
        const { [toRemove.name]: _, ...rest } = prev;
        return rest;
      });
    }
    setFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index);
      if (!newFiles.length) setCurrentFileIndex(0);
      else if (index <= currentFileIndex && currentFileIndex > 0) {
        setCurrentFileIndex(currentFileIndex - 1);
      }
      return newFiles;
    });
  }, [currentFileIndex, files]);

  const switchFile = useCallback((index) => {
    if (index >= 0 && index < files.length) {
      setCurrentFileIndex(index);
    }
  }, [files.length]);

  const reorderFiles = useCallback((fromIdx, toIdx) => {
    if (fromIdx === toIdx) return;
    setFiles(prev => {
      const newFiles = [...prev];
      const [moved] = newFiles.splice(fromIdx, 1);
      newFiles.splice(toIdx, 0, moved);
      if (fromIdx === currentFileIndex) setCurrentFileIndex(toIdx);
      else if (fromIdx < currentFileIndex && toIdx >= currentFileIndex) {
        setCurrentFileIndex(currentFileIndex - 1);
      } else if (fromIdx > currentFileIndex && toIdx <= currentFileIndex) {
        setCurrentFileIndex(currentFileIndex + 1);
      }
      return newFiles;
    });
  }, [currentFileIndex]);

  const actions = useMemo(() => ({
    loadFiles,
    removeFile,
    switchFile,
    reorderFiles,
    confirmReplaceFiles,
    cancelReplaceFiles
  }), [loadFiles, removeFile, switchFile, reorderFiles, confirmReplaceFiles, cancelReplaceFiles]);

  return {
    files,
    currentFile: files[currentFileIndex] || null,
    currentFileIndex,
    processedData,
    isLoading,
    error,
    showTypeConflictModal,
    pendingFiles,
    fileMetadata,
    actions
  };
};

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
  const [screenshotPreview, setScreenshotPreview] = useState({
    isOpen: false,
    data: null
  });
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
  const [timelineDisplayMessages, setTimelineDisplayMessages] = useState([]); // 新增：存储时间线中实际显示的消息（经过分支过滤）
  const [exportOptions, setExportOptions] = useState(() => {
    const savedExportConfig = StorageUtils.getLocalStorage('export-config', {});
    return {
      scope: 'current',
      exportFormat: 'markdown', // 新增：导出格式（markdown 或 screenshot）
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
    setTimelineDisplayMessages([]); // 清空时间线显示消息
    
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

  // 打开截图预览面板
  const openScreenshotPreview = (data) => {
    setScreenshotPreview({ isOpen: true, data });
    setShowExportPanel(false); // 关闭导出面板
  };

  // 关闭截图预览面板
  const closeScreenshotPreview = () => {
    setScreenshotPreview({ isOpen: false, data: null });
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
      currentFileIndex,
      displayMessages: viewMode === 'timeline' ? timelineDisplayMessages : null, // 使用从 ConversationTimeline 传回的实际显示消息
      openScreenshotPreview, // 新增：打开截图预览面板
      currentTheme: ThemeUtils.getCurrentTheme(), // 新增：当前主题
      conversation: selectedConversation // 新增：当前对话信息
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
                    onDisplayMessagesChange={setTimelineDisplayMessages}
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
          <ExportPanel
            isOpen={showExportPanel}
            onClose={() => setShowExportPanel(false)}
            exportOptions={exportOptions}
            setExportOptions={setExportOptions}
            viewMode={viewMode}
            currentBranchState={currentBranchState}
            operatedFiles={operatedFiles}
            files={files}
            stats={getStats()}
            starManagerRef={starManagerRef}
            shouldUseStarSystem={shouldUseStarSystem}
            isFullExportConversationMode={isFullExportConversationMode}
            allCards={allCards}
            processedData={processedData}
            currentFileIndex={currentFileIndex}
            onExport={handleExportClick}
            t={t}
          />

          {/* 长截图预览面板 */}
          {screenshotPreview.isOpen && screenshotPreview.data && (
            <ScreenshotPreviewPanel
              {...screenshotPreview.data}
              isOpen={screenshotPreview.isOpen}
              onClose={closeScreenshotPreview}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;
