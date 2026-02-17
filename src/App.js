// App.js - 大幅简化版本
/* global chrome */
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import './styles/index.css';

// 组件导入
import WelcomePage from './components/WelcomePage';
import ConversationTimeline from './components/ConversationTimeline';
import FloatingActionButton from './components/FloatingActionButton';
import SettingsPanel from './components/SettingsManager';
import ActionPanel from './components/ActionPanel';
import ScreenshotPreviewPanel from './components/ScreenshotPreviewPanel';
import { CardGrid } from './components/UnifiedCard';
import WhiteboardView from './components/WhiteboardView';
import CanvasSelector from './components/whiteboard/CanvasSelector';

// 工具函数导入
import { ThemeUtils } from './utils/themeManager';
import { PostMessageHandler, StatsCalculator, DataProcessor } from './utils/data';
import { extractChatData, detectBranches, parseJSONL, extractMergedJSONLData } from './utils/fileParser';
import {
  generateFileCardUuid,
  parseUuid,
  getCurrentFileUuid,
  generateFileHash
} from './utils/data/uuidManager';
import { MarkManager } from './utils/data/markManager';
import { StarManager } from './utils/data/starManager';
import { SortManager } from './utils/data/sortManager';
import StorageManager from './utils/storageManager';
import ProjectCache from './utils/projectCache';
import CanvasManager from './utils/canvasManager';

import EnhancedSearchBox from './components/EnhancedSearchBox';
import { getGlobalSearchManager } from './utils/globalSearchManager';
import { getRenameManager } from './utils/renameManager';
import { useI18n } from './index.js';

// AI Chat 浮窗组件
import { FloatPanel, FloatPanelTrigger, initLyraAIChat, chatService } from './ai-chat';
import './ai-chat/styles.css';

// ==================== 通用工具类 ====================

/**
 * Storage 工具类 - 使用 StorageManager
 * 保持向后兼容的 API
 */
