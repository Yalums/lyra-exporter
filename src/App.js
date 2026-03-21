// App.js

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import './styles/index.css';
import { ArrowLeft, FileArchive, RefreshCw } from 'lucide-react';

// 组件导入
import ConversationTimeline from './components/ConversationTimeline';
import FloatingActionButton from './components/FloatingActionButton';
import SearchOverlay from './components/SearchOverlay';
import { CardGrid } from './components/UnifiedCard';
import SettingsPanel from './components/SettingsPanel';
// 工具函数导入
import { ThemeUtils } from './utils/themeManager';
import { DataProcessor } from './utils/data';
import { extractChatData, detectBranches, parseJSONL, extractMergedJSONLData } from './utils/fileParser';
import {
  generateFileCardUuid,
  getCurrentFileUuid,
} from './utils/data/uuidManager';
import { MarkManager } from './utils/data/markManager';
import { StarManager } from './utils/data/starManager';
import StorageManager from './utils/data/storageManager.js';

import { getGlobalSearchManager } from './utils/globalSearchManager';
import { getRenameManager } from './utils/data/renameManager.js';
import { prepareMarkdownExport, downloadMarkdownExport } from './utils/markdownExporter';
import { useI18n, setResolvedLang } from './index.js';


// ==================== 筛选 Hook ====================
const useFullExportCardFilter = (conversations = [], operatedUuids = new Set(), enabled = true, starManagerRef = null, starredMap = null) => {
  const [filters, setFilters] = useState({
    name: '',
    dateRange: 'all',
    customDateStart: '',
    customDateEnd: '',
    project: 'all',
    organization: 'all',
    operated: 'all',
    starred: 'all'
  });

  const availableProjects = useMemo(() => {
    if (!enabled) return [];
    const projects = new Map();
    conversations.forEach(conv => {
      if (conv.project && conv.project.uuid) {
        projects.set(conv.project.uuid, conv.project);
      }
    });
    return Array.from(projects.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [conversations, enabled]);

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

  const filteredConversations = useMemo(() => {
    if (!enabled) return conversations;
    return conversations.filter(conv => {
      if (filters.name.trim()) {
        const nameMatch = conv.name?.toLowerCase().includes(filters.name.toLowerCase());
        const projectMatch = conv.project?.name?.toLowerCase().includes(filters.name.toLowerCase());
        if (!nameMatch && !projectMatch) return false;
      }
      if (filters.project !== 'all') {
        if (filters.project === 'no_project') {
          if (conv.project && conv.project.uuid) return false;
        } else {
          if (!conv.project || conv.project.uuid !== filters.project) return false;
        }
      }
      if (filters.organization !== 'all') {
        if (filters.organization === 'no_organization') {
          if (conv.organization_id) return false;
        } else {
          if (!conv.organization_id || conv.organization_id !== filters.organization) return false;
        }
      }
      if (filters.operated !== 'all') {
        const isOperated = operatedUuids.has(conv.uuid);
        if (filters.operated === 'operated' && !isOperated) return false;
        if (filters.operated === 'unoperated' && isOperated) return false;
      }
      if (filters.starred === 'starred' && starManagerRef?.current) {
        if (!starManagerRef.current.isStarred(conv.uuid, conv.is_starred || false)) return false;
      }
      if (filters.dateRange !== 'all' && conv.created_at) {
        try {
          const convDate = new Date(conv.created_at);
          const now = new Date();
          switch (filters.dateRange) {
            case 'today': {
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const convDay = new Date(convDate.getFullYear(), convDate.getMonth(), convDate.getDate());
              if (convDay.getTime() !== today.getTime()) return false;
              break;
            }
            case 'week':
              if (convDate < new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)) return false;
              break;
            case 'month':
              if (convDate < new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)) return false;
              break;
            case 'custom':
              if (filters.customDateStart && convDate < new Date(filters.customDateStart)) return false;
              if (filters.customDateEnd && convDate > new Date(filters.customDateEnd + 'T23:59:59')) return false;
              break;
            default: break;
          }
        } catch (error) {
          console.warn('日期解析失败:', conv.created_at);
        }
      }
      return true;
    });
  }, [conversations, filters, operatedUuids, enabled, starredMap]);

  const setFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      name: '', dateRange: 'all', customDateStart: '', customDateEnd: '',
      project: 'all', organization: 'all', operated: 'all', starred: 'all'
    });
  }, []);

  const filterStats = useMemo(() => {
    const hasActiveFilters = filters.name.trim() ||
      filters.dateRange !== 'all' || filters.project !== 'all' ||
      filters.organization !== 'all' || filters.operated !== 'all' || filters.starred !== 'all';
    return {
      total: conversations.length,
      filtered: filteredConversations.length,
      hasActiveFilters,
      activeFilterCount: [
        filters.name.trim(), filters.dateRange !== 'all', filters.project !== 'all',
        filters.organization !== 'all', filters.operated !== 'all', filters.starred !== 'all'
      ].filter(Boolean).length
    };
  }, [conversations.length, filteredConversations.length, filters]);

  return {
    filters, filteredConversations, availableProjects, availableOrganizations, filterStats,
    actions: { setFilter, resetFilters }
  };
};

/**
 * 导航栏搜索框组件
 */
