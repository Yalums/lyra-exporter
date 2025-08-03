import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import './styles/base.css';
import './styles/themes.css';
import './styles/UniversalTimeline.css';
import './styles/message-gfm.css';

// 组件导入
import WelcomePage from './components/WelcomePage';
import MessageDetail from './components/MessageDetail';
import ConversationGrid from './components/ConversationGrid';
import ConversationTimeline from './components/ConversationTimeline';
import ConversationFilter from './components/ConversationFilter';
import ThemeSwitcher from './components/ThemeSwitcher';

// 自定义Hooks导入
import { useFileManager } from './hooks/useFileManager';
import { useMarkSystem } from './hooks/useMarkSystem';
import { useSearch } from './hooks/useSearch';
import { useMessageSort } from './hooks/useMessageSort';
import { useConversationFilter } from './hooks/useConversationFilter';
import { useFileUuid, generateFileCardUuid, generateConversationCardUuid, parseUuid } from './hooks/useFileUuid';
import { useStarSystem } from './hooks/useStarSystem';

// 工具导入 import { STORAGE_KEYS } from './utils/constants'; 但是好像重来都没有使用过所以给注释掉了

function App() {
  // 使用自定义hooks
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
  
  // 星标系统 - 只在 claude_full_export 格式时启用
  const shouldUseStarSystem = processedData?.format === 'claude_full_export';
  const { starredConversations, actions: starActions } = useStarSystem(shouldUseStarSystem);
  
  // 状态管理
  const [selectedMessageIndex, setSelectedMessageIndex] = useState(null);
  const [activeTab, setActiveTab] = useState('content');
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [viewMode, setViewMode] = useState('conversations'); // 'conversations' | 'timeline'
  const [selectedFileIndex, setSelectedFileIndex] = useState(null);
  const [selectedConversationUuid, setSelectedConversationUuid] = useState(null);
  const [showMessageDetail, setShowMessageDetail] = useState(false);
  const [operatedFiles, setOperatedFiles] = useState(new Set());
  const [scrollPositions, setScrollPositions] = useState({});
  // 新增 error 状态
  const [error, setError] = useState(null);
  const [exportOptions, setExportOptions] = useState({
    scope: 'current', // 'current' | 'operated' | 'all'
    includeCompleted: false, // 改为false，表示是否"仅"导出已完成
    excludeDeleted: true,
    includeThinking: true,
    includeArtifacts: true,
    includeTools: true,
    includeCitations: true,
    includeTimestamps: false
  });
  
  const fileInputRef = useRef(null);
  const contentAreaRef = useRef(null);

  // 使用统一的UUID管理 - 传入files参数
  const currentFileUuid = useFileUuid(viewMode, selectedFileIndex, selectedConversationUuid, processedData, files);
  const { marks, stats, actions: markActions } = useMarkSystem(currentFileUuid);

  // 创建原始对话列表（用于筛选）- 更新以包含星标状态
  const rawConversations = useMemo(() => {
    if (viewMode === 'conversations' && processedData?.format === 'claude_full_export') {
      return processedData.views?.conversationList?.map(conv => ({
        type: 'conversation',
        ...conv,
        fileIndex: currentFileIndex,
        fileName: files[currentFileIndex]?.name || 'unknown',
        fileFormat: processedData.format,
        uuid: generateConversationCardUuid(currentFileIndex, conv.uuid, files[currentFileIndex]),
        // 计算最终的星标状态
        is_starred: conv.is_starred || false // 先使用原生状态，后续在组件内判断
      })) || [];
    }
    return [];
  }, [viewMode, processedData?.format, processedData?.views?.conversationList, currentFileIndex, files]);

  // 对话筛选功能（仅用于claude_full_export格式）
  const {
    filters,
    filteredConversations,
    availableProjects,
    filterStats,
    actions: filterActions
  } = useConversationFilter(rawConversations);

  // 创建统一的卡片列表（包含文件和对话）
  const allCards = useMemo(() => {
    const cards = [];
    
    // 如果当前文件是claude_full_export格式，展示筛选后的对话卡片
    if (viewMode === 'conversations' && processedData?.format === 'claude_full_export') {
      // 直接返回筛选后的对话卡片
      return [...filteredConversations];
    }
    
    // 为每个文件创建一个文件卡片
    files.forEach((file, fileIndex) => {
      const isCurrentFile = fileIndex === currentFileIndex;
      const fileData = isCurrentFile ? processedData : null;
      const metadata = fileMetadata[file.name] || {};
      
      // 优先使用当前加载的数据，其次使用元数据
      const format = fileData?.format || metadata.format || 'unknown';
      const messageCount = fileData?.chat_history?.length || metadata.messageCount || 0;
      const conversationCount = fileData?.format === 'claude_full_export' ? 
        (fileData?.views?.conversationList?.length || 0) : 
        (metadata.conversationCount || (fileData ? 1 : 0));
      
      // 获取模型信息
      const model = fileData?.meta_info?.model || metadata.model || (format === 'claude' ? '' : 'Claude');
      
      cards.push({
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
      });
    });
    
    return cards;
  }, [files, currentFileIndex, processedData, viewMode, filteredConversations, fileMetadata]);

  // 搜索功能 - 搜索卡片和消息
  const searchTarget = useMemo(() => {
    if (viewMode === 'conversations') {
      return allCards;
    } else if (viewMode === 'timeline' && selectedFileIndex !== null) {
      // 获取选中对话的消息
      if (selectedFileIndex === currentFileIndex && processedData) {
        if (processedData.format === 'claude_full_export' && selectedConversationUuid) {
          // 只提取conversation UUID，避免依赖整个processedData
          const messages = processedData.chat_history?.filter(msg => 
            msg.conversation_uuid === selectedConversationUuid && !msg.is_conversation_header
          ) || [];
          return messages;
        } else {
          return processedData.chat_history || [];
        }
      }
    }
    return [];
  }, [viewMode, allCards, selectedConversationUuid, selectedFileIndex, currentFileIndex, processedData]);

  const { query, filteredMessages, actions: searchActions } = useSearch(searchTarget);

  // 消息排序 - 仅在时间线模式下使用
  const timelineMessages = useMemo(() => {
    if (viewMode === 'timeline' && selectedFileIndex !== null) {
      // 直接从原始数据获取消息，避免依赖searchTarget
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

  // 检查是否为claude_full_export格式的对话网格模式
  const isFullExportConversationMode = viewMode === 'conversations' && 
    processedData?.format === 'claude_full_export';

  // 文件处理
  const handleFileLoad = (e) => {
    const fileList = Array.from(e.target.files);
    fileActions.loadFiles(fileList);
  };

  // 卡片选择处理（文件卡片或对话卡片）
  const handleCardSelect = (card) => {
    // 保存当前滚动位置
    if (contentAreaRef.current && viewMode === 'conversations') {
      const key = currentFile ? `file-${currentFileIndex}` : 'main';
      setScrollPositions(prev => ({
        ...prev,
        [key]: contentAreaRef.current.scrollTop
      }));
    }
    
    if (card.type === 'file') {
      // 点击文件卡片
      if (card.fileIndex !== currentFileIndex) {
        fileActions.switchFile(card.fileIndex);
      }
      
      // 根据文件格式决定跳转逻辑
      if (card.fileData?.format === 'claude_full_export') {
        // claude_full_export 格式：切换到对话网格模式
        setViewMode('conversations');
        setSelectedFileIndex(null);
        setSelectedConversationUuid(null);
      } else {
        // 其他格式：直接进入时间线模式
        setSelectedFileIndex(card.fileIndex);
        setSelectedConversationUuid(null);
        setViewMode('timeline');
      }
    } else if (card.type === 'conversation') {
      // 点击对话卡片
      const parsed = parseUuid(card.uuid);
      // 需要从卡片信息中获取fileIndex，因为parseUuid现在返回的是fileHash
      const fileIndex = card.fileIndex;
      const conversationUuid = parsed.conversationUuid;
      
      setSelectedFileIndex(fileIndex);
      setSelectedConversationUuid(conversationUuid);
      setViewMode('timeline');
      
      // 如果需要切换文件，先切换到对应文件
      if (fileIndex !== currentFileIndex) {
        fileActions.switchFile(fileIndex);
      }
    }
  };

  // 文件关闭处理
  const handleFileRemove = (fileIndex) => {
    fileActions.removeFile(fileIndex);
    
    // 如果关闭的是当前文件或选中的文件，重置状态
    if (fileIndex === currentFileIndex || fileIndex === selectedFileIndex) {
      setViewMode('conversations');
      setSelectedFileIndex(null);
      setSelectedConversationUuid(null);
    }
  };

  // 返回对话列表
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

  // 消息选择处理
  const handleMessageSelect = (messageIndex) => {
    setSelectedMessageIndex(messageIndex);
    setShowMessageDetail(true);
  };

  // 搜索处理
  const handleSearch = (searchText) => {
    searchActions.search(searchText);
  };

  // 标记处理
  const handleMarkToggle = (messageIndex, markType) => {
    markActions.toggleMark(messageIndex, markType);
    
    // 记录有操作的文件
    if (currentFileUuid) {
      setOperatedFiles(prev => new Set(prev).add(currentFileUuid));
    }
  };

  // 星标切换处理
  const handleStarToggle = (conversationUuid, nativeIsStarred) => {
    starActions.toggleStar(conversationUuid, nativeIsStarred);
  };

  // 获取所有文件的标记统计（改进版）
  const getAllMarksStats = useCallback(() => {
    let totalCompleted = 0;
    let totalImportant = 0;
    let totalDeleted = 0;
    
    // 遍历所有文件获取标记数据
    files.forEach((file, index) => {
      // 普通文件的标记
      const fileUuid = generateFileCardUuid(index, file);
      const storageKey = `marks_${fileUuid}`;
      
      try {
        const savedData = localStorage.getItem(storageKey);
        if (savedData) {
          const parsed = JSON.parse(savedData);
          const completedCount = (parsed.completed || []).length;
          const importantCount = (parsed.important || []).length;
          const deletedCount = (parsed.deleted || []).length;
          
          totalCompleted += completedCount;
          totalImportant += importantCount;
          totalDeleted += deletedCount;
        }
      } catch (error) {
        console.error(`获取文件 ${file.name} 的标记失败:`, error);
      }
      
      // 如果是claude_full_export格式，还需要检查每个对话的标记
      if (index === currentFileIndex && processedData?.format === 'claude_full_export') {
        const conversations = processedData.views?.conversationList || [];
        
        conversations.forEach(conv => {
          const convUuid = generateConversationCardUuid(index, conv.uuid, file);
          const convStorageKey = `marks_${convUuid}`;
          
          try {
            const savedData = localStorage.getItem(convStorageKey);
            if (savedData) {
              const parsed = JSON.parse(savedData);
              const completedCount = (parsed.completed || []).length;
              const importantCount = (parsed.important || []).length;
              const deletedCount = (parsed.deleted || []).length;
              
              totalCompleted += completedCount;
              totalImportant += importantCount;
              totalDeleted += deletedCount;
            }
          } catch (error) {
            console.error(`获取对话 ${conv.name} 的标记失败:`, error);
          }
        });
      }
    });
    
    return {
      completed: totalCompleted,
      important: totalImportant,
      deleted: totalDeleted,
      total: totalCompleted + totalImportant + totalDeleted
    };
  }, [files, processedData, currentFileIndex]);

  // 获取统计数据 - 更新以包含星标统计
  const getStats = () => {
    const allMarksStats = getAllMarksStats();
    
    if (viewMode === 'conversations') {
      const fileCards = allCards.filter(card => card.type === 'file');
      const conversationCards = allCards.filter(card => card.type === 'conversation');
      
      if (conversationCards.length > 0) {
        // 在claude_full_export的对话网格模式
        const starStats = starActions.getStarStats(conversationCards);
        return {
          totalMessages: conversationCards.reduce((sum, conv) => sum + (conv.messageCount || 0), 0),
          conversationCount: conversationCards.length,
          fileCount: files.length,
          markedCount: allMarksStats.total,
          starredCount: shouldUseStarSystem ? starStats.totalStarred : 0
        };
      } else {
        // 在文件网格模式 - 统计当前已加载文件的真实数据
        let totalMessages = 0;
        let totalConversations = 0;
        
        files.forEach((file, index) => {
          if (index === currentFileIndex && processedData) {
            // 使用当前文件的真实数据
            totalMessages += processedData.chat_history?.length || 0;
            totalConversations += processedData.format === 'claude_full_export' ? 
              (processedData.views?.conversationList?.length || 0) : 1;
          } else {
            // 对于未加载的文件，使用预估数据
            const fileCard = fileCards.find(card => card.fileIndex === index);
            totalMessages += fileCard?.messageCount || 0;
            totalConversations += fileCard?.conversationCount || 0;
          }
        });
        
        return {
          totalMessages,
          conversationCount: totalConversations,
          fileCount: files.length,
          markedCount: allMarksStats.total,
          starredCount: 0 // 文件模式没有星标
        };
      }
    } else {
      // 在时间线模式 - 使用当前文件的标记统计
      const messages = Array.isArray(sortedMessages) ? sortedMessages : timelineMessages;
      return {
        totalMessages: messages.length,
        conversationCount: 1,
        fileCount: files.length,
        markedCount: stats.total, // 使用当前文件的标记统计
        starredCount: (shouldUseStarSystem && currentConversation?.is_starred) ? 1 : 0
      };
    }
  };

  // 主题初始化
  useEffect(() => {
    console.log('[Lyra Exporter] 应用启动，设置主题');
    const savedTheme = localStorage.getItem('app-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // 初始化PWA主题色
    if (window.updatePWAThemeColor) {
      // 稍微延迟，确保主题属性已经设置
      setTimeout(() => {
        window.updatePWAThemeColor();
      }, 100);
    }
  }, []);

  // Lyra's Fetch 脚本集成 - 使用 useCallback 稳定处理函数
  const handlePostMessage = useCallback(async (event) => {
    console.log('[Lyra Exporter] 收到任何 postMessage:', {
      origin: event.origin,
      type: event.data?.type,
      source: event.data?.source,
      hasData: !!event.data
    });
    
    // 安全检查：只接受来自特定域名的消息
    const allowedOrigins = [
      'https://claude.ai',
      'https://pro.easychat.top',
      'https://gemini.google.com',
      'https://notebooklm.google.com',
      'https://aistudio.google.com',
      'http://localhost:3789',
      'https://yalums.github.io'
    ];
    
    // 检查是否是允许的 origin
    const isAllowedOrigin = allowedOrigins.some(origin => event.origin === origin) ||
                           event.origin.includes('localhost') || 
                           event.origin.includes('127.0.0.1');
    
    if (!isAllowedOrigin) {
      console.warn('[Lyra Exporter] 拒绝来自未知源的消息:', event.origin);
      return;
    }

    // 对本地开发放宽限制
    if (!allowedOrigins.some(origin => event.origin.startsWith(origin)) && 
        !event.origin.includes('localhost') && 
        !event.origin.includes('127.0.0.1')) {
      console.warn('[Lyra Exporter] 拒绝来自未知源的消息:', event.origin);
      return;
    }
    
    // 处理握手请求
    if (event.data && event.data.type === 'LYRA_HANDSHAKE' && event.data.source === 'lyra-fetch-script') {
      console.log('[Lyra Exporter] 收到 Lyra Fetch 脚本的握手请求');
      
      try {
        // 回复准备就绪
        event.source.postMessage({
          type: 'LYRA_READY',
          source: 'lyra-exporter'
        }, event.origin);
        
        console.log('[Lyra Exporter] 已发送 LYRA_READY 响应到:', event.origin);
      } catch (error) {
        console.error('[Lyra Exporter] 发送握手响应失败:', error);
      }
      return;
    }
    
    // 处理数据加载请求
    if (event.data && event.data.type === 'LYRA_LOAD_DATA' && event.data.source === 'lyra-fetch-script') {
      console.log('[Lyra Exporter] 收到 Lyra Fetch 脚本的数据:', {
        hasContent: !!event.data.data?.content,
        filename: event.data.data?.filename,
        contentLength: event.data.data?.content?.length
      });
      
      try {
        const { content, filename } = event.data.data;
        
        if (!content) {
          throw new Error('没有收到内容数据');
        }
        
        // 将 JSON 字符串转换为 File 对象
        const jsonData = typeof content === 'string' ? content : JSON.stringify(content);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const file = new File([blob], filename || 'imported_conversation.json', {
          type: 'application/json',
          lastModified: Date.now()
        });
        
        console.log('[Lyra Exporter] 创建的文件对象:', {
          name: file.name,
          size: file.size,
          type: file.type
        });
        
        // 使用 fileActions.loadFiles 加载文件
        fileActions.loadFiles([file]);
        
        console.log('[Lyra Exporter] 成功加载来自 Lyra Fetch 的数据:', filename);
        
        setError(null);
        
      } catch (error) {
        console.error('[Lyra Exporter] 处理 Lyra Fetch 数据时出错:', error);
        setError('加载数据失败: ' + error.message);
      }
    }
  }, [fileActions]);

  // postMessage 监听器 - 依赖稳定的处理函数
  useEffect(() => {
    console.log('[Lyra Exporter] 设置 postMessage 监听器');
    
    // 添加事件监听器
    window.addEventListener('message', handlePostMessage);
    
    // 清理函数
    return () => {
      console.log('[Lyra Exporter] 移除 postMessage 监听器');
      window.removeEventListener('message', handlePostMessage);
    };
  }, [handlePostMessage]); // 只依赖稳定的处理函数

  // 监听文件变化，自动切换到时间线视图
  useEffect(() => {
    // 检查是否是通过 postMessage 加载的文件
    if (files.length > 0 && processedData && !error) {
      // 只在文件刚加载且还在conversations视图时触发
      const latestFile = files[files.length - 1];
      
      // 检查是否需要自动切换视图
      if (viewMode === 'conversations' && 
          currentFileIndex === files.length - 1 && // 确保是最新加载的文件
          (latestFile.name.includes('claude_') || latestFile.name.includes('_export_'))) {
        
        console.log('[Lyra Exporter] 检测到新加载的对话文件，准备切换视图');
        
        // 根据格式决定如何切换
        if (processedData.format === 'claude_full_export') {
          // 完整导出格式保持在对话列表
          console.log('[Lyra Exporter] 完整导出格式，保持在对话列表视图');
        } else {
          // 其他格式切换到时间线
          console.log('[Lyra Exporter] 切换到时间线视图');
          setSelectedFileIndex(files.length - 1);
          setSelectedConversationUuid(null);
          setViewMode('timeline');
        }
      }
    }
  }, [files.length, currentFileIndex, error, files, processedData, viewMode]);

  // 导出功能 - 修改部分
  const handleExport = async () => {
    const { exportChatAsMarkdown, saveTextFile } = await import('./utils/exportHelper');
    
    let dataToExport = [];
    let exportFileName = '';
    
    switch (exportOptions.scope) {
      case 'current':
        // 导出当前时间线文件
        if (viewMode === 'timeline' && processedData) {
          // 使用排序后的消息（如果有自定义排序）
          const messagesToExport = hasCustomSort ? sortedMessages : (processedData.chat_history || []);
          
          dataToExport = [{
            data: {
              ...processedData,
              chat_history: messagesToExport
            },
            fileName: currentFile?.name || 'export',
            marks: marks
          }];
          exportFileName = `${currentFile?.name.replace('.json', '') || 'export'}_${new Date().toISOString().split('T')[0]}.md`;
        }
        break;
        
      case 'operated':
        // 导出所有有操作的文件
        for (const fileUuid of operatedFiles) {
          // 这里需要特殊处理，因为我们现在使用的是hash而不是index
          // 需要通过比较所有文件的hash来找到对应的文件
          let targetFile = null;
          let targetFileIndex = -1;
          
          files.forEach((file, index) => {
            const testUuid = generateFileCardUuid(index, file);
            if (fileUuid.includes(testUuid) || fileUuid === testUuid) {
              targetFile = file;
              targetFileIndex = index;
            }
          });
          
          if (targetFile && targetFileIndex !== -1) {
            // 处理文件导出...
            try {
              const text = await targetFile.text();
              const jsonData = JSON.parse(text);
              const { extractChatData, detectBranches } = await import('./utils/fileParser');
              let data = extractChatData(jsonData, targetFile.name);
              data = detectBranches(data);
              
              // 获取该文件的标记数据
              const fileMarks = {
                completed: new Set(),
                important: new Set(),
                deleted: new Set()
              };
              
              try {
                const markData = localStorage.getItem(`marks_${fileUuid}`);
                if (markData) {
                  const parsed = JSON.parse(markData);
                  fileMarks.completed = new Set(parsed.completed || []);
                  fileMarks.important = new Set(parsed.important || []);
                  fileMarks.deleted = new Set(parsed.deleted || []);
                }
              } catch (err) {
                console.error(`获取文件标记失败:`, err);
              }
              
              dataToExport.push({
                data,
                fileName: targetFile.name,
                marks: fileMarks
              });
            } catch (err) {
              console.error(`导出文件 ${targetFile.name} 失败:`, err);
            }
          }
        }
        exportFileName = `operated_files_${new Date().toISOString().split('T')[0]}.md`;
        break;
        
      case 'all':
        // 导出所有文件
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          try {
            const text = await file.text();
            const jsonData = JSON.parse(text);
            const { extractChatData, detectBranches } = await import('./utils/fileParser');
            let data = extractChatData(jsonData, file.name);
            data = detectBranches(data);
            
            // 如果是当前文件且有自定义排序，使用排序后的消息
            let messagesToExport = data.chat_history || [];
            if (i === currentFileIndex && hasCustomSort) {
              messagesToExport = sortedMessages;
            }
            
            // 获取该文件的标记数据
            const fileMarks = {
              completed: new Set(),
              important: new Set(),
              deleted: new Set()
            };
            
            const fileUuid = generateFileCardUuid(i, file);
            try {
              const markData = localStorage.getItem(`marks_${fileUuid}`);
              if (markData) {
                const parsed = JSON.parse(markData);
                fileMarks.completed = new Set(parsed.completed || []);
                fileMarks.important = new Set(parsed.important || []);
                fileMarks.deleted = new Set(parsed.deleted || []);
              }
            } catch (err) {
              console.error(`获取文件 ${file.name} 的标记失败:`, err);
            }
            
            dataToExport.push({
              data: {
                ...data,
                chat_history: messagesToExport
              },
              fileName: file.name,
              marks: fileMarks
            });
          } catch (err) {
            console.error(`导出文件 ${file.name} 失败:`, err);
          }
        }
        exportFileName = `all_files_${new Date().toISOString().split('T')[0]}.md`;
        break;
        
      default:
        // 添加默认情况处理
        if (processedData) {
          dataToExport = [{
            data: processedData,
            fileName: currentFile?.name || 'export',
            marks: marks
          }];
          exportFileName = `export_${new Date().toISOString().split('T')[0]}.md`;
        }
        break;
    }
    
    if (dataToExport.length === 0) {
      alert('没有可导出的数据');
      return;
    }
    
    // 生成 Markdown 内容
    let markdownContent = '';
    
    dataToExport.forEach((item, index) => {
      if (index > 0) {
        markdownContent += '\n\n---\n---\n\n';
      }
      
      // 根据导出选项筛选消息
      let filteredHistory = [...(item.data.chat_history || [])];
      
      // 如果选择了"仅导出已完成标记"
      if (exportOptions.includeCompleted) {
        filteredHistory = filteredHistory.filter(msg => 
          item.marks.completed?.has(msg.index)
        );
      }
      
      // 排除已删除的消息（如果选择了该选项）
      if (exportOptions.excludeDeleted) {
        filteredHistory = filteredHistory.filter(msg => 
          !item.marks.deleted?.has(msg.index)
        );
      }
      
      const exportData = {
        ...item.data,
        chat_history: filteredHistory
      };
      
      const config = {
        exportMarkedOnly: exportOptions.includeCompleted, // 传递是否仅导出已完成
        markedItems: item.marks.completed || new Set(),
        includeTimestamps: exportOptions.includeTimestamps,
        includeThinking: exportOptions.includeThinking,
        includeArtifacts: exportOptions.includeArtifacts,
        includeTools: exportOptions.includeTools,
        includeCitations: exportOptions.includeCitations,
        exportObsidianMetadata: false
      };
      
      try {
        markdownContent += exportChatAsMarkdown(exportData, config);
      } catch (err) {
        console.error(`导出文件 ${item.fileName} 失败:`, err);
        markdownContent += `\n# 导出失败: ${item.fileName}\n\n错误信息: ${err.message}\n\n`;
      }
    });
    
    // 保存文件
    if (saveTextFile(markdownContent, exportFileName)) {
      setShowExportPanel(false);
    }
  };

  // 获取搜索占位符
  const getSearchPlaceholder = () => {
    if (isFullExportConversationMode) {
      return "搜索对话标题、项目名称...";
    } else if (viewMode === 'conversations') {
      return "搜索文件名称、格式...";
    } else {
      return "搜索消息内容、思考过程、Artifacts...";
    }
  };

  // 获取当前视图的数据用于搜索结果显示
  const getSearchResultData = () => {
    if (viewMode === 'conversations') {
      const hasConversationCards = allCards.some(card => card.type === 'conversation');
      if (hasConversationCards) {
        return {
          displayed: filteredMessages.length,
          total: allCards.length,
          unit: '个对话'
        };
      } else {
        return {
          displayed: filteredMessages.length,
          total: allCards.length,
          unit: '个文件'
        };
      }
    } else {
      const messages = Array.isArray(sortedMessages) ? sortedMessages : timelineMessages;
      return {
        displayed: filteredMessages.length,
        total: messages.length,
        unit: '条消息'
      };
    }
  };

  const searchStats = getSearchResultData();

  // 获取当前对话的信息（用于ConversationTimeline组件）- 更新以包含星标状态
  const currentConversation = useMemo(() => {
    if (viewMode === 'timeline' && selectedFileIndex !== null) {
      if (selectedConversationUuid && processedData?.format === 'claude_full_export') {
        // 在claude_full_export格式中找到对应的对话
        const conversation = processedData.views?.conversationList?.find(
          conv => conv.uuid === selectedConversationUuid
        );
        if (conversation && files[selectedFileIndex]) {
          const convUuid = generateConversationCardUuid(selectedFileIndex, conversation.uuid, files[selectedFileIndex]);
          return {
            ...conversation,
            uuid: convUuid,
            // 计算最终的星标状态
            is_starred: shouldUseStarSystem ? 
              starActions.isStarred(convUuid, conversation.is_starred) :
              conversation.is_starred
          };
        }
        return null;
      } else {
        // 普通文件 - 避免依赖整个allCards数组
        const file = files[selectedFileIndex];
        if (file) {
          const metadata = fileMetadata[file.name] || {};
          const isCurrentFile = selectedFileIndex === currentFileIndex;
          const fileData = isCurrentFile ? processedData : null;
          
          const fileCard = {
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
          
          // 确保使用正确的对话标题
          if (selectedFileIndex === currentFileIndex && processedData) {
            return {
              ...fileCard,
              name: processedData.meta_info?.title || fileCard.name
            };
          }
          return fileCard;
        }
      }
    }
    return null;
  }, [viewMode, selectedFileIndex, selectedConversationUuid, processedData, files, currentFileIndex, fileMetadata, starActions, shouldUseStarSystem]);

  return (
    <div className="app-redesigned">
      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".json"
        onChange={handleFileLoad}
        style={{ display: 'none' }}
      />

      {/* 如果没有文件，显示欢迎页面 */}
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
              
              {/* 返回按钮 */}
              {viewMode === 'timeline' && (
                <button 
                  className="btn-secondary small"
                  onClick={handleBackToConversations}
                >
                  ← 返回对话列表
                </button>
              )}
              
              {/* 搜索框 - 只在非claude_full_export对话模式下显示 */}
              {!isFullExportConversationMode && (
                <div className="search-box">
                  <span className="search-icon">🔍</span>
                  <input 
                    type="text" 
                    className="search-input"
                    placeholder={getSearchPlaceholder()}
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
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
              {/* 导出按钮*/}
              <button 
                className="btn-secondary small"
                onClick={() => setShowExportPanel(true)}
                title="导出"
              >
                📤 导出
              </button>
              
              {/* 在对话网格模式下显示星标管理按钮 */}
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
            {/* 内容区域 */}
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
                  {/* 在对话网格模式下显示星标统计 */}
                  {isFullExportConversationMode && shouldUseStarSystem && (
                    <div className="stat-card">
                      <div className="stat-value">{getStats().starredCount}</div>
                      <div className="stat-label">星标对话</div>
                    </div>
                  )}
                </div>
              </div>

              {/* 筛选器 - 仅在claude_full_export对话模式下显示 */}
              {isFullExportConversationMode && (
                <ConversationFilter
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
                  /* 卡片网格视图（文件或对话） */
                  <ConversationGrid
                    conversations={query ? filteredMessages : allCards}
                    onConversationSelect={handleCardSelect}
                    onFileRemove={handleFileRemove}
                    onFileAdd={() => fileInputRef.current?.click()}
                    onStarToggle={isFullExportConversationMode && shouldUseStarSystem ? handleStarToggle : null}
                    starredConversations={shouldUseStarSystem ? starredConversations : new Map()}
                    showFileInfo={false}
                    isFileMode={allCards.some(card => card.type === 'file')}
                    showFileManagement={true}
                  />
                ) : (
                  /* 时间线视图 */
                  <ConversationTimeline
                    data={processedData}
                    conversation={currentConversation}
                    messages={hasCustomSort && sortedMessages.length > 0 ? 
                      (query ? filteredMessages : sortedMessages) : 
                      (query ? filteredMessages : timelineMessages)
                    }
                    marks={marks}
                    onMessageSelect={handleMessageSelect}
                    markActions={markActions}
                    format={processedData?.format}
                    sortActions={{
                      ...sortActions,
                      moveMessage: (index, direction) => {
                        sortActions.moveMessage(index, direction);
                        // 记录有操作的文件
                        if (currentFileUuid) {
                          setOperatedFiles(prev => new Set(prev).add(currentFileUuid));
                        }
                      }
                    }}
                    hasCustomSort={hasCustomSort}
                    enableSorting={true}
                    files={files}
                    currentFileIndex={currentFileIndex}
                    onFileSwitch={(index) => {
                      // 保存当前滚动位置
                      if (contentAreaRef.current) {
                        const key = currentFile ? `file-${currentFileIndex}` : 'main';
                        setScrollPositions(prev => ({
                          ...prev,
                          [key]: contentAreaRef.current.scrollTop
                        }));
                      }
                      
                      // 切换文件
                      fileActions.switchFile(index);
                      
                      // 更新选中状态（保持普通文件格式）
                      setSelectedFileIndex(index);
                      setSelectedConversationUuid(null);
                    }}
                    searchQuery={query}
                  />
                )}
              </div>
            </div>
          </div>

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
                    showTabs={false} // 模态框中不再显示内部标签页
                  />
                </div>
                <div className="modal-footer">
                  <button 
                    className="btn-secondary"
                    onClick={() => {
                      if (selectedMessageIndex !== null) {
                        handleMarkToggle(selectedMessageIndex, 'completed');
                      }
                    }}
                  >
                    {markActions.isMarked(selectedMessageIndex, 'completed') ? '取消完成' : '标记完成'} ✓
                  </button>
                  <button 
                    className="btn-secondary"
                    onClick={() => {
                      if (selectedMessageIndex !== null) {
                        handleMarkToggle(selectedMessageIndex, 'important');
                      }
                    }}
                  >
                    {markActions.isMarked(selectedMessageIndex, 'important') ? '取消重要' : '标记重要'} ⭐
                  </button>
                  <button 
                    className="btn-secondary"
                    onClick={() => {
                      if (selectedMessageIndex !== null) {
                        handleMarkToggle(selectedMessageIndex, 'deleted');
                      }
                    }}
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
          <ThemeSwitcher />

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
                      完成 {getAllMarksStats().completed} · 重要 {getAllMarksStats().important} · 删除 {getAllMarksStats().deleted}
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