export const StorageUtils = {
  getLocalStorage(key, defaultValue = null) {
    // 移除 lyra_ 前缀（如果存在），因为 StorageManager 会自动添加
    const cleanKey = key.startsWith('lyra_') ? key.substring(5) : key;
    return StorageManager.get(cleanKey, defaultValue);
  },

  setLocalStorage(key, value) {
    // 移除 lyra_ 前缀（如果存在），因为 StorageManager 会自动添加
    const cleanKey = key.startsWith('lyra_') ? key.substring(5) : key;
    return StorageManager.set(cleanKey, value);
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
      'https://grok.com',
      'https://x.com',
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
 * @param {Array} conversations - 对话列表
 * @param {Set} operatedUuids - 已操作的UUID集合
 * @param {boolean} enabled - 是否启用筛选
 * @param {StarManager} starManager - 星标管理器实例
 * @param {Map} starredConversations - 星标状态Map（用于触发重新计算）
 */
const useFullExportCardFilter = (conversations = [], operatedUuids = new Set(), enabled = true, starManager = null, starredConversations = null) => {
  const [filters, setFilters] = useState({
    name: '',
    dateRange: 'all',
    customDateStart: '',
    customDateEnd: '',
    project: 'all',
    organization: 'all',
    starred: 'all',
    operated: 'all'
  });

  // 获取所有可用的项目
  const availableProjects = useMemo(() => {
    if (!enabled) return [];
    const projects = new Map();
    conversations.forEach(conv => {
      if (conv.project && conv.project.uuid) {
        projects.set(conv.project.uuid, conv.project);
      }
    });
    return Array.from(projects.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [conversations, enabled]);

  // 获取所有可用的组织
  const availableOrganizations = useMemo(() => {
    if (!enabled) return [];
    const orgs = new Map();
    conversations.forEach(conv => {
      if (conv.organization_id) {
        orgs.set(conv.organization_id, {
          id: conv.organization_id,
          name: `账号 ${conv.organization_id.substring(0, 8)}...`
        });
      }
    });
    return Array.from(orgs.values()).sort((a, b) => a.id.localeCompare(b.id));
  }, [conversations, enabled]);

  // 筛选逻辑
  const filteredConversations = useMemo(() => {
    if (!enabled) return conversations;

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

      // 组织筛选
      if (filters.organization !== 'all') {
        if (filters.organization === 'no_organization') {
          if (conv.organization_id) return false;
        } else {
          if (!conv.organization_id || conv.organization_id !== filters.organization) return false;
        }
      }

      // 星标筛选（考虑手动星标）
      if (filters.starred !== 'all') {
        // 使用StarManager判断真实星标状态（包括手动覆盖）
        const actualIsStarred = starManager
          ? starManager.isStarred(conv.uuid, conv.is_starred || false)
          : (conv.is_starred || false);

        if (filters.starred === 'starred' && !actualIsStarred) return false;
        if (filters.starred === 'unstarred' && actualIsStarred) return false;
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
    // starredConversations 作为依赖触发器，当星标变化时重新计算筛选结果
  }, [conversations, filters, operatedUuids, enabled, starManager, starredConversations]);

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
      organization: 'all',
      starred: 'all',
      operated: 'all'
    });
  }, []);

  // 获取筛选统计
  const filterStats = useMemo(() => {
    const hasActiveFilters = filters.name.trim() ||
      filters.dateRange !== 'all' ||
      filters.project !== 'all' ||
      filters.organization !== 'all' ||
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
        filters.organization !== 'all',
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
    if (filters.organization !== 'all') {
      if (filters.organization === 'no_organization') {
        parts.push('账号: 无账号');
      } else {
        const org = availableOrganizations.find(o => o.id === filters.organization);
        parts.push(`账号: ${org?.name || '未知账号'}`);
      }
    }
    if (filters.operated !== 'all') {
      parts.push(`操作: ${filters.operated === 'operated' ? '有过操作' : '未操作'}`);
    }
    return parts.join(', ');
  }, [filters, availableProjects, availableOrganizations]);

  return {
    filters,
    filteredConversations,
    availableProjects,
    availableOrganizations,
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
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });

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

      // 检查是否有预处理的合并数据
      if (file._mergedProcessedData) {
        console.log('[Lyra] 使用预处理的合并数据');
        setProcessedData(file._mergedProcessedData);
      } else {
        const jsonData = await parseFile(file);
        let data = extractChatData(jsonData, file.name);
        data = detectBranches(data);
        setProcessedData(data);
      }
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

  // 检查文件兼容性 - 简化版本，所有格式都兼容
  const checkCompatibility = useCallback(async () => {
    return true;
  }, []);

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
    // 并行批量提取元数据（每批20个文件，兼顾速度与内存）
    const BATCH_SIZE = 20;
    const newMeta = {};
    let completed = 0;
    setLoadingProgress({ current: 0, total: newFiles.length });
    for (let i = 0; i < newFiles.length; i += BATCH_SIZE) {
      const batch = newFiles.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(async (file) => {
        try {
          const data = extractChatData(await parseFile(file), file.name);
          return [file.name, {
            format: data.format,
            platform: data.platform || data.format,
            messageCount: data.chat_history?.length || 0,
            conversationCount: 1,
            title: data.meta_info?.title || file.name,
            model: data.meta_info?.model || '',
            created_at: data.meta_info?.created_at,
            updated_at: data.meta_info?.updated_at,
            project: data.meta_info?.project || null,
            project_uuid: data.meta_info?.project_uuid || null,
            organization_id: data.meta_info?.organization_id || null,
            is_starred: data.meta_info?.is_starred || false
          }];
        } catch (err) {
          console.warn(`提取元数据失败 ${file.name}:`, err);
          return [file.name, { format: 'unknown', messageCount: 0, title: file.name }];
        }
      }));
      results.forEach(([name, meta]) => { newMeta[name] = meta; });
      completed += batch.length;
      setLoadingProgress({ current: completed, total: newFiles.length });
    }
    setLoadingProgress({ current: 0, total: 0 });
    // 恢复项目配置中的元数据和文件顺序
    const pendingConfig = StorageManager.get('pending_project_config');
    if (pendingConfig?.files) {
      const configMap = {};
      pendingConfig.files.forEach(f => { configMap[f.name] = f; });
      Object.keys(newMeta).forEach(name => {
        if (configMap[name]?.metadata) {
          newMeta[name] = { ...newMeta[name], ...configMap[name].metadata };
        }
      });
      newFiles.sort((a, b) => {
        const idxA = configMap[a.name]?.index ?? Infinity;
        const idxB = configMap[b.name]?.index ?? Infinity;
        return idxA - idxB;
      });
      StorageManager.remove('pending_project_config');
    }
    setFileMetadata(prev => ({ ...prev, ...newMeta }));
    setFiles(prev => [...prev, ...newFiles]);
    setError(null);
  }, [files, checkCompatibility, parseFile]);

  // 按对话分组（基于 integrity, main_chat, 或 chat_id_hash）
  const groupByConversation = useCallback((filesData) => {
    const groups = new Map();

    // 建立多种映射，用于分支文件查找主文件
    const fileNameToIntegrity = new Map();      // 文件名 -> integrity
    const integrityToGroup = new Map();         // integrity -> groupKey
    const chatIdHashToGroup = new Map();        // chat_id_hash -> groupKey
    const mainChatToGroup = new Map();          // main_chat 值 -> groupKey

    console.log('[Lyra] 开始分组，共', filesData.length, '个文件');

    // 第一遍：收集所有主文件的信息
    filesData.forEach(fd => {
      const metadata = fd.data[0]?.chat_metadata;
      const integrity = metadata?.integrity;
      const mainChat = metadata?.main_chat;
      const chatIdHash = metadata?.chat_id_hash;

      console.log('[Lyra] 文件:', fd.fileName, {
        integrity: integrity?.substring(0, 16) + '...',
        mainChat,
        chatIdHash
      });

      // 如果没有 main_chat，说明是主文件
      if (!mainChat) {
        // 使用文件名（不含扩展名）作为键
        const baseName = fd.fileName.replace(/\.(jsonl|json)$/i, '');

        // 为主文件创建分组键（优先使用 integrity）
        const groupKey = integrity || chatIdHash?.toString() || fd.fileName;

        if (integrity) {
          fileNameToIntegrity.set(baseName, integrity);
          fileNameToIntegrity.set(fd.fileName, integrity);
          integrityToGroup.set(integrity, groupKey);
        }

        if (chatIdHash) {
          chatIdHashToGroup.set(chatIdHash, groupKey);
        }

        // 记录文件名到分组的映射（用于 main_chat 查找）
        mainChatToGroup.set(baseName, groupKey);
        mainChatToGroup.set(fd.fileName, groupKey);
      }
    });

    console.log('[Lyra] 主文件映射:', {
      fileNameToIntegrity: Array.from(fileNameToIntegrity.keys()),
      mainChatToGroup: Array.from(mainChatToGroup.keys())
    });

    // 第二遍：分组
    filesData.forEach(fd => {
      const metadata = fd.data[0]?.chat_metadata;
      const integrity = metadata?.integrity;
      const mainChat = metadata?.main_chat;
      const chatIdHash = metadata?.chat_id_hash;

      let groupKey = null;
      let matchMethod = '';

      if (mainChat) {
        // 分支文件：尝试多种方式查找主文件

        // 方法1：直接通过 main_chat 查找
        if (mainChatToGroup.has(mainChat)) {
          groupKey = mainChatToGroup.get(mainChat);
          matchMethod = 'main_chat直接匹配';
        }
        // 方法2：main_chat + .jsonl 扩展名
        else if (mainChatToGroup.has(mainChat + '.jsonl')) {
          groupKey = mainChatToGroup.get(mainChat + '.jsonl');
          matchMethod = 'main_chat+.jsonl';
        }
        // 方法3：通过 integrity 查找（分支文件可能有相同的 integrity）
        else if (integrity && integrityToGroup.has(integrity)) {
          groupKey = integrityToGroup.get(integrity);
          matchMethod = 'integrity匹配';
        }
        // 方法4：通过 chat_id_hash 查找
        else if (chatIdHash && chatIdHashToGroup.has(chatIdHash)) {
          groupKey = chatIdHashToGroup.get(chatIdHash);
          matchMethod = 'chat_id_hash匹配';
        }
        // 方法5：如果都找不到，使用 main_chat 本身作为分组键
        else {
          groupKey = mainChat;
          matchMethod = 'main_chat作为新组';
          // 同时注册这个分组，以便后续分支文件可以找到
          mainChatToGroup.set(mainChat, groupKey);
          if (integrity) integrityToGroup.set(integrity, groupKey);
          if (chatIdHash) chatIdHashToGroup.set(chatIdHash, groupKey);
        }
      } else {
        // 主文件
        if (integrity && integrityToGroup.has(integrity)) {
          groupKey = integrityToGroup.get(integrity);
          matchMethod = '主文件-integrity';
        } else if (chatIdHash && chatIdHashToGroup.has(chatIdHash)) {
          groupKey = chatIdHashToGroup.get(chatIdHash);
          matchMethod = '主文件-chat_id_hash';
        } else {
          groupKey = integrity || chatIdHash?.toString() || fd.fileName;
          matchMethod = '主文件-新组';
        }
      }

      console.log('[Lyra] 分组:', fd.fileName, '->', groupKey?.substring?.(0, 20) || groupKey, `(${matchMethod})`);

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey).push(fd);
    });

    const result = Array.from(groups.values());
    console.log('[Lyra] 分组结果:', result.map(g => ({
      count: g.length,
      files: g.map(f => f.fileName)
    })));

    return result;
  }, []);

  // 加载并合并 JSONL 文件夹
  const loadMergedJSONLFiles = useCallback(async (fileList) => {
    const jsonlFiles = fileList.filter(f =>
      f.name.endsWith('.jsonl') || f.name.endsWith('.json')
    );

    if (jsonlFiles.length === 0) {
      setError('未找到 JSONL/JSON 文件');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 读取所有文件内容
      const filesData = await Promise.all(
        jsonlFiles.map(async (file) => ({
          file,
          fileName: file.name,
          data: await parseFile(file)
        }))
      );

      // 按对话分组
      const grouped = groupByConversation(filesData);

      // 处理每组文件
      for (const group of grouped) {
        if (group.length === 1) {
          // 单文件：使用普通加载
          await loadFiles([group[0].file]);
        } else {
          // 多文件：使用合并加载
          try {
            const mergedData = extractMergedJSONLData(group);
            const processedMergedData = detectBranches(mergedData);

            // 创建一个虚拟文件对象来表示合并后的数据
            const mergedFileName = `[合并] ${mergedData.meta_info?.title || '对话'}`;
            const virtualFile = new File(
              [JSON.stringify(mergedData.raw_data)],
              mergedFileName,
              { type: 'application/json' }
            );

            // 添加元数据
            const newMeta = {
              [mergedFileName]: {
                format: mergedData.format,
                platform: mergedData.platform || mergedData.format,
                messageCount: mergedData.chat_history?.length || 0,
                conversationCount: 1,
                title: mergedData.meta_info?.title || mergedFileName,
                model: mergedData.meta_info?.model || '',
                created_at: mergedData.meta_info?.created_at,
                updated_at: mergedData.meta_info?.updated_at,
                isMerged: true,
                mergeInfo: mergedData.meta_info?.merge_info
              }
            };

            setFileMetadata(prev => ({ ...prev, ...newMeta }));

            // 存储预处理的数据，避免重复解析
            virtualFile._mergedProcessedData = processedMergedData;

            setFiles(prev => [...prev, virtualFile]);
          } catch (err) {
            console.error('合并文件失败:', err);
            // 如果合并失败，回退到单独加载
            for (const fd of group) {
              await loadFiles([fd.file]);
            }
          }
        }
      }

      setError(null);
    } catch (err) {
      console.error('加载文件夹失败:', err);
      setError(`加载文件夹失败: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [parseFile, groupByConversation, loadFiles]);

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

  // 导出项目配置（文件内容缓存到 IndexedDB，配置文件保持轻量）
  const exportProjectConfig = useCallback(async () => {
    const projectId = `project_${Date.now()}`;

    // 文件内容存 IndexedDB
    const filesData = await Promise.all(files.map(async (file) => ({
      name: file.name,
      content: await file.text(),
      type: file.type,
      lastModified: file.lastModified
    })));
    await ProjectCache.save(projectId, filesData);

    // 配置文件只存元数据
    const config = {
      version: '1.3',
      projectId,
      exportedAt: new Date().toISOString(),
      files: files.map((file, index) => ({
        index,
        name: file.name,
        size: file.size,
        lastModified: file.lastModified,
        type: file.type,
        metadata: fileMetadata[file.name] || {}
      })),
      canvases: CanvasManager.exportAllData(),
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lyra-project-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [files, fileMetadata]);

  // 导入项目配置（自动从 IndexedDB 恢复文件）
  const importProjectConfig = useCallback(async (configFile) => {
    try {
      const text = await configFile.text();
      const config = JSON.parse(text);

      if (!config.version || !config.files) {
        throw new Error('无效的项目配置文件');
      }

      // 恢复画布数据
      if (config.canvases) {
        CanvasManager.importAllData(config.canvases);
      }

      // v1.3: 从 IndexedDB 恢复文件内容
      if (config.projectId) {
        const cached = await ProjectCache.load(config.projectId);
        if (cached) {
          const virtualFiles = cached.map(f =>
            new File([f.content], f.name, { type: f.type || 'application/json', lastModified: f.lastModified })
          );
          StorageManager.set('pending_project_config', config);
          const hasJSONL = virtualFiles.some(f => f.name.endsWith('.jsonl'));
          if (hasJSONL) {
            await loadMergedJSONLFiles(virtualFiles);
          } else {
            await loadFiles(virtualFiles);
          }
          return { success: true, config, canvasRestored: !!config.canvases };
        }
      }

      // 无缓存：需用户手动选择文件
      StorageManager.set('pending_project_config', config);
      return { success: true, config, canvasRestored: !!config.canvases,
        message: `项目配置已加载，包含 ${config.files.length} 个文件。请选择对应的文件以加载项目。` };
    } catch (err) {
      console.error('导入项目配置失败:', err);
      return { success: false, error: err.message };
    }
  }, [loadFiles, loadMergedJSONLFiles]);

  const actions = useMemo(() => ({
    loadFiles,
    loadMergedJSONLFiles,
    removeFile,
    switchFile,
    reorderFiles,
    confirmReplaceFiles,
    cancelReplaceFiles,
    exportProjectConfig,
    importProjectConfig
  }), [loadFiles, loadMergedJSONLFiles, removeFile, switchFile, reorderFiles, confirmReplaceFiles, cancelReplaceFiles, exportProjectConfig, importProjectConfig]);

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
    loadingProgress,
    actions
  };
};

function App() {
  // ==================== Hooks和状态管理 ====================
  // 检测是否在 Chrome 扩展环境中
  const isExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;

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
    loadingProgress,
    actions: fileActions
  } = useFileManager();

  // 状态管理
  const [selectedMessageIndex, setSelectedMessageIndex] = useState(null);
  const [showActionPanel, setShowActionPanel] = useState(false);
  const [actionPanelSection, setActionPanelSection] = useState('globalSearch');
  const [initialSearchQuery, setInitialSearchQuery] = useState('');
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [screenshotPreview, setScreenshotPreview] = useState({
    isOpen: false,
    data: null
  });
  const [viewMode, setViewMode] = useState('conversations');
  const [displayPreference, setDisplayPreference] = useState(() =>
    StorageManager.get('display-preference', 'timeline')
  );
  const [cardSortField, setCardSortField] = useState('created_at');
  const [cardSortOrder, setCardSortOrder] = useState('desc');
  const [selectedFileIndex, setSelectedFileIndex] = useState(null);
  const [selectedConversationUuid, setSelectedConversationUuid] = useState(null);
  const selectedConversation = null; // TODO: 未来可恢复为 state
  const [hideNavbar, setHideNavbar] = useState(false); // 新增：控制导航栏显示
  const [deviceMode, setDeviceMode] = useState(() =>
    StorageUtils.getLocalStorage('device-mode', 'auto')
  ); // 设备模式：'auto' | 'mobile' | 'desktop'
  const [isMobile, setIsMobile] = useState(() => {
    const mode = StorageUtils.getLocalStorage('device-mode', 'auto');
    if (mode === 'mobile') return true;
    if (mode === 'desktop') return false;
    return window.innerWidth < 1024;
  }); // 移动端检测（统一断点：< 1024px）
  const [showMobileDetail, setShowMobileDetail] = useState(false); // 移动端详情显示状态
  const [operatedFiles, setOperatedFiles] = useState(new Set());
  const [scrollPositions, setScrollPositions] = useState({});
  const [, setError] = useState(null); // eslint-disable-line no-unused-vars
  const [sortVersion, setSortVersion] = useState(0);
  const [markVersion, setMarkVersion] = useState(0);
  const [canvasVersion, setCanvasVersion] = useState(0); // 画布导入版本号
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
      scope: 'currentBranch',
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
  const searchResults = { results: [], filteredMessages: [] }; // TODO: 搜索已迁移到 ActionPanel

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const contentAreaRef = useRef(null);

  // 管理器实例引用
  const markManagerRef = useRef(null);
  const starManagerRef = useRef(null);
  const sortManagerRef = useRef(null);
  const whiteboardRef = useRef(null);
  const [canvasState, setCanvasState] = useState({ canvasList: [], activeCanvasId: null });

  // ==================== 管理器初始化 ====================

  // UUID管理
  const currentFileUuid = useMemo(() => {
    return getCurrentFileUuid(viewMode, selectedFileIndex, selectedConversationUuid, processedData, files);
  }, [viewMode, selectedFileIndex, selectedConversationUuid, processedData, files]);

  // 星标系统 - 在对话列表视图中启用
  const shouldUseStarSystem = viewMode === 'conversations';

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

  // 检查所有文件是否都有元数据（加载完成）
  const allFilesLoaded = useMemo(() => {
    if (files.length === 0) return true;
    return files.every(file => fileMetadata[file.name] && fileMetadata[file.name].format !== 'unknown');
  }, [files, fileMetadata]);

  // 集中化构建全局搜索索引（仅在全部文件加载完成后执行）
  useEffect(() => {
    if (files.length > 0 && allFilesLoaded) {
      // 使用 setTimeout 来避免阻塞主线程
      const timer = setTimeout(() => {
        console.log('[App] 正在构建全局搜索索引...');
        const globalSearchManager = getGlobalSearchManager();
        const renameManager = getRenameManager();
        const customNames = renameManager.getAllRenames();

        globalSearchManager.buildGlobalIndex(files, processedData, currentFileIndex, customNames)
          .then(() => {
            console.log('[App] 全局搜索索引已更新');
          })
          .catch(err => {
            console.error('[App] 构建全局搜索索引失败:', err);
          });
      }, 300); // 延迟执行，等待状态稳定

      return () => clearTimeout(timer);
    }
  }, [files, processedData, currentFileIndex, allFilesLoaded]);


  // 监听窗口大小变化，根据设备模式更新移动端状态
  useEffect(() => {
    const handleResize = () => {
      // 只有在自动模式下才响应窗口大小变化
      if (deviceMode === 'auto') {
        setIsMobile(window.innerWidth < 1024);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [deviceMode]);

  // 监听设备模式变化事件
  useEffect(() => {
    const handleDeviceModeChange = (event) => {
      const newMode = event.detail.deviceMode;
      setDeviceMode(newMode);

      // 根据新模式更新 isMobile 状态
      if (newMode === 'mobile') {
        setIsMobile(true);
      } else if (newMode === 'desktop') {
        setIsMobile(false);
      } else {
        // auto 模式：根据当前窗口大小判断
        setIsMobile(window.innerWidth < 1024);
      }
    };

    window.addEventListener('deviceModeChange', handleDeviceModeChange);
    return () => window.removeEventListener('deviceModeChange', handleDeviceModeChange);
  }, []);

  // ==================== History API 导航管理 ====================
  // 使用 ref 保存滚动位置的最新值，避免在 popstate 依赖数组中包含 state
  const scrollPositionsRef = useRef(scrollPositions);
  useEffect(() => {
    scrollPositionsRef.current = scrollPositions;
  }, [scrollPositions]);

  // 初始化 history 状态
  useEffect(() => {
    // 只在首次加载时设置初始状态
    if (!window.history.state) {
      window.history.replaceState(
        { view: 'conversations', initial: true },
        ''
      );
    }
  }, []);

  useEffect(() => {
    const handlePopState = (event) => {
      const state = event.state;

      // 忽略 detail 视图的状态变化（由 ConversationTimeline 处理）
      if (state && state.view === 'detail') {
        return;
      }

      // 忽略面板视图的状态变化（由各面板组件自身的 popstate 处理器处理）
      if (state && (state.view === 'action-panel' || state.view === 'settings-panel' || state.view === 'screenshot-preview')) {
        return;
      }

      if (!state || state.view === 'conversations') {
        setViewMode('conversations');
        setSelectedConversationUuid(null);
        setSelectedFileIndex(null);
        setSearchQuery('');
        setSortVersion(v => v + 1);
        setTimelineDisplayMessages([]);

        // 延迟恢复滚动位置，等待 DOM 更新
        setTimeout(() => {
          if (contentAreaRef.current) {
            const positions = scrollPositionsRef.current;
            const savedPosition = positions['main'] || 0;
            contentAreaRef.current.scrollTop = savedPosition;
          }
        }, 50);
      } else if (state.view === 'timeline' || state.view === 'whiteboard') {
        setViewMode(state.view);
        setSelectedFileIndex(state.fileIndex);
        setSelectedConversationUuid(state.convUuid);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // ==================== 数据计算 - 使用DataProcessor简化 ====================

  const rawConversations = useMemo(() =>
    DataProcessor.getRawConversations(viewMode, processedData, currentFileIndex, files, fileMetadata),
    [viewMode, processedData, currentFileIndex, files, fileMetadata, renameVersion]
  );

  const {
    filters,
    filteredConversations,
    availableProjects,
    availableOrganizations,
    filterStats,
    actions: filterActions
  } = useFullExportCardFilter(rawConversations, operatedFiles, allFilesLoaded, starManagerRef.current, starredConversations);

  const fileCards = useMemo(() =>
    DataProcessor.getFileCards(viewMode, processedData, files, currentFileIndex, fileMetadata, t),
    [files, currentFileIndex, processedData, fileMetadata, viewMode, t, renameVersion]
  );

  const allCards = useMemo(() => {
    // 对话视图模式，应用筛选到 fileCards
    if (viewMode === 'conversations') {
      const filteredUuids = new Set(filteredConversations.map(c => c.uuid));
      const filtered = fileCards.filter(card => filteredUuids.has(card.uuid));
      // 应用卡片排序
      return [...filtered].sort((a, b) => {
        let cmp = 0;
        if (cardSortField === 'created_at') {
          const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
          cmp = ta - tb;
        } else if (cardSortField === 'name') {
          cmp = (a.name || '').localeCompare(b.name || '');
        } else if (cardSortField === 'messageCount') {
          cmp = (a.messageCount || 0) - (b.messageCount || 0);
        } else if (cardSortField === 'size') {
          cmp = (a.size || 0) - (b.size || 0);
        }
        return cardSortOrder === 'asc' ? cmp : -cmp;
      });
    }

    return fileCards;
  }, [viewMode, filteredConversations, fileCards, cardSortField, cardSortOrder]);

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
    if (sortManagerRef.current && (viewMode === 'timeline' || viewMode === 'whiteboard') && timelineMessages.length > 0) {
      const sorted = sortManagerRef.current.getSortedMessages();
      if (sorted.length !== timelineMessages.length) {
        return timelineMessages;
      }
      return sorted;
    }
    return timelineMessages;
  }, [timelineMessages, viewMode, sortVersion]);

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
      fileMetadata
    });
  }, [viewMode, selectedFileIndex, selectedConversationUuid, processedData, files, currentFileIndex, fileMetadata, renameVersion]);

  const isFullExportConversationMode = viewMode === 'conversations';

  // ==================== AI Chat 集成 ====================

  // 初始化 AI Chat - 从 localStorage 加载配置
  useEffect(() => {
    // 从 localStorage 读取配置（由 SettingsManager 管理）
    const config = StorageManager.get('ai-chat-config');
    if (config) {
      // 配置 chatService
      chatService.configure(config);
      console.log('[App] AI Chat configured from localStorage');
    }

    // 初始化 AI Chat（注册内置 MCP 等）
    initLyraAIChat();
  }, []);

  // 注意：上下文初始化和追踪逻辑已统一移至 ConversationTimeline.js
  // ConversationTimeline 在文件切换时调用 initContext，在分支选择后追踪消息
  // 这样可以避免 setTimeout 导致的时序问题（initContext 在追踪后执行清空上下文）

  // ==================== 事件处理函数 ====================

  const postMessageHandler = useMemo(() => {
    return new PostMessageHandler(fileActions, setError);
  }, [fileActions]);

  const handleFileLoad = async (e) => {
    const fileList = Array.from(e.target.files);
    if (fileList.length === 0) return;

    // Check if first file is a project config (single .json file with project structure)
    if (fileList.length === 1 && fileList[0].name.endsWith('.json')) {
      const firstFile = fileList[0];
      const text = await firstFile.text();

      // Try to detect project file structure
      try {
        const json = JSON.parse(text);
        if (json.version && Array.isArray(json.files)) {
          // This is a project config file, route to import
          const result = await fileActions.importProjectConfig(firstFile);
          if (result.success) {
            if (result.canvasRestored) {
              setCanvasVersion(v => v + 1);
            }
            if (result.message) alert(result.message);
          } else {
            alert(`导入失败: ${result.error}`);
          }
          return;
        }
      } catch {
        // Not a valid JSON or not a project file, continue as normal conversation file
      }
    }

    // Handle as regular conversation files
    const hasJSONL = fileList.some(f => f.name.endsWith('.jsonl'));
    if (hasJSONL) {
      fileActions.loadMergedJSONLFiles(fileList);
    } else {
      fileActions.loadFiles(fileList);
    }
  };

  // 文件夹加载处理
  const handleFolderLoad = (e) => {
    const fileList = Array.from(e.target.files);
    fileActions.loadMergedJSONLFiles(fileList);
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

    // 从卡片进入始终使用时间线模式
    const targetView = 'timeline';

    if (card.type === 'file') {
      const needsFileSwitch = card.fileIndex !== currentFileIndex;

      if (needsFileSwitch) {
        fileActions.switchFile(card.fileIndex);
        setTimeout(() => {
          setSelectedFileIndex(card.fileIndex);
          setSelectedConversationUuid(null);
          // 添加 history 记录
          window.history.pushState(
            { view: targetView, fileIndex: card.fileIndex, convUuid: null },
            ''
          );
          setViewMode(targetView);
        }, 100);
      } else {
        setSelectedFileIndex(card.fileIndex);
        setSelectedConversationUuid(null);
        // 添加 history 记录
        window.history.pushState(
          { view: targetView, fileIndex: card.fileIndex, convUuid: null },
          ''
        );
        setViewMode(targetView);
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
          // 添加 history 记录
          window.history.pushState(
            { view: targetView, fileIndex, convUuid: conversationUuid },
            ''
          );
          setViewMode(targetView);
        }, 100);
      } else {
        setSelectedFileIndex(fileIndex);
        setSelectedConversationUuid(conversationUuid);
        // 添加 history 记录
        window.history.pushState(
          { view: targetView, fileIndex, convUuid: conversationUuid },
          ''
        );
        setViewMode(targetView);
      }
    }
  }, [currentFileIndex, fileActions, viewMode, currentFile, displayPreference]);

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

  const handleBackToConversations = useCallback(() => {
    // 保存当前滚动位置（如果在 timeline/whiteboard 视图中）
    if (contentAreaRef.current && (viewMode === 'timeline' || viewMode === 'whiteboard')) {
      const key = selectedFileIndex !== null ? `file-${selectedFileIndex}` : 'main';
      setScrollPositions(prev => ({
        ...prev,
        [key]: contentAreaRef.current.scrollTop
      }));
    }

    // 直接回到 conversations 视图，避免 history.back() 回退到历史栈中残留的 whiteboard 状态
    setViewMode('conversations');
    setSelectedFileIndex(null);
    setSelectedConversationUuid(null);
    setSearchQuery('');
    setSortVersion(v => v + 1);
    setTimelineDisplayMessages([]);

    window.history.replaceState(
      { view: 'conversations', initial: false },
      ''
    );

    setTimeout(() => {
      if (contentAreaRef.current) {
        const savedPosition = scrollPositions['main'] || 0;
        contentAreaRef.current.scrollTop = savedPosition;
      }
    }, 50);
  }, [viewMode, selectedFileIndex, scrollPositions]);

  // 视图模式偏好切换
  const handleDisplayPreferenceChange = useCallback((pref) => {
    setDisplayPreference(pref);
    StorageManager.set('display-preference', pref);
  }, []);

  // 导出项目配置
  const handleExportProject = useCallback(() => {
    fileActions.exportProjectConfig();
  }, [fileActions]);

  // 导入项目配置
  const handleImportProject = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const result = await fileActions.importProjectConfig(file);
        if (result.success) {
          if (result.canvasRestored) {
            setCanvasVersion(v => v + 1);
          }
          if (result.message) alert(result.message);
        } else {
          alert(`导入失败: ${result.error}`);
        }
      }
    };
    input.click();
  }, [fileActions]);

  const handleMarkToggle = (messageIndex, markType) => {
    if (markManagerRef.current) {
      markManagerRef.current.toggleMark(messageIndex, markType);

      if ((viewMode === 'timeline' || viewMode === 'whiteboard') && selectedFileIndex !== null) {
        const file = files[selectedFileIndex];
        if (file) {
          const fileUuid = generateFileCardUuid(selectedFileIndex, file);

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

  const handleItemRename = () => {
    // 强制刷新视图以应用重命名
    setRenameVersion(v => v + 1);
    setSortVersion(v => v + 1);
    setMarkVersion(v => v + 1);
  };

  // 打开截图预览面板
  const openScreenshotPreview = (data) => {
    setScreenshotPreview({ isOpen: true, data });
    setShowActionPanel(false); // 关闭操作面板
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
      displayMessages: (viewMode === 'timeline' || viewMode === 'whiteboard') ? timelineDisplayMessages : null, // 使用从 ConversationTimeline/WhiteboardView 传回的实际显示消息
      openScreenshotPreview, // 新增：打开截图预览面板
      currentTheme: ThemeUtils.getCurrentTheme(), // 新增：当前主题
      conversation: selectedConversation // 新增：当前对话信息
    });

    if (success) {
      setShowActionPanel(false);
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
            StorageManager.remove(`marks_${currentFileUuid}`);
            StorageManager.remove(`message_order_${currentFileUuid}`);
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

    const allKeys = StorageManager.getAllKeys();
    const keysToRemove = allKeys.filter(key =>
      key.startsWith('marks_') || key.startsWith('message_order_')
    );

    keysToRemove.forEach(key => StorageManager.remove(key));
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

  // 获取统计 - 使用 useMemo 缓存结果，避免重复计算
  const stats = useMemo(() => {
    return StatsCalculator.getStats({
      viewMode,
      allCards,
      sortedMessages,
      timelineMessages,
      files,
      markManagerRef,
      starManagerRef,
      shouldUseStarSystem,
      currentConversation
    });
  }, [viewMode, allCards, sortedMessages, timelineMessages, files, shouldUseStarSystem, currentConversation, processedData, currentFileIndex, markVersion]);

  // ==================== 副作用 ====================

  useEffect(() => {
    if ((viewMode === 'timeline' || viewMode === 'whiteboard') && timelineMessages.length > 0) {
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

        if (StorageManager.get(marksKey) || StorageManager.get(sortKey)) {
          operatedSet.add(fileUuid);
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

  // Chrome 扩展模式：从 chrome.storage 读取待处理数据
  useEffect(() => {
    if (!isExtension) return;

    console.log('[Lyra App] Running in Chrome extension mode');

    // 检查是否有待处理的数据
    chrome.storage.local.get(['lyra_pending_data'], (result) => {
      if (result.lyra_pending_data) {
        const { content, filename } = result.lyra_pending_data;
        console.log('[Lyra App] Found pending data from extension:', filename);

        // 创建文件对象并加载
        try {
          const jsonData = typeof content === 'string' ? content : JSON.stringify(content);
          const blob = new Blob([jsonData], { type: 'application/json' });
          const file = new File([blob], filename, {
            type: 'application/json',
            lastModified: Date.now()
          });

          // 加载文件
          fileActions.loadFiles([file]);

          // 清除已处理的数据
          chrome.storage.local.remove(['lyra_pending_data']);
          console.log('[Lyra App] Data loaded successfully, waiting for file processing...');

        } catch (error) {
          console.error('[Lyra App] Error loading data from extension:', error);
          setError('Failed to load data from extension: ' + error.message);
        }
      }
    });
  }, [isExtension, fileActions, setError]);

  // Chrome 扩展模式：监听文件加载完成，自动切换到时间线视图
  useEffect(() => {
    if (isExtension && files.length > 0 && viewMode !== 'timeline') {
      console.log('[Lyra App] Files loaded in extension mode, switching to timeline view');
      setViewMode('timeline');
      fileActions.switchFile(0);
    }
  }, [isExtension, files, viewMode, fileActions]);

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
      <input
        ref={folderInputRef}
        type="file"
        webkitdirectory="true"
        multiple
        onChange={handleFolderLoad}
        style={{ display: 'none' }}
      />

      {files.length === 0 ? (
        <WelcomePage
          handleLoadClick={() => fileInputRef.current?.click()}
          handleFolderClick={() => folderInputRef.current?.click()}
        />
      ) : (
        <>
          {/* 顶部导航栏 */}
          <nav className={`navbar-redesigned ${hideNavbar ? 'hide-on-mobile' : ''}`}>
            <div className="navbar-left">
              <div className="logo">
              <span className="whiteboard-toolbar-title">LYRA</span>
              </div>

              {(viewMode === 'timeline' || viewMode === 'whiteboard') && !isExtension && (
                <button
                  className="btn-secondary small"
                  onClick={handleBackToConversations}
                >
                  ← {t('app.navbar.backToList')}
                </button>
              )}
              {/* 移动端：显示搜索按钮（白板模式隐藏） */}
              {isMobile && viewMode !== 'whiteboard' && (
                <button
                  className="btn-secondary small"
                  disabled={!allFilesLoaded && files.length > 0}
                  onClick={() => {
                    setActionPanelSection('globalSearch');
                    setShowActionPanel(true);
                  }}
                >
                  🔍
                </button>
              )}

              {viewMode !== 'whiteboard' && (
                <button
                  className="btn-secondary small"
                  onClick={() => {
                    setActionPanelSection('semanticSearch');
                    setShowActionPanel(true);
                  }}
                >
                  🔮
                </button>
              )}

              {/* 桌面端：显示搜索框（白板模式隐藏） */}
              {!isMobile && viewMode !== 'whiteboard' && (
                <EnhancedSearchBox
                  onSearch={(query) => {
                    setInitialSearchQuery(query);
                    setActionPanelSection('globalSearch');
                    setShowActionPanel(true);
                  }}
                  onExpand={(query) => {
                    setInitialSearchQuery(query || '');
                    setActionPanelSection('globalSearch');
                    setShowActionPanel(true);
                  }}
                  disabled={!allFilesLoaded && files.length > 0}
                />
              )}
              {/* 文件加载进度提示 */}
              {loadingProgress.total > 0 && (
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                  {loadingProgress.current}/{loadingProgress.total}
                </span>
              )}
            </div>
            <div className="navbar-right">
              {/* 白板模式：画布选择器 + 控制按钮 */}
              {viewMode === 'whiteboard' && (
                <>
                  <CanvasSelector
                    canvasList={canvasState.canvasList}
                    activeCanvasId={canvasState.activeCanvasId}
                    onSwitch={(id) => whiteboardRef.current?.switchCanvas(id)}
                    onCreate={(name) => whiteboardRef.current?.createCanvas(name)}
                    onRename={(id, name) => whiteboardRef.current?.renameCanvas(id, name)}
                    onDelete={(id) => whiteboardRef.current?.deleteCanvas(id)}
                  />
                  <button
                    className="btn-secondary small"
                    onClick={() => whiteboardRef.current?.togglePicker()}
                  >
                    + {t('whiteboard.addCard')}
                  </button>
                  <button
                    className="btn-secondary small"
                    onClick={() => whiteboardRef.current?.resetView()}
                  >
                    {t('whiteboard.resetLayout') || 'Reset'}
                  </button>
                </>
              )}

              {/* 白板/时间线切换 - 位于设置按钮左边 */}
              {!isMobile && (viewMode === 'timeline' || viewMode === 'whiteboard') && (
                <div className="view-mode-toggle">
                  <button
                    className={`view-mode-toggle-btn ${viewMode === 'whiteboard' ? 'active' : ''}`}
                    onClick={() => {
                      setViewMode('whiteboard');
                      handleDisplayPreferenceChange('whiteboard');
                      window.history.replaceState(
                        { ...window.history.state, view: 'whiteboard' },
                        ''
                      );
                    }}
                  >
                    {t('cardGrid.whiteboardMode')}
                  </button>
                  <button
                    className={`view-mode-toggle-btn ${viewMode === 'timeline' ? 'active' : ''}`}
                    onClick={() => {
                      setViewMode('timeline');
                      handleDisplayPreferenceChange('timeline');
                      window.history.replaceState(
                        { ...window.history.state, view: 'timeline' },
                        ''
                      );
                    }}
                  >
                    {t('cardGrid.timelineMode')}
                  </button>
                </div>
              )}

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
              {/* 统计面板 - 在扩展模式和白板模式下隐藏 */}
              {!isExtension && viewMode !== 'whiteboard' && (
                <div className="stats-panel">
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-value">{stats.totalMessages}</div>
                      <div className="stat-label">{t('app.stats.totalMessages')}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{stats.conversationCount}</div>
                      <div className="stat-label">{t('app.stats.conversationCount')}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{stats.fileCount}</div>
                      <div className="stat-label">{t('app.stats.fileCount')}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{stats.markedCount}</div>
                      <div className="stat-label">{t('app.stats.markedCount')}</div>
                    </div>
                    {isFullExportConversationMode && shouldUseStarSystem && (
                      <div className="stat-card">
                        <div className="stat-value">{stats.starredCount}</div>
                        <div className="stat-label">{t('app.stats.starredCount')}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 视图内容 */}
              <div className="view-content">
                {viewMode === 'conversations' ? (
                  <CardGrid
                    items={displayedItems}
                    selectedItem={selectedConversation}
                    starredItems={starredConversations}
                    onItemSelect={handleCardSelect}
                    onItemStar={shouldUseStarSystem ? handleStarToggle : null}
                    onItemRemove={handleFileRemove}
                    onItemRename={handleItemRename}
                    onAddItem={() => fileInputRef.current?.click()}
                    sortField={cardSortField}
                    sortOrder={cardSortOrder}
                    onSortChange={(field, order) => {
                      setCardSortField(field);
                      setCardSortOrder(order);
                    }}
                    filterProps={isFullExportConversationMode ? {
                      filters,
                      availableProjects,
                      availableOrganizations,
                      filterStats,
                      onFilterChange: filterActions.setFilter,
                      onReset: filterActions.resetFilters,
                      onClearAllMarks: handleClearAllFilesMarks,
                      onExportProject: handleExportProject,
                      onImportProject: handleImportProject,
                      onRestoreStars: () => {
                        const newStars = starManagerRef.current.clearAllStars();
                        setStarredConversations(newStars);
                      },
                      operatedCount: operatedFiles.size,
                      disabled: !allFilesLoaded
                    } : null}
                  />
                ) : viewMode === 'whiteboard' ? (
                  <WhiteboardView
                    ref={whiteboardRef}
                    marks={currentMarks}
                    markActions={markActions}
                    format={processedData?.format}
                    searchQuery={searchQuery}
                    onHideNavbar={setHideNavbar}
                    files={files}
                    fileMetadata={fileMetadata}
                    currentFileIndex={currentFileIndex}
                    processedData={processedData}
                    canvasVersion={canvasVersion}
                    onCanvasStateChange={setCanvasState}
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
                    onMobileDetailChange={setShowMobileDetail}
                  />
                )}
              </div>
            </div>
          </div>

          {/* 悬浮导出按钮 - 移动端查看消息详情时隐藏 */}
          <FloatingActionButton
            onClick={() => {
              const lastExportFormat = StorageManager.get('last_export_format', 'exportMarkdown');
              setActionPanelSection(lastExportFormat);
              setShowActionPanel(true);
            }}
            title={t('app.export.button')}
            hidden={(isMobile && showMobileDetail) || viewMode === 'whiteboard'}
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

          {/* 操作面板 - 整合全局搜索、语义搜索、导出功能 */}
          <ActionPanel
            isOpen={showActionPanel}
            onClose={() => {
              setShowActionPanel(false);
              setInitialSearchQuery('');
            }}
            initialSection={actionPanelSection}
            initialSearchQuery={initialSearchQuery}
            onNavigateToMessage={handleNavigateToMessage}
            files={files}
            processedData={processedData}
            currentFileIndex={currentFileIndex}
            exportOptions={exportOptions}
            setExportOptions={setExportOptions}
            viewMode={viewMode}
            currentBranchState={currentBranchState}
            operatedFiles={operatedFiles}
            stats={stats}
            starManagerRef={starManagerRef}
            shouldUseStarSystem={shouldUseStarSystem}
            isFullExportConversationMode={isFullExportConversationMode}
            allCards={allCards}
            onExport={handleExportClick}
          />
          {/* 长截图预览面板 */}
          {screenshotPreview.isOpen && screenshotPreview.data && (
            <ScreenshotPreviewPanel
              {...screenshotPreview.data}
              isOpen={screenshotPreview.isOpen}
              onClose={closeScreenshotPreview}
            />
          )}

          {/* AI Chat 浮窗 - 仅在非 Chrome 扩展模式下显示 */}
          {!isExtension && (
            <>
              <FloatPanel />
              {viewMode !== 'whiteboard' && <FloatPanelTrigger position="bottom-left" />}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default App;