function NavSearchBox({ onSearch, onExpand, onGlobalSearch, disabled = false }) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const searchInputRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      e.preventDefault();
      onSearch?.(query.trim());
    }
  };

  const handleExpand = () => {
    onExpand?.(query.trim());
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        onGlobalSearch?.();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onGlobalSearch]);

  const radius = 6;
  return (
    <div className="nav-search-box" style={{ flex: 1, maxWidth: 600, margin: '4px 0', alignSelf: 'stretch', display: 'flex', alignItems: 'stretch' }}>
      <div style={{
        flex: 1, display: 'flex', alignItems: 'stretch',
        background: 'var(--bg-secondary)',
        border: 'none',
        borderRadius: radius,
        position: 'relative',
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? 'none' : undefined,
      }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'stretch', position: 'relative' }}>
          <input
            ref={searchInputRef}
            type="text"
            className="navbar-search-input"
            placeholder={t('search.placeholderAll')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              padding: query ? '0 64px 0 12px' : '0 12px',
              fontSize: 13,
              color: 'var(--text-primary)',
            }}
          />
          {query && (
            <>
              <button
                onClick={handleExpand}
                title={t('search.expandPanel')}
                style={{
                  position: 'absolute', right: 32, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-tertiary)',
                  fontSize: 10, cursor: 'pointer', padding: '4px 6px', transition: 'color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
              >⤢</button>
              <button
                onClick={() => setQuery('')}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-tertiary)',
                  fontSize: 14, cursor: 'pointer', padding: 4, transition: 'color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
              >×</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


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
        console.log('[Loominary] 使用预处理的合并数据');
        setProcessedData(file._mergedProcessedData);
      } else {
        console.log('[Loominary processCurrentFile] parsing file:', file.name, file.size, 'bytes');
        const jsonData = await parseFile(file);
        console.log('[Loominary processCurrentFile] parseFile OK - top-level keys:', Array.isArray(jsonData) ? `Array[${jsonData.length}]` : Object.keys(jsonData));
        let data = extractChatData(jsonData, file.name);
        console.log('[Loominary processCurrentFile] extractChatData OK - format:', data?.format, 'chat_history length:', data?.chat_history?.length);
        data = detectBranches(data);
        console.log('[Loominary processCurrentFile] detectBranches OK');
        setProcessedData(data);
      }
    } catch (err) {
      console.error('[Loominary processCurrentFile] 处理文件出错:', err);
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
  const loadFiles = useCallback(async (fileList, { replace = false } = {}) => {
    const validFiles = fileList.filter(f =>
      f.name.endsWith('.json') || f.name.endsWith('.jsonl') || f.type === 'application/json'
    );
    if (!validFiles.length) {
      setError('未找到有效的JSON/JSONL文件');
      return;
    }
    const newFiles = replace ? validFiles : validFiles.filter(nf =>
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
    setFileMetadata(replace ? newMeta : (prev => ({ ...prev, ...newMeta })));
    setFiles(replace ? newFiles : (prev => [...prev, ...newFiles]));
    if (replace) setCurrentFileIndex(0);
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

    console.log('[Loominary] 开始分组，共', filesData.length, '个文件');

    // 第一遍：收集所有主文件的信息
    filesData.forEach(fd => {
      const metadata = fd.data[0]?.chat_metadata;
      const integrity = metadata?.integrity;
      const mainChat = metadata?.main_chat;
      const chatIdHash = metadata?.chat_id_hash;

      console.log('[Loominary] 文件:', fd.fileName, {
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

    console.log('[Loominary] 主文件映射:', {
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

      console.log('[Loominary] 分组:', fd.fileName, '->', groupKey?.substring?.(0, 20) || groupKey, `(${matchMethod})`);

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey).push(fd);
    });

    const result = Array.from(groups.values());
    console.log('[Loominary] 分组结果:', result.map(g => ({
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

  const actions = useMemo(() => ({
    loadFiles,
    loadMergedJSONLFiles,
    removeFile,
    switchFile,
    reorderFiles,
    confirmReplaceFiles,
    cancelReplaceFiles
  }), [loadFiles, loadMergedJSONLFiles, removeFile, switchFile, reorderFiles, confirmReplaceFiles, cancelReplaceFiles]);

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
  /* global chrome */
  const isExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;

  // i18n
  const { t } = useI18n();

  const {
    files,
    currentFile,
    currentFileIndex,
    processedData,
    fileMetadata,
    loadingProgress,
    actions: fileActions
  } = useFileManager();

  // 状态管理
  const [selectedMessageIndex, setSelectedMessageIndex] = useState(null);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [searchOverlayQuery, setSearchOverlayQuery] = useState('');
  const [viewMode, setViewMode] = useState('conversations');
  const [selectedFileIndex, setSelectedFileIndex] = useState(null);
  const [selectedConversationUuid, setSelectedConversationUuid] = useState(null);
  const [operatedFiles, setOperatedFiles] = useState(new Set());
  const [, setError] = useState(null); // eslint-disable-line no-unused-vars
  // 预览模式下随 JSON 一起传入的导出上下文（project 信息 + 用户记忆）
  const [pendingExportContext, setPendingExportContext] = useState(null);
  // browse_all 模式：从 content script 传入的对话列表（元数据卡片）
  const [browseAllCards, setBrowseAllCards] = useState([]);
  const [cardSortField, setCardSortField] = useState('created_at');
  const [cardSortOrder, setCardSortOrder] = useState('desc');
  const [starredConversations, setStarredConversations] = useState(new Map());
  const starManagerRef = useRef(null);
  const browseAllContextRef = useRef(null); // { userId, baseUrl }
  const pendingSelectIndexRef = useRef(null); // 卡片点击后待选中的文件 index
  const [browseAllCurrentIndex, setBrowseAllCurrentIndex] = useState(null); // 当前在 sortedBrowseCards 中的位置
  const [hasZipData, setHasZipData] = useState(false); // 是否从 zip 导入了完整数据
  // 映射：原始对话UUID ↔ fileUuid（文件hash），用于 rename 同步
  const uuidMapRef = useRef({ toFile: new Map(), toCard: new Map() });
  // zipæ¨¡å¼ä¸å½åæå¼çå¡ç claude uuidï¼ç¨äº rename key å¯¹é½ï¼
  const openedCardUuidRef = useRef(null);
  // zip 模式：记录已加载的卡片 uuid → files 数组中的 index，避免重复 append
  const cardFileIndexMapRef = useRef(new Map());

  // Stable refs for use in one-time effects (avoid re-triggering on function identity change)
  const fileActionsRef = useRef(fileActions);
  fileActionsRef.current = fileActions;
  const setErrorRef = useRef(setError);
  setErrorRef.current = setError;
  const setViewModeRef = useRef(setViewMode);
  setViewModeRef.current = setViewMode;
  const setBrowseAllCardsRef = useRef(setBrowseAllCards);
  setBrowseAllCardsRef.current = setBrowseAllCards;
  const setBrowseAllCurrentIndexRef = useRef(setBrowseAllCurrentIndex);
  setBrowseAllCurrentIndexRef.current = setBrowseAllCurrentIndex;

  // 非时间线视图的 view-content 滚动容器 ref（用于自动隐藏顶栏）
  const viewContentRef = useRef(null);
  const viewContentLastScrollTopRef = useRef(0);

  // 非时间线视图：监听 view-content 滚动，自动隐藏/显示顶栏
  useEffect(() => {
    if (viewMode === 'timeline') return;
    const el = viewContentRef.current;
    if (!el) return;

    viewContentLastScrollTopRef.current = 0;
    document.documentElement.classList.remove('navbar-hidden');

    const handleScroll = () => {
      const currentScrollTop = el.scrollTop;
      if (currentScrollTop > viewContentLastScrollTopRef.current && currentScrollTop > 80) {
        document.documentElement.classList.add('navbar-hidden');
      } else if (currentScrollTop < viewContentLastScrollTopRef.current) {
        document.documentElement.classList.remove('navbar-hidden');
      }
      viewContentLastScrollTopRef.current = currentScrollTop;
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', handleScroll);
      document.documentElement.classList.remove('navbar-hidden');
    };
  }, [viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const [markVersion, setMarkVersion] = useState(0);
  const [renameVersion, setRenameVersion] = useState(0);
  const [currentBranchState, setCurrentBranchState] = useState({
    showAllBranches: false,
    currentBranchIndexes: new Map()
  });
  const [timelineDisplayMessages, setTimelineDisplayMessages] = useState([]); // 新增：存储时间线中实际显示的消息（经过分支过滤）
  const [exportOptions, setExportOptions] = useState(() => {
    const savedExportConfig = StorageManager.get('export-config', {});
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

  // 设置面板（仅 GitHub Pages / 独立模式）
  const [showSettings, setShowSettings] = useState(() =>
    !!(new URLSearchParams(window.location.search).get('settings'))
  );

  // 搜索状态
  const [searchQuery, setSearchQuery] = useState('');
  const searchResults = { results: [], filteredMessages: [] }; // 搜索已迁移到 SearchOverlay

  // 管理器实例引用
  const markManagerRef = useRef(null);
  // ==================== 管理器初始化 ====================

  // UUID管理
  const currentFileUuid = useMemo(() => {
    return getCurrentFileUuid(viewMode, selectedFileIndex, selectedConversationUuid, processedData, files);
  }, [viewMode, selectedFileIndex, selectedConversationUuid, processedData, files]);

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

  // browse_all 筛选与排序
  const {
    filters,
    filteredConversations,
    availableProjects,
    availableOrganizations,
    filterStats,
    actions: filterActions
  } = useFullExportCardFilter(browseAllCards, operatedFiles, viewMode === 'conversations', starManagerRef, starredConversations);

  const sortedBrowseCards = useMemo(() => {
    // zip 模式下从 renameManager 注入重命名后的名称
    let cards;
    if (hasZipData) {
      const rm = getRenameManager();
      cards = filteredConversations.map(c => {
        // zip 模式：rename key 统一用 claude uuid（c.uuid），与 ConversationTimeline 对齐
        const renamed = rm.getRename(c.uuid, null);
        return renamed ? { ...c, name: renamed, _originalName: c._originalName || c.name } : c;
      });
    } else {
      cards = [...filteredConversations];
    }
    cards.sort((a, b) => {
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
    return cards;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredConversations, cardSortField, cardSortOrder, hasZipData, renameVersion]);

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


  // ==================== History API 导航管理 ====================
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
        setTimelineDisplayMessages([]);
      } else if (state.view === 'timeline') {
        setViewMode(state.view);
        setSelectedFileIndex(state.fileIndex);
        setSelectedConversationUuid(state.convUuid);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // ==================== 数据计算 - 使用DataProcessor简化 ====================

  const timelineMessages = useMemo(() =>
    DataProcessor.getTimelineMessages(viewMode, selectedFileIndex, currentFileIndex, processedData, selectedConversationUuid),
    [viewMode, processedData, selectedConversationUuid, selectedFileIndex, currentFileIndex]
  );

  const displayedItems = useMemo(() => {
    if (!searchQuery) return timelineMessages;
    return searchResults.filteredMessages;
  }, [searchQuery, searchResults.filteredMessages, timelineMessages]);

  const currentMarks = useMemo(() => {
    return markManagerRef.current ? markManagerRef.current.getMarks() : {
      completed: new Set(),
      important: new Set(),
      deleted: new Set()
    };
  }, [markVersion, currentFileUuid]);

  const currentConversation = useMemo(() => {
    const conv = DataProcessor.getCurrentConversation({
      viewMode,
      selectedFileIndex,
      selectedConversationUuid,
      processedData,
      files,
      currentFileIndex,
      fileMetadata
    });
    // zip 模式下：用稳定的 claude uuid 作为 rename key，
    // 使 ConversationTimeline 的 setRename/getRename 与 sortedBrowseCards 的查找 key 一致
    if (conv && hasZipData && openedCardUuidRef.current) {
      const rm = getRenameManager();
      const cardUuid = openedCardUuidRef.current;
      const displayName = rm.getRename(cardUuid, conv.originalName || conv.name);
      return { ...conv, uuid: cardUuid, name: displayName };
    }
    return conv;
  }, [viewMode, selectedFileIndex, selectedConversationUuid, processedData, files, currentFileIndex, fileMetadata, renameVersion, hasZipData]);

  // ==================== 事件处理函数 ====================

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


  // 当卡片点击加载新文件后，files 数组更新时自动选中新文件
  useEffect(() => {
    if (pendingSelectIndexRef.current !== null && files.length > pendingSelectIndexRef.current) {
      const idx = pendingSelectIndexRef.current;
      pendingSelectIndexRef.current = null;
      fileActions.switchFile(idx);
      setSelectedFileIndex(idx);
    }
  }, [files, fileActions]);

  const handleOpenSingleJson = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.jsonl';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const content = await file.text();
        try {
          StorageManager.set('singlefile_session', { content, filename: file.name });
        } catch (se) {
          console.warn('[SingleFile] Failed to save session:', se);
        }
        const newFileIdx = fileActionsRef.current ? files.length : 0;
        pendingSelectIndexRef.current = newFileIdx;
        fileActionsRef.current.loadFiles([file]);
        setViewMode('timeline');
      } catch (err) {
        console.error('[SingleFile] Failed to load file:', err);
      }
    };
    input.click();
  }, [files.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMarkToggle = (messageIndex, markType) => {
    if (markManagerRef.current) {
      markManagerRef.current.toggleMark(messageIndex, markType);

      if (viewMode === 'timeline' && selectedFileIndex !== null) {
        const file = files[selectedFileIndex];
        if (file) {
          const fileUuid = generateFileCardUuid(selectedFileIndex, file);

          setOperatedFiles(prev => new Set(prev).add(fileUuid));
        }
      }

      setMarkVersion(v => v + 1);
    }
  };

  const handleItemRename = () => {
    setRenameVersion(v => v + 1);
    setMarkVersion(v => v + 1);
  };

  const handleStarToggle = useCallback((conversationUuid, nativeIsStarred) => {
    if (starManagerRef.current) {
      const newStars = starManagerRef.current.toggleStar(conversationUuid, nativeIsStarred);
      setStarredConversations(newStars);
    }
  }, []);

  const handleCardSelect = useCallback(async (item) => {
    const ctx = browseAllContextRef.current;

    const fetchViaProxy = (url) => {
      if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
        return new Promise(resolve =>
          chrome.runtime.sendMessage({ type: 'LOOMINARY_FETCH', options: { url, method: 'GET', responseType: 'json' } }, resolve)
        );
      }
      return fetch(url, { credentials: 'include' }).then(r => r.ok ? r.json().then(data => ({ success: true, data })) : { success: false });
    };

    try {
      let jsonString;

      if (item._zipData) {
        // zip 导入模式：直接使用本地数据
        jsonString = item._zipData;
      } else if (ctx?.userId && ctx?.baseUrl) {
        // API 模式：从远端获取
        const treeMode = document.getElementById('loominary-tree-mode-switch')?.checked ?? true;
        const convUrl = treeMode
          ? `${ctx.baseUrl}/api/organizations/${ctx.userId}/chat_conversations/${item.uuid}?tree=True&rendering_mode=messages&render_all_tools=true`
          : `${ctx.baseUrl}/api/organizations/${ctx.userId}/chat_conversations/${item.uuid}`;
        console.log('[Loominary] Fetching conversation via proxy:', convUrl);
        const resp = await fetchViaProxy(convUrl);
        if (!resp?.success) {
          console.error('[Loominary] Failed to fetch conversation:', item.uuid, resp?.status, resp?.error);
          return;
        }
        const data = resp.data;
        if (item.project_uuid) data.project_uuid = item.project_uuid;
        if (item.project) data.project = item.project;
        jsonString = JSON.stringify(data, null, 2);

        // 获取 System Context（项目信息 + 用户记忆）
        try {
          const exportCtx = { projectInfo: null, userMemory: null };
          // 用户记忆
          const [profileResp, memResp] = await Promise.all([
            fetchViaProxy(`${ctx.baseUrl}/api/account_profile`),
            fetchViaProxy(`${ctx.baseUrl}/api/organizations/${ctx.userId}/memory`)
          ]);
          exportCtx.userMemory = {
            preferences: profileResp?.success ? (profileResp.data?.conversation_preferences || '') : '',
            memories: memResp?.success ? (memResp.data?.memory || '') : ''
          };
          // 项目信息
          if (item.project_uuid) {
            const [detailResp, projMemResp] = await Promise.all([
              fetchViaProxy(`${ctx.baseUrl}/api/organizations/${ctx.userId}/projects/${item.project_uuid}`),
              fetchViaProxy(`${ctx.baseUrl}/api/organizations/${ctx.userId}/memory?project_uuid=${item.project_uuid}`)
            ]);
            exportCtx.projectInfo = {
              name: item.project?.name || '',
              uuid: item.project_uuid,
              description: detailResp?.success ? (detailResp.data?.description || '') : '',
              instructions: detailResp?.success ? (detailResp.data?.prompt_template || '') : '',
              memory: projMemResp?.success ? (projMemResp.data?.memory || '') : ''
            };
          }
          setPendingExportContext(exportCtx);
        } catch (ctxErr) {
          console.warn('[Loominary] Failed to fetch export context:', ctxErr);
        }
      } else {
        console.error('[Loominary] No zip data and no API context for card:', item.uuid);
        return;
      }

      // zip 模式：记录当前打开的卡片 claude uuid，用于 rename key 对齐
      openedCardUuidRef.current = item.uuid;

      // 如果该卡片已经加载过，直接 switchFile，不重复 append
      if (cardFileIndexMapRef.current.has(item.uuid)) {
        const existingIdx = cardFileIndexMapRef.current.get(item.uuid);
        dataLoadedRef.current = false;
        fileActionsRef.current.switchFile(existingIdx);
        setSelectedFileIndex(existingIdx);
        setSelectedConversationUuid(null);
        const cardIdx = sortedBrowseCards.findIndex(c => c.uuid === item.uuid);
        if (cardIdx !== -1) setBrowseAllCurrentIndex(cardIdx);
        setViewMode('timeline');
        return;
      }

      const parsed = JSON.parse(jsonString);
      const filename = `${(parsed.name || item.name || item.uuid).replace(/[<>:"\/\\|?*\x00-\x1F]/g, '')}.json`;

      // 允许重新加载
      dataLoadedRef.current = false;

      const blob = new Blob([jsonString], { type: 'application/json' });
      // lastModified 用稳定值（item.uuid hash），确保同一张卡片每次生成相同 fileUuid
      const stableTs = item.updated_at ? new Date(item.updated_at).getTime()
        : item.uuid.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0) >>> 0;
      const file = new File([blob], filename, { type: 'application/json', lastModified: stableTs });

      // 记录 cardUuid ↔ fileUuid 映射，用于 rename 同步
      const newFileIdx = files.length;
      const fileUuid = generateFileCardUuid(newFileIdx, file);
      uuidMapRef.current.toFile.set(item.uuid, fileUuid);
      uuidMapRef.current.toCard.set(fileUuid, item.uuid);
      cardFileIndexMapRef.current.set(item.uuid, newFileIdx);

      pendingSelectIndexRef.current = newFileIdx;
      fileActionsRef.current.loadFiles([file]);
      const cardIdx = sortedBrowseCards.findIndex(c => c.uuid === item.uuid);
      if (cardIdx !== -1) setBrowseAllCurrentIndex(cardIdx);
      setViewMode('timeline');
    } catch (e) {
      console.error('[Loominary] Error loading conversation:', e);
    }
  }, [setViewMode, files, sortedBrowseCards]);

  const handleBrowseAllExport = useCallback(async () => {
    const ctx = browseAllContextRef.current || {};

    const toExport = browseAllCards;
    if (toExport.length === 0) return;

    const fetchViaProxy = (url) => {
      if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
        return new Promise(resolve =>
          chrome.runtime.sendMessage({ type: 'LOOMINARY_FETCH', options: { url, method: 'GET', responseType: 'json' } }, resolve)
        );
      }
      return fetch(url, { credentials: 'include' }).then(r => r.ok ? r.json().then(data => ({ success: true, data })) : { success: false });
    };

    let includeProjectInfo = true, includeUserMemory = true;
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      try {
        const cfg = await new Promise(resolve =>
          chrome.storage.local.get(['loominary_export_config'], r => resolve(r.loominary_export_config || {}))
        );
        includeProjectInfo = cfg.includeProjectInfo !== false;
        includeUserMemory = cfg.includeUserMemory !== false;
      } catch (e) {}
    }

    // 获取账号名用于文件名（与 claude.js 保持一致）
    let accountName = 'claude';
    if (ctx.baseUrl) {
      try {
        const profileResp = await fetchViaProxy(`${ctx.baseUrl}/api/account_profile`);
        if (profileResp?.success) {
          const rawName = profileResp.data?.display_name || profileResp.data?.full_name || '';
          if (rawName) accountName = rawName.replace(/[<>:"\/\\|?*\x00-\x1F]/g, '_').replace(/\s+/g, '_').trim() || 'claude';
        }
      } catch (e) {}
    }

    const totalCount = toExport.length;
    const userInput = prompt(`Found ${totalCount} conversations.\n\nHow many to export?`, totalCount.toString());
    if (userInput === null) return;
    const exportCount = Math.min(parseInt(userInput, 10) || totalCount, totalCount);

    const { strToU8, zip } = await import('fflate');
    const zipEntries = {};
    const convsToExport = toExport.slice(0, exportCount);
    const BATCH = 25;

    for (let i = 0; i < convsToExport.length; i += BATCH) {
      const batch = convsToExport.slice(i, i + BATCH);
      await Promise.allSettled(batch.map(async (conv) => {
        try {
          let jsonStr;
          if (conv._zipData) {
            // zip 导入模式：使用本地数据
            jsonStr = conv._zipData;
          } else if (ctx?.userId && ctx?.baseUrl) {
            const resp = await fetchViaProxy(`${ctx.baseUrl}/api/organizations/${ctx.userId}/chat_conversations/${conv.uuid}`);
            if (!resp?.success) return;
            const data = resp.data;
            if (conv.project_uuid) data.project_uuid = conv.project_uuid;
            if (conv.project) data.project = conv.project;
            jsonStr = JSON.stringify(data, null, 2);
          } else return;
          const title = (conv.name || conv.uuid).replace(/[<>:"\/\\|?*\x00-\x1F]/g, '');
          zipEntries[`claude_${conv.uuid.substring(0, 8)}_${title}.json`] = strToU8(jsonStr);
        } catch (e) {}
      }));
    }

    if (includeProjectInfo || includeUserMemory) {
      const projectsJson = { exported_at: new Date().toISOString(), organization_id: ctx.userId, user_instructions: '', global_memory: null, projects: [] };
      if (includeUserMemory) {
        try {
          const [profileResp, memResp] = await Promise.all([
            fetchViaProxy(`${ctx.baseUrl}/api/account_profile`),
            fetchViaProxy(`${ctx.baseUrl}/api/organizations/${ctx.userId}/memory`)
          ]);
          projectsJson.user_instructions = profileResp?.success ? (profileResp.data?.conversation_preferences || '') : '';
          projectsJson.global_memory = memResp?.success ? memResp.data : null;
        } catch (e) {}
      }
      if (includeProjectInfo) {
        const projectUuids = [...new Set(convsToExport.map(c => c.project_uuid).filter(Boolean))];
        for (const projUuid of projectUuids) {
          try {
            const [detailResp, memoryResp, filesResp] = await Promise.all([
              fetchViaProxy(`${ctx.baseUrl}/api/organizations/${ctx.userId}/projects/${projUuid}`),
              fetchViaProxy(`${ctx.baseUrl}/api/organizations/${ctx.userId}/memory?project_uuid=${projUuid}`),
              fetchViaProxy(`${ctx.baseUrl}/api/organizations/${ctx.userId}/projects/${projUuid}/docs`)
            ]);
            const detail = detailResp?.success ? detailResp.data : null;
            const memory = memoryResp?.success ? memoryResp.data : null;
            const files = (filesResp?.success && Array.isArray(filesResp.data)) ? filesResp.data : [];
            const knowledgeFiles = [];
            if (files.length > 0) {
              const fileResults = await Promise.allSettled(
                files.map(f =>
                  fetchViaProxy(`${ctx.baseUrl}/api/organizations/${ctx.userId}/projects/${projUuid}/docs/${f.uuid}`)
                    .then(r => ({ name: f.file_name || f.uuid, content: r?.success ? (r.data?.content || r.data) : null }))
                )
              );
              for (const r of fileResults) {
                if (r.status === 'fulfilled' && r.value.content) {
                  const content = typeof r.value.content === 'string' ? r.value.content : JSON.stringify(r.value.content);
                  const safeName = r.value.name.replace(/[<>:"\/\\|?*\x00-\x1F]/g, '');
                  const zipPath = `projects_${projUuid.substring(0, 8)}_${safeName}`;
                  zipEntries[zipPath] = strToU8(content);
                  knowledgeFiles.push(zipPath);
                }
              }
            }
            const projName = convsToExport.find(c => c.project_uuid === projUuid)?.project?.name || projUuid;
            projectsJson.projects.push({
              uuid: projUuid, name: projName,
              description: detail?.description || '', instructions: detail?.prompt_template || '',
              memory: memory?.memory || '', memory_updated_at: memory?.updated_at || null,
              archived: detail?.archived || false, knowledge_files: knowledgeFiles
            });
          } catch (e) {}
        }
      }
      zipEntries[`${ctx.userId}_projects.json`] = strToU8(JSON.stringify(projectsJson, null, 2));
    }

    // 导出重命名信息（仅 zip 模式下有效的重命名）
    if (hasZipData) {
      const rm = getRenameManager();
      const allRenames = rm.getAllRenames();
      const exportedUuids = new Set(convsToExport.map(c => c.uuid));
      const relevantRenames = {};
      for (const [key, name] of Object.entries(allRenames)) {
        // rename key 统一是 claude uuid，直接过滤
        if (exportedUuids.has(key)) {
          relevantRenames[key] = name;
        }
      }
      if (Object.keys(relevantRenames).length > 0) {
        zipEntries['_renames.json'] = strToU8(JSON.stringify(relevantRenames, null, 2));
      }
    }

    await new Promise((resolve, reject) => {
      zip(zipEntries, { level: 1 }, (err, data) => {
        if (err) { reject(err); return; }
        const blob = new Blob([data], { type: 'application/zip' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `claude_${accountName}_${exportCount === totalCount ? 'all' : 'recent_' + exportCount}_${new Date().toISOString().slice(0, 10)}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        resolve();
      });
    });
  }, [browseAllCards]);

  // 从 zip 文件导入完整对话数据
  const handleZipImport = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const { unzipSync, strFromU8 } = await import('fflate');
        const arrayBuffer = await file.arrayBuffer();
        const unzipped = unzipSync(new Uint8Array(arrayBuffer));

        // 匹配 export 生成的 projects 元数据文件名：<UUID>_projects.json 或 projects/<UUID>_projects.json
        const isProjectsMetaFile = (name) =>
          /^(?:projects\/)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_projects\.json$/i.test(name);

        const cards = [];
        for (const [filename, data] of Object.entries(unzipped)) {
          if (!filename.endsWith('.json') || isProjectsMetaFile(filename) || filename === '_renames.json') continue;
          try {
            const jsonStr = strFromU8(data);
            const jsonData = JSON.parse(jsonStr);
            const parsed = extractChatData(jsonData, filename);
            const meta = parsed.meta_info || {};
            cards.push({
              type: 'conversation',
              uuid: meta.uuid || jsonData.uuid || filename,
              name: meta.title || jsonData.name || filename.replace(/\.json$/, ''),
              format: parsed.format || 'claude',
              created_at: meta.created_at || jsonData.created_at || null,
              updated_at: meta.updated_at || jsonData.updated_at || null,
              project: meta.project || jsonData.project || null,
              project_uuid: meta.project_uuid || jsonData.project_uuid || null,
              organization_id: meta.organization_id || null,
              platform: parsed.platform || 'claude',
              messageCount: parsed.chat_history?.length || 0,
              size: data.length,
              _zipData: jsonStr // 保留原始 JSON 用于打开对话
            });
          } catch (parseErr) {
            console.warn('[ZipImport] 跳过无法解析的文件:', filename, parseErr);
          }
        }

        if (cards.length === 0) {
          console.warn('[ZipImport] zip 中未找到有效的对话 JSON');
          return;
        }

        // 导入重命名信息
        if (unzipped['_renames.json']) {
          try {
            const renames = JSON.parse(strFromU8(unzipped['_renames.json']));
            const rm = getRenameManager();
            for (const [uuid, name] of Object.entries(renames)) {
              if (!rm.hasRename(uuid)) {
                rm.setRename(uuid, name);
              }
            }
          } catch (e) {
            console.warn('[ZipImport] _renames.json 解析失败:', e);
          }
        }

        // 检查是否有 projects 元数据文件
        const projectsFile = Object.entries(unzipped).find(([name]) => isProjectsMetaFile(name));
        if (projectsFile) {
          try {
            const projectsData = JSON.parse(strFromU8(projectsFile[1]));
            // 存储 exportContext 以便后续使用
            if (projectsData.projects || projectsData.global_memory || projectsData.user_instructions) {
              setPendingExportContext({
                projectInfo: projectsData.projects || [],
                userMemory: {
                  preferences: projectsData.user_instructions || '',
                  memories: projectsData.global_memory?.memory || ''
                }
              });
            }
            // 用 userId 初始化星标管理器
            if (projectsData.organization_id) {
              browseAllContextRef.current = {
                ...(browseAllContextRef.current || {}),
                userId: projectsData.organization_id
              };
              starManagerRef.current = new StarManager(true, projectsData.organization_id);
              setStarredConversations(new Map(starManagerRef.current.getStarredConversations()));
            }
          } catch (e) {
            console.warn('[ZipImport] projects.json 解析失败:', e);
          }
        }

        // 重新导入时清空映射，避免旧 fileIndex 失效引起切换错乱
        cardFileIndexMapRef.current = new Map();
        uuidMapRef.current = { toFile: new Map(), toCard: new Map() };
        openedCardUuidRef.current = null;
        setBrowseAllCurrentIndex(null);

        StorageManager.remove('singlefile_session');
        setBrowseAllCards(cards);
        setHasZipData(true);

        // 将 zip 中的 JSON 转为 File 对象加载，以支持全局搜索索引
        const zipFiles = cards.map(card => {
          const blob = new Blob([card._zipData], { type: 'application/json' });
          const safeName = (card.name || card.uuid).replace(/[<>:"\/\\|?*\x00-\x1F]/g, '') + '.json';
          return new File([blob], safeName, { type: 'application/json', lastModified: Date.now() });
        });
        if (zipFiles.length > 0) {
          fileActionsRef.current.loadFiles(zipFiles);
        }

        setViewMode('conversations');
        console.log('[ZipImport] 成功导入', cards.length, '个对话');
      } catch (err) {
        console.error('[ZipImport] zip 解压失败:', err);
      }
    };
    input.click();
  }, [setViewMode]);

  // 同步：对比 API 列表的 updated_at，只拉取有变化的对话
  const handleZipSync = useCallback(async () => {
    const ctx = browseAllContextRef.current;
    if (!ctx?.userId || !ctx?.baseUrl) {
      console.warn('[Sync] 缺少 userId 或 baseUrl，无法同步');
      return;
    }

    const fetchViaProxy = (url) => {
      if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
        return new Promise(resolve =>
          chrome.runtime.sendMessage({ type: 'LOOMINARY_FETCH', options: { url, method: 'GET', responseType: 'json' } }, resolve)
        );
      }
      return fetch(url, { credentials: 'include' }).then(r => r.ok ? r.json().then(data => ({ success: true, data })) : { success: false });
    };

    try {
      // 1. 获取远端对话列表
      const listResp = await fetchViaProxy(`${ctx.baseUrl}/api/organizations/${ctx.userId}/chat_conversations`);
      if (!listResp?.success || !Array.isArray(listResp.data)) {
        console.error('[Sync] 获取对话列表失败');
        return;
      }
      const remoteConvs = listResp.data;
      const localMap = new Map(browseAllCards.map(c => [c.uuid, c]));

      // 2. 找出需要更新的对话（远端 updated_at 更新 或 本地不存在）
      const toUpdate = remoteConvs.filter(remote => {
        const local = localMap.get(remote.uuid);
        if (!local) return true; // 新对话
        if (!local.updated_at || !remote.updated_at) return true;
        return new Date(remote.updated_at) > new Date(local.updated_at);
      });

      console.log(`[Sync] 远端 ${remoteConvs.length} 个对话，本地 ${browseAllCards.length} 个，需更新 ${toUpdate.length} 个`);

      if (toUpdate.length === 0) {
        console.log('[Sync] 所有对话已是最新');
        return;
      }

      // 3. 批量拉取需要更新的对话全文
      const { strToU8 } = await import('fflate');
      const BATCH = 25;
      const updatedCards = new Map();

      for (let i = 0; i < toUpdate.length; i += BATCH) {
        const batch = toUpdate.slice(i, i + BATCH);
        await Promise.allSettled(batch.map(async (conv) => {
          try {
            const resp = await fetchViaProxy(`${ctx.baseUrl}/api/organizations/${ctx.userId}/chat_conversations/${conv.uuid}`);
            if (!resp?.success) return;
            const data = resp.data;
            if (conv.project_uuid) data.project_uuid = conv.project_uuid;
            if (conv.project) data.project = conv.project;
            const jsonStr = JSON.stringify(data, null, 2);
            const parsed = extractChatData(data, conv.name || conv.uuid);
            const meta = parsed.meta_info || {};
            updatedCards.set(conv.uuid, {
              type: 'conversation',
              uuid: conv.uuid,
              name: meta.title || data.name || conv.name || conv.uuid,
              format: parsed.format || 'claude',
              created_at: meta.created_at || data.created_at || conv.created_at || null,
              updated_at: meta.updated_at || data.updated_at || conv.updated_at || null,
              project: meta.project || data.project || conv.project || null,
              project_uuid: meta.project_uuid || data.project_uuid || conv.project_uuid || null,
              organization_id: ctx.userId,
              platform: parsed.platform || 'claude',
              messageCount: parsed.chat_history?.length || 0,
              size: strToU8(jsonStr).length,
              _zipData: jsonStr
            });
          } catch (e) {
            console.warn('[Sync] 拉取对话失败:', conv.uuid, e);
          }
        }));
        if (i + BATCH < toUpdate.length) {
          await new Promise(r => setTimeout(r, 200));
        }
      }

      // 4. 合并：更新已有卡片 + 新增卡片
      setBrowseAllCards(prev => {
        const merged = prev.map(card =>
          updatedCards.has(card.uuid) ? updatedCards.get(card.uuid) : card
        );
        // 新增本地不存在的
        for (const [uuid, card] of updatedCards) {
          if (!localMap.has(uuid)) merged.push(card);
        }
        return merged;
      });

      // 同步后 _zipData 内容可能更新，清空 fileIndex 缓存避免展示旧数据
      if (updatedCards.size > 0) {
        for (const uuid of updatedCards.keys()) {
          cardFileIndexMapRef.current.delete(uuid);
        }
      }

      console.log(`[Sync] 同步完成，更新/新增 ${updatedCards.size} 个对话`);
    } catch (err) {
      console.error('[Sync] 同步失败:', err);
    }
  }, [browseAllCards]);

  const handleExportClick = async () => {
    if (!processedData) return;
    try {
      let exportCfg;
      if (isExtension) {
        exportCfg = await new Promise(resolve =>
          chrome.storage.local.get(['loominary_export_config'], r => resolve(r.loominary_export_config || {}))
        );
      } else {
        exportCfg = StorageManager.get('export-config', {});
      }
      const currentFile = files[currentFileIndex];
      const originalBaseName = (currentFile?.name || 'conversation').replace(/\.json$/, '');
      const renameManager = getRenameManager();
      const renameKey = (hasZipData && openedCardUuidRef.current) ? openedCardUuidRef.current : currentFileUuid;
      const baseName = renameKey ? renameManager.getRename(renameKey, originalBaseName) : originalBaseName;
      const exportResult = prepareMarkdownExport(
        processedData,
        baseName,
        { ...exportCfg, conversationUuid: currentFileUuid },
        pendingExportContext,
        exportOptions,
        timelineDisplayMessages,
        markManagerRef
      );
      await downloadMarkdownExport(exportResult);
    } catch (err) {
      console.error('[Loominary] Export failed:', err);
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

  // 应用扩展导出设置的辅助函数（用 ref 包装，避免引起 useEffect 重新执行）
  const setExportOptionsRef = useRef(setExportOptions);
  setExportOptionsRef.current = setExportOptions;

  const applyExtensionConfig = useCallback((extCfg) => {
    if (!extCfg) return;

    // 应用主题
    if (extCfg.theme) {
      document.documentElement.setAttribute('data-theme', extCfg.theme);
      StorageManager.set('app-theme', extCfg.theme);
    }

    // 同步格式配置到 localStorage（exportManager 读取时使用）
    const existingFmtCfg = StorageManager.get('export-config', {});
    const fmtKeys = ['includeNumbering', 'numberingFormat', 'senderFormat', 'humanLabel', 'assistantLabel',
      'includeHeaderPrefix', 'headerLevel', 'thinkingFormat', 'includeBranchMarkers'];
    const fmtPatch = {};
    fmtKeys.forEach(k => { if (extCfg[k] !== undefined) fmtPatch[k] = extCfg[k]; });
    if (Object.keys(fmtPatch).length > 0) {
      StorageManager.set('export-config', { ...existingFmtCfg, ...fmtPatch });
    }

    // 更新 exportOptions 状态（内容选项）
    const contentKeys = ['includeTimestamps', 'includeThinking', 'includeArtifacts',
      'includeTools', 'includeCitations', 'includeAttachments',
      'includeProjectInfo', 'includeUserMemory'];
    const statePatch = {};
    contentKeys.forEach(k => { if (extCfg[k] !== undefined) statePatch[k] = extCfg[k]; });
    if (Object.keys(statePatch).length > 0) {
      setExportOptionsRef.current(prev => ({ ...prev, ...statePatch }));
    }
  }, []); // 无依赖，永远不变

  // 防止数据重复加载的标志
  const dataLoadedRef = useRef(false);

  // 单文件会话恢复：刷新页面时从 localStorage 还原上次打开的 JSON
  useEffect(() => {
    if (isExtension) return;
    const session = StorageManager.get('singlefile_session');
    if (!session?.content || !session?.filename) return;
    if (dataLoadedRef.current) return;
    try {
      const blob = new Blob([session.content], { type: 'application/json' });
      const file = new File([blob], session.filename, { type: 'application/json', lastModified: Date.now() });
      pendingSelectIndexRef.current = 0;
      fileActionsRef.current.loadFiles([file]);
      setViewMode('timeline');
    } catch (err) {
      console.error('[SingleFile] Failed to restore session:', err);
      StorageManager.remove('singlefile_session');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Userscript 模式：监听 postMessage（静态 React App 作为 Viewer）
  useEffect(() => {
    if (isExtension) return;

    const handleMessage = (event) => {
      const { data } = event;
      if (!data || typeof data !== 'object') return;

      // 响应握手：告知 Userscript 页面已就绪，同时附带保存的导出配置（供 userscript 同步）
      if (data.type === 'LOOMINARY_HANDSHAKE') {
        const savedConfig = StorageManager.get('export-config', {});
        event.source?.postMessage({ type: 'LOOMINARY_READY', config: savedConfig }, event.origin);
        return;
      }

      // 接收数据
      if (data.type === 'LOOMINARY_LOAD_DATA') {
        // Always process — allow tab reuse (don't guard with dataLoadedRef)
        dataLoadedRef.current = true;

        const payload = data.data;
        if (!payload) return;

        // Apply lang and theme from payload
        if (payload.lang) setResolvedLang(payload.lang);
        if (payload.theme) {
          document.documentElement.setAttribute('data-theme', payload.theme);
          StorageManager.set('app-theme', payload.theme);
        }

        // Reset previously loaded state so new data replaces old
        setBrowseAllCardsRef.current([]);
        setBrowseAllCurrentIndexRef.current(null);

        try {
          if (payload.files && Array.isArray(payload.files)) {
            // 多文件（ST 分支模式）
            const fileObjs = payload.files.map(({ content, filename }) => {
              const blob = new Blob([typeof content === 'string' ? content : JSON.stringify(content)], { type: 'application/jsonl' });
              return new File([blob], filename, { type: 'application/jsonl', lastModified: Date.now() });
            });
            pendingSelectIndexRef.current = 0;
            fileActionsRef.current.loadMergedJSONLFiles(fileObjs);
          } else {
            // 单文件
            const { content, filename } = payload;
            const jsonData = typeof content === 'string' ? content : JSON.stringify(content);
            const blob = new Blob([jsonData], { type: 'application/json' });
            const file = new File([blob], filename, { type: 'application/json', lastModified: Date.now() });
            pendingSelectIndexRef.current = 0;
            fileActionsRef.current.loadFiles([file], { replace: true });
            try { StorageManager.set('singlefile_session', { content: jsonData, filename }); } catch (_) {}
          }
          setViewModeRef.current('timeline');
          if (payload.exportContext) {
            setPendingExportContext(payload.exportContext);
          }
        } catch (err) {
          console.error('[Loominary] postMessage load failed:', err);
          setErrorRef.current('Failed to load data: ' + err.message);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isExtension]); // eslint-disable-line react-hooks/exhaustive-deps

  // Chrome 扩展模式：从 chrome.storage 读取待处理数据（仅执行一次）
  useEffect(() => {
    if (!isExtension) return;

    console.log('[Loominary] Running in Chrome extension mode');

    const loadFromData = (pendingData) => {
      if (dataLoadedRef.current) {
        console.log('[Loominary] Data already loaded, skipping duplicate load');
        return;
      }
      dataLoadedRef.current = true;
      try {
        if (pendingData.files && Array.isArray(pendingData.files)) {
          // Multi-file: ST branches — use merged JSONL loading pipeline
          const fileObjs = pendingData.files.map(({ content, filename }) => {
            const data = typeof content === 'string' ? content : JSON.stringify(content);
            const blob = new Blob([data], { type: 'application/jsonl' });
            return new File([blob], filename, { type: 'application/jsonl', lastModified: Date.now() });
          });
          console.log('[Loominary] Loading', fileObjs.length, 'ST branch files:', fileObjs.map(f => f.name));
          fileActionsRef.current.loadMergedJSONLFiles(fileObjs);
        } else {
          // Single file: existing path
          const { content, filename } = pendingData;
          const jsonData = typeof content === 'string' ? content : JSON.stringify(content);
          const blob = new Blob([jsonData], { type: 'application/json' });
          const file = new File([blob], filename, { type: 'application/json', lastModified: Date.now() });
          fileActionsRef.current.loadFiles([file]);
          console.log('[Loominary] Data loaded successfully:', filename);
        }
      } catch (error) {
        console.error('[Loominary] Error loading data from extension:', error);
        setErrorRef.current('Failed to load data from extension: ' + error.message);
      }
    };

    // 检查是否有待处理的数据，同时加载 content script 面板保存的导出设置
    chrome.storage.local.get(['loominary_pending_data', 'loominary_export_config', 'loominary_lang', 'loominary_page_theme'], (result) => {
      // 应用从 content script 面板保存的导出设置
      applyExtensionConfig(result.loominary_export_config);

      // 应用语言和页面主题
      if (result.loominary_lang) setResolvedLang(result.loominary_lang);
      if (result.loominary_page_theme) {
        document.documentElement.setAttribute('data-theme', result.loominary_page_theme);
        StorageManager.set('app-theme', result.loominary_page_theme);
      }

      if (result.loominary_pending_data) {
        const pendingData = result.loominary_pending_data;
        console.log('[Loominary] Found pending data from extension:', pendingData.files ? `[${pendingData.files.length} files]` : pendingData.filename);

        // sessionStorage restore: only for single-file (multi-file may exceed 5MB limit)
        if (!pendingData.files && !pendingData.action) {
          try {
            sessionStorage.setItem('loominary_session_data', JSON.stringify({ content: pendingData.content, filename: pendingData.filename }));
          } catch (e) { /* sessionStorage 写入失败忽略 */ }
        }

        // 清除已处理的数据
        chrome.storage.local.remove(['loominary_pending_data']);

        // 根据 action 分发
        if (pendingData.action === 'export_markdown') {
          // 静默导出 Markdown，不进入 timeline 视图
          (async () => {
            try {
              const exportConfig = result.loominary_export_config || {};
              const baseFilename = (pendingData.filename || 'conversation').replace(/\.json$/, '');
              const exportResult = prepareMarkdownExport(
                pendingData.content,
                baseFilename,
                exportConfig,
                pendingData.exportContext || null
              );
              await downloadMarkdownExport(exportResult);
              // 等待浏览器处理下载后再关闭 Tab
              setTimeout(() => {
                try { window.close(); } catch (_) { /* Firefox 可能阻止 window.close() */ }
              }, 800);
            } catch (err) {
              console.error('[Loominary] Markdown export failed:', err);
              setErrorRef.current('Markdown export failed: ' + err.message);
            }
          })();
        } else if (pendingData.action === 'browse_all') {
          // 浏览全部对话：将对话列表元数据转为卡片格式
          const conversations = pendingData.conversations || [];
          const cards = conversations.map(conv => ({
            type: 'conversation',
            uuid: conv.uuid,
            name: conv.name || conv.uuid,
            format: 'claude',
            created_at: conv.created_at || null,
            updated_at: conv.updated_at || null,
            project: conv.project || null,
            project_uuid: conv.project_uuid || null,
            organization_id: pendingData.userId || null,
            platform: 'claude'
          }));
          setBrowseAllCards(cards);
          browseAllContextRef.current = { userId: pendingData.userId, baseUrl: pendingData.baseUrl };
          // 初始化星标管理器（按账号隔离）
          starManagerRef.current = new StarManager(true, pendingData.userId);
          setStarredConversations(new Map(starManagerRef.current.getStarredConversations()));
          setViewModeRef.current('conversations');
          console.log('[Loominary] Browse all: loaded', cards.length, 'conversation cards');
        } else {
          // 存储随预览数据一起传入的导出上下文（project 信息 / 用户记忆）
          if (pendingData.exportContext) {
            setPendingExportContext(pendingData.exportContext);
          }
          loadFromData(pendingData);
        }
      } else {
        // 尝试从 sessionStorage 恢复（刷新场景）
        try {
          const sessionRaw = sessionStorage.getItem('loominary_session_data');
          if (sessionRaw) {
            const sessionData = JSON.parse(sessionRaw);
            console.log('[Loominary] Restoring data from sessionStorage:', sessionData.filename);
            loadFromData(sessionData);
          } else {
            console.warn('[Loominary] No pending data found');
          }
        } catch (e) {
          console.warn('[Loominary] No pending data found in chrome.storage.local');
        }
      }
    });

    // 实时监听 popup 设置变化，立即应用到当前页面
    const onStorageChanged = (changes, areaName) => {
      if (areaName !== 'local' || !changes['loominary_export_config']) return;
      applyExtensionConfig(changes['loominary_export_config'].newValue);
    };
    chrome.storage.onChanged.addListener(onStorageChanged);
    return () => chrome.storage.onChanged.removeListener(onStorageChanged);
  }, [isExtension, applyExtensionConfig]); // 移除 fileActions/setError，改用 ref

  // Chrome 扩展模式：监听文件加载完成，自动切换到时间线视图（browse_all 模式下不触发）
  useEffect(() => {
    if (isExtension && files.length > 0 && viewMode !== 'timeline' && browseAllCards.length === 0) {
      console.log('[Loominary] Files loaded in extension mode, switching to timeline view');
      setViewMode('timeline');
      fileActions.switchFile(0);
      setSelectedFileIndex(0);
    }
  }, [isExtension, files, viewMode, fileActions, browseAllCards.length]);

  useEffect(() => {
    const title = fileMetadata[files[currentFileIndex]?.name]?.title;
    document.title = title ? `${title} - Loominary` : 'Loominary';
  }, [currentFileIndex, files, fileMetadata]);

  return (
    <div className="app-redesigned">
      <>
          {/* 顶部导航栏 */}
          <nav className="navbar-redesigned">
            <div className="navbar-left">
              <div className="logo">
              <span className="whiteboard-toolbar-title">Loominary</span>
              </div>

              {viewMode === 'timeline' && (
                <div className="navbar-back-slot">
                  {(browseAllCards.length > 0 || files.length > 1) && (
                    <button
                      onClick={() => { openedCardUuidRef.current = null; setViewMode('conversations'); }}
                      title={t('app.backToList') || '返回列表'}
                      className="navbar-icon-btn"
                    >
                      <ArrowLeft size={16} />
                    </button>
                  )}
                </div>
              )}

              {(viewMode === 'timeline' || hasZipData) && (
              <NavSearchBox
                onSearch={(query) => {
                  setSearchOverlayQuery(query);
                  setShowSearchOverlay(true);
                }}
                onExpand={(query) => {
                  setSearchOverlayQuery(query || '');
                  setShowSearchOverlay(true);
                }}
                onGlobalSearch={() => {
                  setSearchOverlayQuery('');
                  setShowSearchOverlay(true);
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

            {/* 设置按钮 - 仅非扩展模式（GitHub Pages 独立版）显示 */}
            {!isExtension && (
              <div className="navbar-right" style={{ display: 'flex', alignItems: 'center', paddingRight: 12 }}>
                <button
                  className="navbar-icon-btn"
                  title={t('app.openSettings') || '设置'}
                  onClick={() => setShowSettings(true)}
                  style={{ fontSize: 18, lineHeight: 1 }}
                >
                  ⚙
                </button>
              </div>
            )}

          </nav>

          {/* 导出筛选 toggle - 固定右侧，仅时间线视图显示 */}
          {viewMode === 'timeline' && (
            <div className="timeline-filter-panel">
              {/* 导出格式切换（UI预留，暂无实现） */}
              <div className="segment-group segment-group--branch">
                {['Markdown', 'PDF', 'ScreenShot'].map((mode) => (
                  <button key={mode} className="segment-btn" disabled title="On the way now">
                    {mode}
                  </button>
                ))}
              </div>
              <div className="navbar-segments-divider" />
              <div className="segment-group segment-group--branch">
                {[
                  { label: t('app.export.segments.currentBranch'), active: exportOptions.scope === 'currentBranch' },
                  { label: t('app.export.segments.allBranches'), active: exportOptions.scope !== 'currentBranch' },
                ].map(({ label, active }) => (
                  <button
                    key={label}
                    className={`segment-btn ${active ? 'active' : ''}`}
                    onClick={() => setExportOptions(prev => ({
                      ...prev,
                      scope: prev.scope === 'currentBranch' ? 'current' : 'currentBranch'
                    }))}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="navbar-segments-divider" />
              <div className="segment-group segment-group--branch">
                {[
                  { label: t('app.export.segments.all'), value: 'all' },
                  { label: t('app.export.segments.starredOnly'), value: 'starred' },
                  { label: t('app.export.segments.completedOnly'), value: 'completed' },
                ].map(({ label, value }) => {
                  const currentValue = exportOptions.includeImportant ? 'starred' : exportOptions.includeCompleted ? 'completed' : 'all';
                  return (
                    <button
                      key={value}
                      className={`segment-btn ${currentValue === value ? 'active' : ''}`}
                      onClick={() => setExportOptions(prev => ({
                        ...prev,
                        includeImportant: value === 'starred',
                        includeCompleted: value === 'completed'
                      }))}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 主容器 */}
          <div className="main-container">
            <div className={`view-content view-content-${viewMode}`} ref={viewMode !== 'timeline' ? viewContentRef : null}>
              {viewMode === 'conversations' ? (
              <CardGrid
                items={sortedBrowseCards}
                starredItems={starredConversations}
                onItemSelect={handleCardSelect}
                onItemStar={handleStarToggle}
                onItemRename={handleItemRename}
                sortField={cardSortField}
                sortOrder={cardSortOrder}
                onSortChange={(field, order) => {
                  setCardSortField(field);
                  setCardSortOrder(order);
                }}
                filterProps={{
                  filters,
                  availableProjects,
                  availableOrganizations,
                  filterStats,
                  onFilterChange: filterActions.setFilter,
                  onReset: filterActions.resetFilters,
                  onRestoreStars: () => {
                    if (starManagerRef.current) {
                      setStarredConversations(starManagerRef.current.clearAllStars());
                    }
                  },
                  operatedCount: operatedFiles.size,
                  disabled: false,
                  hasZipData,
                  onZipImport: handleZipImport,
                  onZipSync: handleZipSync,
                  onOpenSingleJson: handleOpenSingleJson
                }}
              />
              ) : (
              <ConversationTimeline
                data={processedData}
                conversation={currentConversation}
                messages={displayedItems}
                marks={currentMarks}
                markActions={markActions}
                format={processedData?.format}
                files={browseAllCurrentIndex !== null ? sortedBrowseCards.map(c => ({ name: c.name || c.uuid })) : files}
                currentFileIndex={browseAllCurrentIndex !== null ? browseAllCurrentIndex : currentFileIndex}
                onFileSwitch={browseAllCurrentIndex !== null ? (index) => {
                  const card = sortedBrowseCards[index];
                  if (card) handleCardSelect(card);
                } : (index) => {
                  fileActions.switchFile(index);
                  setSelectedFileIndex(index);
                  setSelectedConversationUuid(null);
                }}
                searchQuery={searchQuery}
                branchState={currentBranchState}
                onBranchStateChange={setCurrentBranchState}
                onDisplayMessagesChange={setTimelineDisplayMessages}
                onRename={handleItemRename}
                exportContext={pendingExportContext}
              />
              )}
            </div>
          </div>

          <FloatingActionButton
            onClick={viewMode === 'conversations' ? handleBrowseAllExport : () => handleExportClick()}
            title={viewMode === 'conversations' ? t('filter.actions.exportProject') || '导出全部' : t('app.export.button')}
          />

          {/* 搜索浮层 */}
          <SearchOverlay
            isOpen={showSearchOverlay}
            onClose={() => setShowSearchOverlay(false)}
            onNavigateToMessage={handleNavigateToMessage}
            initialQuery={searchOverlayQuery}
          />

          {/* 设置面板（仅独立/GitHub Pages 模式） */}
          {!isExtension && showSettings && (
            <SettingsPanel
              onClose={() => setShowSettings(false)}
              exportOptions={exportOptions}
              setExportOptions={setExportOptions}
            />
          )}
        </>
    </div>
  );
}

export default App;
