// components/ConversationTimeline.js
// 增强版时间线组件,整合了分支切换功能、排序控制、复制功能和重命名功能
import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MessageDetail from './MessageDetail';
import PlatformIcon from './PlatformIcon';
import { copyMessage } from '../utils/copyManager';
import { PlatformUtils, DateTimeUtils, TextUtils } from '../utils/commonUtils';
import { useI18n } from '../hooks/useI18n';
import { getRenameManager } from '../utils/renameManager';

// ==================== 重命名对话框组件 ====================
const RenameDialog = ({ 
  isOpen, 
  currentName, 
  onSave, 
  onCancel,
  t 
}) => {
  const [newName, setNewName] = useState(currentName || '');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNewName(currentName || '');
      setError('');
    }
  }, [isOpen, currentName]);

  const handleSave = () => {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      setError(t('rename.error.empty'));
      return;
    }
    onSave(trimmedName);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content rename-dialog" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{t('rename.title')}</h3>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>{t('rename.label')}</label>
            <input
              type="text"
              className="form-input"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setError('');
              }}
              onKeyPress={handleKeyPress}
              autoFocus
              placeholder={t('rename.placeholder')}
            />
            {error && <div className="error-message">{error}</div>}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCancel}>
            {t('common.cancel')}
          </button>
          <button className="btn-primary" onClick={handleSave}>
            {t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== 分支切换器组件(内嵌) ====================
const BranchSwitcher = ({ 
  branchPoint, 
  availableBranches, 
  currentBranchIndex, 
  onBranchChange,
  onShowAllBranches,
  showAllMode = false,
  className = ""
}) => {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);
  const [switchAnimation, setSwitchAnimation] = useState(false);

  const currentBranch = availableBranches[currentBranchIndex];
  const hasPrevious = currentBranchIndex > 0;
  const hasNext = currentBranchIndex < availableBranches.length - 1;

  const handlePrevious = () => {
    if (hasPrevious) {
      setSwitchAnimation(true);
      setTimeout(() => {
        onBranchChange(currentBranchIndex - 1);
        setSwitchAnimation(false);
      }, 150);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      setSwitchAnimation(true);
      setTimeout(() => {
        onBranchChange(currentBranchIndex + 1);
        setSwitchAnimation(false);
      }, 150);
    }
  };

  const handleDirectSwitch = (index) => {
    if (index !== currentBranchIndex) {
      setSwitchAnimation(true);
      setTimeout(() => {
        onBranchChange(index);
        setSwitchAnimation(false);
        setIsExpanded(false);
      }, 150);
    }
  };

  const getBranchDisplayName = (branch, index) => {
    return index === 0 ? t('timeline.branch.mainBranch') : t('timeline.branch.branch') + ` ${index}`;
  };

  const getBranchPreview = (branch) => {
    return branch?.preview || '...';
  };

  const getBranchCounter = () => {
    if (showAllMode) return `${t('timeline.branch.all')}/${availableBranches.length}`;
    return `${currentBranchIndex + 1}/${availableBranches.length}`;
  };

  if (!showAllMode && !currentBranch) return null;

  return (
    <div className={`branch-switcher ${className}`}>
      <div className="branch-switcher-main">
        {/* 左箭头 */}
        <button
          className={`branch-arrow branch-arrow-left ${!hasPrevious ? 'disabled' : ''}`}
          onClick={handlePrevious}
          disabled={!hasPrevious}
          title={t('timeline.branch.previousBranch')}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M10 12l-4-4 4-4v8z"/>
          </svg>
        </button>

        {/* 分支信息区域 */}
        <div 
          className={`branch-info ${switchAnimation ? 'switching' : ''}`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="branch-info-main">
            <span className="branch-name">
              {getBranchDisplayName(currentBranch, currentBranchIndex)}
            </span>
            <span className="branch-counter">
              {getBranchCounter()}
            </span>
          </div>
          
          <div className="branch-preview">
            {getBranchPreview(currentBranch)}
          </div>

          {/* 展开指示器 */}
          {availableBranches.length > 2 && (
            <div className={`expand-indicator ${isExpanded ? 'expanded' : ''}`}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M6 8L2 4h8l-4 4z"/>
              </svg>
            </div>
          )}
        </div>

        {/* 右箭头 */}
        <button
          className={`branch-arrow branch-arrow-right ${!hasNext ? 'disabled' : ''}`}
          onClick={handleNext}
          disabled={!hasNext}
          title={t('timeline.branch.nextBranch')}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6 4l4 4-4 4V4z"/>
          </svg>
        </button>
      </div>

      {/* 展开的分支列表 */}
      {isExpanded && availableBranches.length > 2 && (
        <div className="branch-list">
          {/* 显示全部分支选项 */}
          <div
            className={`branch-option ${showAllMode ? 'active' : ''}`}
            onClick={() => {
              if (onShowAllBranches) onShowAllBranches();
              setIsExpanded(false);
            }}
          >
            <div className="branch-option-header">
              <span className="branch-option-name">{t('timeline.branch.showAllBranches')}</span>
              <span className="branch-option-count">{t('timeline.branch.allMessages')}</span>
            </div>
            <div className="branch-option-preview">{t('timeline.branch.showMessagesFromAllBranches')}</div>
          </div>
          
          {/* 各个分支选项 */}
          {availableBranches.map((branch, index) => (
            <div
              key={`${branchPoint.uuid}-branch-${index}`}
              className={`branch-option ${!showAllMode && index === currentBranchIndex ? 'active' : ''}`}
              onClick={() => handleDirectSwitch(index)}
            >
              <div className="branch-option-header">
                <span className="branch-option-name">
                  {getBranchDisplayName(branch, index)}
                </span>
                <span className="branch-option-count">
                  {branch.messageCount}{t('timeline.branch.messages')}
                </span>
              </div>
              <div className="branch-option-preview">
                {getBranchPreview(branch)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ==================== 统一的消息详情面板 ====================
const MessageDetailPanel = ({
  data,
  selectedMessageIndex,
  activeTab,
  searchQuery,
  format,
  onTabChange,
  markActions,
  displayMessages,
  copiedMessageIndex,
  onCopyMessage,
  t,
  showTabs = true // 新增:控制是否显示标签页
}) => {
  if (selectedMessageIndex === null) {
    return (
      <div className="detail-placeholder">
        <p>{t('timeline.detail.selectMessage')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="detail-content">
        <MessageDetail
          processedData={data}
          selectedMessageIndex={selectedMessageIndex}
          activeTab={activeTab}
          searchQuery={searchQuery}
          format={format}
          onTabChange={onTabChange}
          showTabs={showTabs}
        />
      </div>
      
      {/* 标记按钮 */}
      {markActions && (
        <div className="detail-actions">
          {/* 复制按钮 */}
          <button 
            className={`btn-secondary ${copiedMessageIndex === selectedMessageIndex ? 'copied' : ''}`}
            onClick={() => {
              const message = displayMessages.find(m => m.index === selectedMessageIndex);
              if (message) {
                onCopyMessage(message, selectedMessageIndex);
              }
            }}
          >
            {copiedMessageIndex === selectedMessageIndex ? `${t('timeline.actions.copied')} ✓` : `${t('timeline.actions.copyMessage')} 📋`}
          </button>
          
          <button 
            className="btn-secondary"
            onClick={() => markActions.toggleMark(selectedMessageIndex, 'completed')}
          >
            {markActions.isMarked(selectedMessageIndex, 'completed') ? t('timeline.actions.unmarkCompleted') : t('timeline.actions.markCompleted')} ✓
          </button>
          <button 
            className="btn-secondary"
            onClick={() => markActions.toggleMark(selectedMessageIndex, 'important')}
          >
            {markActions.isMarked(selectedMessageIndex, 'important') ? t('timeline.actions.unmarkImportant') : t('timeline.actions.markImportant')} ⭐
          </button>
          <button 
            className="btn-secondary"
            onClick={() => markActions.toggleMark(selectedMessageIndex, 'deleted')}
          >
            {markActions.isMarked(selectedMessageIndex, 'deleted') ? t('timeline.actions.unmarkDeleted') : t('timeline.actions.markDeleted')} 🗑️
          </button>
        </div>
      )}
    </>
  );
};

// ==================== 主时间线组件 ====================
const ConversationTimeline = ({ 
  data, 
  messages, 
  marks, 
  markActions,
  format,
  conversation = null,
  sortActions = null,
  hasCustomSort = false,
  enableSorting = false,
  files = [],
  currentFileIndex = null,
  onFileSwitch = null,
  searchQuery = '',
  branchState = null,
  onBranchStateChange = null,
  onShowSettings = null, // 新增:打开设置面板
  onHideNavbar = null, // 新增:控制导航栏显示
  onRename = null // 新增:重命名回调
}) => {
  const { t } = useI18n();
  const [selectedMessageIndex, setSelectedMessageIndex] = useState(null);
  const [activeTab, setActiveTab] = useState('content');
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [branchFilters, setBranchFilters] = useState(new Map());
  const [showAllBranches, setShowAllBranches] = useState(branchState?.showAllBranches || false);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState(null);
  const [sortingEnabled, setSortingEnabled] = useState(false);
  const [showMobileDetail, setShowMobileDetail] = useState(false); // 新增:移动端详情显示状态
  
  // 重命名相关状态
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameManager] = useState(() => getRenameManager());
  const [customName, setCustomName] = useState('');
  
  // 滚动相关状态
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [scrollDirection, setScrollDirection] = useState('up');
  const leftPanelRef = React.useRef(null);
  
  // 同步外部分支状态
  useEffect(() => {
    if (branchState) {
      setShowAllBranches(branchState.showAllBranches);
      if (branchState.currentBranchIndexes) {
        setBranchFilters(branchState.currentBranchIndexes);
      }
    }
  }, [branchState]);
  
  // 初始化自定义名称
  useEffect(() => {
    if (conversation?.uuid) {
      const savedName = renameManager.getRename(conversation.uuid, conversation.name);
      setCustomName(savedName);
    }
  }, [conversation, renameManager]);
  
  // ==================== 分支分析 ====================
  
  const branchAnalysis = useMemo(() => {
    const findBranchMessages = (startUuid, msgDict, parentChildren) => {
      const branchMessages = [msgDict[startUuid]];
      const visited = new Set([startUuid]);
      
      const traverse = (currentUuid) => {
        const children = parentChildren[currentUuid] || [];
        children.forEach(childUuid => {
          if (!visited.has(childUuid) && msgDict[childUuid]) {
            visited.add(childUuid);
            branchMessages.push(msgDict[childUuid]);
            traverse(childUuid);
          }
        });
      };
      
      traverse(startUuid);
      return branchMessages.sort((a, b) => a.index - b.index);
    };
    
    const msgDict = {};
    const parentChildren = {};
    const branchPoints = new Map();
    
    // 过滤消息
    let analysisMessages = messages;
    if (format === 'claude_full_export' && conversation?.uuid) {
      const realConversationUuid = conversation.uuid.includes('-') ? 
        conversation.uuid.split('-').slice(1).join('-') : conversation.uuid;
      
      analysisMessages = messages.filter(msg => 
        msg.conversation_uuid === realConversationUuid && 
        !msg.is_conversation_header
      );
    }
    
    analysisMessages.forEach(msg => {
      const uuid = msg.uuid;
      const parentUuid = msg.parent_uuid;
      
      msgDict[uuid] = msg;
      
      if (parentUuid) {
        if (!parentChildren[parentUuid]) {
          parentChildren[parentUuid] = [];
        }
        parentChildren[parentUuid].push(uuid);
      }
    });
    
    // 识别分支点
    Object.entries(parentChildren).forEach(([parentUuid, children]) => {
      if (children.length > 1 && msgDict[parentUuid]) {
        const branchPoint = msgDict[parentUuid];
        
        const sortedChildren = children
          .map(uuid => msgDict[uuid])
          .filter(msg => msg)
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        const branches = sortedChildren.map((childMsg, branchIndex) => {
          const branchMessages = findBranchMessages(childMsg.uuid, msgDict, parentChildren);
          
          return {
            branchIndex,
            startMessage: childMsg,
            messages: branchMessages,
            messageCount: branchMessages.length,
            path: `branch_${branchPoint.uuid}_${branchIndex}`,
            preview: childMsg.display_text ? 
              (childMsg.display_text.length > 50 ? 
                childMsg.display_text.substring(0, 50) + '...' : 
                childMsg.display_text) :
              '...'
          };
        });
        
        branchPoints.set(parentUuid, {
          branchPoint,
          branches,
          currentBranchIndex: 0
        });
      }
    });
    
    return { branchPoints, msgDict, parentChildren };
  }, [messages, format, conversation]);
  
  // ==================== 状态和副作用 ====================
  
  useEffect(() => {
    const handleResize = () => {
      const newIsDesktop = window.innerWidth >= 1024;
      setIsDesktop(newIsDesktop);
      // 如果切换到桌面端,关闭移动端详情
      if (newIsDesktop) {
        setShowMobileDetail(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  useEffect(() => {
    if (branchAnalysis.branchPoints.size > 0 && branchFilters.size === 0 && !showAllBranches) {
      const initialFilters = new Map();
      branchAnalysis.branchPoints.forEach((branchData, branchPointUuid) => {
        initialFilters.set(branchPointUuid, 0);
      });
      setBranchFilters(initialFilters);
    }
  }, [branchAnalysis.branchPoints, branchFilters.size, showAllBranches]);

  useEffect(() => {
    if (isDesktop && messages.length > 0 && !selectedMessageIndex) {
      setSelectedMessageIndex(messages[0].index);
    }
  }, [isDesktop, messages, selectedMessageIndex]);

  // 初始化排序状态
  useEffect(() => {
    setSortingEnabled(enableSorting);
  }, [enableSorting]);
  
  // 滚动监听器 - 智能顶栏隐藏/显示
  useEffect(() => {
    if (!isDesktop || !leftPanelRef.current) return;
    
    const leftPanel = leftPanelRef.current;
    let ticking = false;
    const SCROLL_THRESHOLD = 10; // 最小滚动距离
    const HIDE_THRESHOLD = 100; // 开始隐藏的滚动距离
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const currentScrollY = leftPanel.scrollTop;
          const deltaY = currentScrollY - lastScrollY;
          
          // 检测滚动方向
          if (Math.abs(deltaY) > SCROLL_THRESHOLD) {
            const newDirection = deltaY > 0 ? 'down' : 'up';
            
            // 向下滚动且超过阈值时隐藏顶栏
            if (newDirection === 'down' && currentScrollY > HIDE_THRESHOLD && !isHeaderHidden) {
              setIsHeaderHidden(true);
              setScrollDirection('down');
            }
            // 向上滚动或滚动到顶部时显示顶栏
            else if ((newDirection === 'up' || currentScrollY <= HIDE_THRESHOLD) && isHeaderHidden) {
              setIsHeaderHidden(false);
              setScrollDirection('up');
            }
            
            setLastScrollY(currentScrollY);
          }
          
          ticking = false;
        });
        ticking = true;
      }
    };
    
    leftPanel.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      leftPanel.removeEventListener('scroll', handleScroll);
    };
  }, [isDesktop, lastScrollY, isHeaderHidden]);
  
  // 重置滚动状态 - 当数据改变时
  useEffect(() => {
    setIsHeaderHidden(false);
    setLastScrollY(0);
    setScrollDirection('up');
    if (leftPanelRef.current) {
      leftPanelRef.current.scrollTop = 0;
    }
  }, [conversation?.uuid, messages.length]);
  
  // ==================== 消息过滤和显示 ====================
  
  const displayMessages = useMemo(() => {
    if (showAllBranches) return messages;
    if (branchAnalysis.branchPoints.size === 0) return messages;
    if (branchFilters.size === 0) return messages;

    const visibleMessages = [];
    
    for (const msg of messages) {
      let shouldShow = true;
      
      for (const [branchPointUuid, selectedBranchIndex] of branchFilters.entries()) {
        const branchData = branchAnalysis.branchPoints.get(branchPointUuid);
        if (!branchData) continue;
        
        const branchPoint = branchData.branchPoint;
        const selectedBranch = branchData.branches[selectedBranchIndex];
        
        if (msg.index > branchPoint.index) {
          const belongsToSelectedBranch = selectedBranch.messages.some(
            branchMsg => branchMsg.uuid === msg.uuid
          );
          
          if (!belongsToSelectedBranch) {
            const belongsToAnyBranch = branchData.branches.some(
              branch => branch.messages.some(branchMsg => branchMsg.uuid === msg.uuid)
            );
            
            if (belongsToAnyBranch) {
              shouldShow = false;
              break;
            }
          }
        }
      }
      
      if (shouldShow) visibleMessages.push(msg);
    }
    
    return visibleMessages;
  }, [messages, branchFilters, branchAnalysis, showAllBranches]);
  
  // ==================== 事件处理函数 ====================
  
  const handleBranchSwitch = (branchPointUuid, newBranchIndex) => {
    setShowAllBranches(false);
    setBranchFilters(prev => {
      const newFilters = new Map(prev);
      newFilters.set(branchPointUuid, newBranchIndex);
      
      // 通知父组件分支状态变化
      if (onBranchStateChange) {
        onBranchStateChange({
          showAllBranches: false,
          currentBranchIndexes: newFilters
        });
      }
      
      return newFilters;
    });
  };

  const handleShowAllBranches = () => {
    const newShowAllBranches = !showAllBranches;
    setShowAllBranches(newShowAllBranches);
    
    // 通知父组件分支状态变化
    if (onBranchStateChange) {
      onBranchStateChange({
        showAllBranches: newShowAllBranches,
        currentBranchIndexes: newShowAllBranches ? new Map() : branchFilters
      });
    }
    
    if (newShowAllBranches) {
      setBranchFilters(new Map());
      // 自动启用排序模式
      if (sortActions && !sortingEnabled) {
        sortActions.enableSort();
        setSortingEnabled(true);
      }
    } else {
      // 退出显示全部时,如果有自定义排序则重置
      if (hasCustomSort && sortActions?.resetSort) {
        sortActions.resetSort();
      }
      setSortingEnabled(false);
    }
  };
  
  const handleMessageSelect = (messageIndex) => {
    setSelectedMessageIndex(messageIndex);
    setActiveTab('content'); // 重置到内容标签
    if (!isDesktop) {
      // 移动端:显示移动端详情 modal
      setShowMobileDetail(true);
      // 隐藏导航栏
      if (onHideNavbar) {
        onHideNavbar(true);
      }
    }
  };
  
  const handleCloseMobileDetail = () => {
    setShowMobileDetail(false);
    // 恢复导航栏显示
    if (onHideNavbar) {
      onHideNavbar(false);
    }
  };
  
  const handleNavigateMessage = (direction) => {
    const currentIndex = displayMessages.findIndex(m => m.index === selectedMessageIndex);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < displayMessages.length) {
      setSelectedMessageIndex(displayMessages[newIndex].index);
      setActiveTab('content');
    }
  };
  
  const handleCopyMessage = async (message, messageIndex) => {
    const success = await copyMessage(message, {
      messages: {
        success: t('copy.messages.success'),
        error: t('copy.messages.error'),
        generalError: t('copy.messages.generalError')
      },
      i18n: {
        timeLabel: t('copy.format.timeLabel'),
        thinkingLabel: t('copy.format.thinkingLabel'),
        artifactsLabel: t('copy.format.artifactsLabel'),
        noTitle: t('copy.format.noTitle'),
        unknownType: t('copy.format.unknownType')
      }
    });
    if (success) {
      setCopiedMessageIndex(messageIndex);
      setTimeout(() => setCopiedMessageIndex(null), 2000);
    }
  };

  const handleToggleSort = () => {
    if (!sortingEnabled) {
      sortActions?.enableSort();
      setSortingEnabled(true);
    } else {
      if (hasCustomSort) {
        sortActions?.resetSort();
      }
      setSortingEnabled(false);
    }
  };
  
  // 重命名处理
  const handleOpenRename = () => {
    setShowRenameDialog(true);
  };
  
  const handleSaveRename = (newName) => {
    if (conversation?.uuid) {
      renameManager.setRename(conversation.uuid, newName);
      setCustomName(newName);
      setShowRenameDialog(false);
      // 通知父组件更新
      if (onRename) {
        onRename(conversation.uuid, newName);
      }
    }
  };
  
  const handleCancelRename = () => {
    setShowRenameDialog(false);
  };
  
  // ==================== 工具函数 ====================
  
  const getLastUpdatedTime = () => {
    if (!displayMessages || displayMessages.length === 0) return t('timeline.conversation.unknownTime');
    
    const lastMessage = displayMessages[displayMessages.length - 1];
    if (lastMessage?.timestamp) {
      return DateTimeUtils.formatDateTime(lastMessage.timestamp);
    }
    return t('timeline.conversation.unknownTime');
  };

  const getConversationInfo = () => {
    const lastUpdated = getLastUpdatedTime();
    
    if (conversation) {
      const platformName = PlatformUtils.getPlatformName(data?.meta_info?.platform);
      
      // 使用自定义名称或原始名称
      const displayName = customName || conversation.name || t('timeline.conversation.unnamedConversation');
      
      return {
        name: displayName,
        originalName: conversation.name, // 保留原始名称用于重命名对话框
        model: conversation.model || platformName,
        created_at: conversation.created_at || t('timeline.conversation.unknownTime'),
        updated_at: lastUpdated,
        is_starred: conversation.is_starred || false,
        messageCount: displayMessages.length,
        platform: platformName,
        uuid: conversation.uuid
      };
    }
    
    if (!data) return null;
    
    const metaInfo = data.meta_info || {};
    const platformName = PlatformUtils.getPlatformName(
      metaInfo.platform || (format === 'gemini_notebooklm' ? 'gemini' : 'claude')
    );
    
    return {
      name: metaInfo.title || t('timeline.conversation.unknownConversation'),
      originalName: metaInfo.title,
      model: metaInfo.model || platformName,
      created_at: metaInfo.created_at || t('timeline.conversation.unknownTime'),
      updated_at: lastUpdated,
      is_starred: false,
      messageCount: displayMessages.length,
      platform: platformName
    };
  };

  const isMarked = (messageIndex, markType) => {
    return marks[markType]?.has(messageIndex) || false;
  };

  const getPlatformAvatarClass = (sender, platform) => {
    if (sender === 'human') return 'human';
    
    // AI头像根据平台切换颜色
    const platformLower = platform?.toLowerCase() || 'claude';
    
    if (platformLower.includes('gemini')) return 'assistant platform-gemini';
    if (platformLower.includes('ai studio') || platformLower.includes('aistudio')) return 'assistant platform-aistudio';
    if (platformLower.includes('notebooklm')) return 'assistant platform-notebooklm';
    
    return 'assistant platform-claude';
  };
  
  const getFilePreview = (direction) => {
    if (!files || files.length <= 1 || currentFileIndex === null || format === 'claude_full_export') {
      return null;
    }
    
    const targetIndex = direction === 'prev' ? currentFileIndex - 1 : currentFileIndex + 1;
    if (targetIndex < 0 || targetIndex >= files.length) return null;
    
    return {
      file: files[targetIndex],
      index: targetIndex,
      direction
    };
  };
  
  // ==================== 渲染 ====================
  
  const conversationInfo = getConversationInfo();
  const platformClass = PlatformUtils.getPlatformClass(conversationInfo?.platform);
  const prevFilePreview = getFilePreview('prev');
  const nextFilePreview = getFilePreview('next');

  return (
    <div className={`enhanced-timeline-container ${platformClass} ${isDesktop ? 'desktop-layout' : 'mobile-layout'} ${isHeaderHidden ? 'header-hidden' : ''}`}>
      <div className="timeline-main-content">
        {/* 左侧时间线面板 */}
        <div className="timeline-left-panel" ref={leftPanelRef}>
          {/* 文件切换预览 - 顶部 */}
          {prevFilePreview && isDesktop && (
            <div 
              className="file-preview file-preview-top"
              onClick={() => onFileSwitch && onFileSwitch(prevFilePreview.index)}
            >
              <div className="file-preview-inner">
                <span className="file-preview-arrow">↑</span>
                <span className="file-preview-name">{prevFilePreview.file.name}</span>
                <span className="file-preview-hint">{t('timeline.file.clickToPrevious')}</span>
              </div>
            </div>
          )}
          
          {/* 对话信息卡片 */}
          {conversationInfo && (
            <div className={`conversation-info-card ${isHeaderHidden ? 'hidden' : ''}`}>
              <h2>
                {conversationInfo.name} 
                {conversationInfo.is_starred && ' ⭐'}
                {/* 重命名按钮 - 替代platform-badge */}
                <button 
                  className="rename-btn"
                  onClick={handleOpenRename}
                  title={t('rename.action')}
                  style={{ 
                    marginLeft: '8px',
                    padding: '2px 6px',
                    fontSize: '14px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)'
                  }}
                >
                  ✏️
                </button>
                {/* 操作按钮组 */}
                <span className="conversation-actions" style={{ marginLeft: '12px', display: 'inline-flex', gap: '8px' }}>
                  {/* 重置当前对话标记 */}
                  {markActions && (
                    <button 
                      className="btn-secondary small"
                      onClick={() => {
                        if (window.confirm(t('timeline.actions.confirmClearMarks'))) {
                          markActions.clearAllMarks();
                        }
                      }}
                      title={t('timeline.actions.clearAllMarks')}
                      style={{ fontSize: '12px', padding: '2px 8px' }}
                    >
                      🔄 {t('timeline.actions.resetMarks')}
                    </button>
                  )}
                  {/* 重置排序按钮(在启用排序时显示) */}
                  {sortingEnabled && sortActions && (
                    <button 
                      className="btn-secondary small"
                      onClick={() => {
                        if (window.confirm(t('timeline.actions.confirmResetSort'))) {
                          sortActions.resetSort();
                          setSortingEnabled(false);
                        }
                      }}
                      title={t('timeline.actions.restoreOriginalOrder')}
                      style={{ fontSize: '12px', padding: '2px 8px' }}
                    >
                      🔄 {t('timeline.actions.resetSort')}
                    </button>
                  )}
                </span>
              </h2>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">{t('timeline.info.modelPlatform')}</span>
                  <span className="info-value">{conversationInfo.model}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">{t('timeline.info.created')}</span>
                  <span className="info-value">{conversationInfo.created_at}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">{t('timeline.info.displayedMessages')}</span>
                  <span className="info-value">{conversationInfo.messageCount}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">{t('timeline.info.lastUpdated')}</span>
                  <span className="info-value">{conversationInfo.updated_at}</span>
                </div>
              </div>
              
              {/* 分支和排序控制 */}
              <div className="timeline-control-panel" style={{ marginTop: '12px' }}>
                {/* 分支控制 - 改进版:排序按钮在同一行 */}
                {branchAnalysis.branchPoints.size > 0 && (
                  <div className="branch-control" style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span>🔀 {t('timeline.branch.detected')} {branchAnalysis.branchPoints.size} {t('timeline.branch.branchPoints')}</span>
                      <button 
                        className="btn-secondary small"
                        onClick={handleShowAllBranches}
                        title={showAllBranches ? t('timeline.branch.showSelectedOnly') : t('timeline.branch.showAllBranches')}
                      >
                        {showAllBranches ? `🔍 ${t('timeline.branch.filterBranches')}` : `📋 ${t('timeline.branch.showAll')}`}
                      </button>
                      {/* 排序按钮移到这里 */}
                      {showAllBranches && sortActions && (
                        <button 
                          className="btn-secondary small"
                          onClick={handleToggleSort}
                          disabled={searchQuery !== ''}
                          title={sortingEnabled ? t('timeline.actions.disableSort') : (searchQuery !== '' ? t('timeline.actions.cannotSortWhileSearching') : t('timeline.actions.enableMessageSorting'))}
                        >
                          {sortingEnabled ? `❌ ${t('timeline.actions.disableSort')}` : `📊 ${t('timeline.actions.enableSort')}`}
                        </button>
                      )}
                    </span>
                    {/* 搜索提示 */}
                    {showAllBranches && searchQuery && (
                      <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                        ({t('timeline.actions.sortingDisabledDuringSearch')})
                      </span>
                    )}
                  </div>
                )}
                
                {/* 无分支时的排序控制 */}
                {branchAnalysis.branchPoints.size === 0 && sortActions && (
                  <div className="sort-control" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '8px 0'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span>🔀 {t('timeline.branch.noBranches')}</span>
                      <button 
                        className="btn-secondary small"
                        onClick={handleToggleSort}
                        disabled={searchQuery !== ''}
                        title={sortingEnabled ? t('timeline.actions.disableSort') : (searchQuery !== '' ? t('timeline.actions.cannotSortWhileSearching') : t('timeline.actions.enableMessageSorting'))}
                      >
                        {sortingEnabled ? `❌ ${t('timeline.actions.disableSort')}` : `📊 ${t('timeline.actions.enableSort')}`}
                      </button>
                      {searchQuery && (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                          ({t('timeline.actions.sortingDisabledDuringSearch')})
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 时间线 */}
          <div className="timeline">
            <div className="timeline-line"></div>
            
            {displayMessages.map((msg, index) => {
              const branchData = branchAnalysis.branchPoints.get(msg.uuid);
              const shouldShowBranchSwitcher = branchData && 
                branchData.branches.length > 1 && 
                !showAllBranches;
              
              return (
                <React.Fragment key={msg.uuid || index}>
                  {/* 消息项 */}
                  <div className="timeline-message">
                    <div className={`timeline-dot ${msg.sender === 'human' ? 'human' : 'assistant'}`}></div>
                    
                    <div 
                      className={`timeline-content ${selectedMessageIndex === msg.index ? 'selected' : ''}`}
                      onClick={() => handleMessageSelect(msg.index)}
                    >
                      <div className="timeline-header">
                        <div className="timeline-sender">
                          <div className={`timeline-avatar ${getPlatformAvatarClass(msg.sender, conversationInfo?.platform)}`}>
                            {msg.sender === 'human' ? '👤' : (
                              <PlatformIcon 
                                platform={conversationInfo?.platform?.toLowerCase() || 'claude'} 
                                format={PlatformUtils.getFormatFromPlatform(conversationInfo?.platform)} 
                                size={20} 
                                style={{ backgroundColor: 'transparent' }}
                              />
                            )}
                          </div>
                          <div className="sender-info">
                            <div className="sender-name">
                              {msg.sender_label}
                              {hasCustomSort && showAllBranches && (
                                <span className="sort-position"> (#{index + 1})</span>
                              )}
                            </div>
                            <div className="sender-time">
                              {DateTimeUtils.formatTime(msg.timestamp)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="timeline-actions">
                          {sortingEnabled && sortActions && 
                           (branchAnalysis.branchPoints.size === 0 || showAllBranches) && (
                            <div className="sort-controls">
                              <button 
                                className="sort-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  sortActions.moveMessage(index, 'up');
                                }}
                                disabled={index === 0}
                                title={t('timeline.actions.moveUp')}
                              >
                                ↑
                              </button>
                              <button 
                                className="sort-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  sortActions.moveMessage(index, 'down');
                                }}
                                disabled={index === displayMessages.length - 1}
                                title={t('timeline.actions.moveDown')}
                              >
                                ↓
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="timeline-body">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => <span>{children}</span>,
                            h1: ({ children }) => <strong>{children}</strong>,
                            h2: ({ children }) => <strong>{children}</strong>,
                            h3: ({ children }) => <strong>{children}</strong>,
                            h4: ({ children }) => <strong>{children}</strong>,
                            h5: ({ children }) => <strong>{children}</strong>,
                            h6: ({ children }) => <strong>{children}</strong>,
                            strong: ({ children }) => <strong>{children}</strong>,
                            em: ({ children }) => <em>{children}</em>,
                            code: ({ inline, children }) => inline ? 
                              <code className="inline-code">{children}</code> : 
                              <code>{children}</code>,
                            pre: ({ children }) => <span>{children}</span>,
                            blockquote: ({ children }) => <span>" {children} "</span>,
                            a: ({ children }) => <span>{children}</span>,
                            ul: ({ children }) => <span>{children}</span>,
                            ol: ({ children }) => <span>{children}</span>,
                            li: ({ children }) => <span>• {children}</span>
                          }}
                        >
                          {TextUtils.getPreview(msg.display_text)}
                        </ReactMarkdown>
                      </div>
                      
                      {/* 消息标签和标记 */}
                      <div className="timeline-footer">
                        {/* 思考过程 - 仅助手消息显示 */}
                        {msg.sender !== 'human' && msg.thinking && (
                          <div className="timeline-tag">
                            <span>💭</span>
                            <span>{t('timeline.tags.hasThinking')}</span>
                          </div>
                        )}
                        {/* 图片 */}
                        {msg.images && msg.images.length > 0 && (
                          <div className="timeline-tag">
                            <span>🖼️</span>
                            <span>{msg.images.length}{t('timeline.tags.images')}</span>
                          </div>
                        )}
                        {/* 附件 - 主要用于人类消息 */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="timeline-tag">
                            <span>📎</span>
                            <span>{msg.attachments.length}{t('timeline.tags.attachments')}</span>
                          </div>
                        )}
                        {/* Artifacts - 仅助手消息显示 */}
                        {msg.sender !== 'human' && msg.artifacts && msg.artifacts.length > 0 && (
                          <div className="timeline-tag">
                            <span>🔧</span>
                            <span>{msg.artifacts.length}{t('timeline.tags.artifacts')}</span>
                          </div>
                        )}
                        {/* 工具使用 - 通常只有助手消息有 */}
                        {msg.tools && msg.tools.length > 0 && (
                          <div className="timeline-tag">
                            <span>🔍</span>
                            <span>{t('timeline.tags.usedTools')}</span>
                          </div>
                        )}
                        {msg.citations && msg.citations.length > 0 && (
                          <div className="timeline-tag">
                            <span>🔗</span>
                            <span>{msg.citations.length}{t('timeline.tags.citations')}</span>
                          </div>
                        )}
                        
                        {/* 标记状态 */}
                        {isMarked(msg.index, 'completed') && (
                          <div className="timeline-tag completed">
                            <span>✓</span>
                            <span>{t('timeline.tags.completed')}</span>
                          </div>
                        )}
                        {isMarked(msg.index, 'important') && (
                          <div className="timeline-tag important">
                            <span>⭐</span>
                            <span>{t('timeline.tags.important')}</span>
                          </div>
                        )}
                        {isMarked(msg.index, 'deleted') && (
                          <div className="timeline-tag deleted">
                            <span>🗑️</span>
                            <span>{t('timeline.tags.deleted')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* 分支切换器 */}
                  {shouldShowBranchSwitcher && (
                    <BranchSwitcher
                      key={`branch-${msg.uuid}`}
                      branchPoint={msg}
                      availableBranches={branchData.branches}
                      currentBranchIndex={branchFilters.get(msg.uuid) ?? branchData.currentBranchIndex}
                      onBranchChange={(newIndex) => handleBranchSwitch(msg.uuid, newIndex)}
                      onShowAllBranches={handleShowAllBranches}
                      showAllMode={false}
                      className="timeline-branch-switcher"
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          
          {/* 文件切换预览 - 底部 */}
          {nextFilePreview && isDesktop && (
            <div 
              className="file-preview file-preview-bottom"
              onClick={() => onFileSwitch && onFileSwitch(nextFilePreview.index)}
            >
              <div className="file-preview-inner">
                <span className="file-preview-arrow">↓</span>
                <span className="file-preview-name">{nextFilePreview.file.name}</span>
                <span className="file-preview-hint">{t('timeline.file.clickToNext')}</span>
              </div>
            </div>
          )}
        </div>
        
        {/* 右侧消息详情 - 仅PC端 */}
        {isDesktop && (
          <div className="timeline-right-panel">
            <div className="message-detail-container">
              <MessageDetailPanel
                data={data}
                selectedMessageIndex={selectedMessageIndex}
                activeTab={activeTab}
                searchQuery={searchQuery}
                format={format}
                onTabChange={setActiveTab}
                markActions={markActions}
                displayMessages={displayMessages}
                copiedMessageIndex={copiedMessageIndex}
                onCopyMessage={handleCopyMessage}
                t={t}
              />
            </div>
          </div>
        )}
      </div>

      {/* 移动端消息详情 Modal */}
      {!isDesktop && showMobileDetail && selectedMessageIndex !== null && (() => {
        // 获取当前消息在列表中的索引
        const currentMessageIndex = displayMessages.findIndex(m => m.index === selectedMessageIndex);
        const isFirstMessage = currentMessageIndex === 0;
        const isLastMessage = currentMessageIndex === displayMessages.length - 1;
        
        // 获取当前消息,检查是否有特殊标签页
        const currentMessage = displayMessages.find(m => m.index === selectedMessageIndex);
        const availableTabs = [{ id: 'content', label: t('messageDetail.tabs.content') }];
        
        if (currentMessage) {
          // 人类消息的处理
          if (currentMessage.sender === 'human') {
            if (currentMessage.attachments && currentMessage.attachments.length > 0) {
              availableTabs.push({ id: 'attachments', label: t('messageDetail.tabs.attachments') });
            }
          } else {
            // 助手消息的处理(仅Claude格式显示思考过程和Artifacts)
            if (format === 'claude' || format === 'claude_full_export' || !format) {
              if (currentMessage.thinking) {
                availableTabs.push({ id: 'thinking', label: t('messageDetail.tabs.thinking') });
              }
              if (currentMessage.artifacts && currentMessage.artifacts.length > 0) {
                availableTabs.push({ id: 'artifacts', label: 'Artifacts' });
              }
            }
          }
        }
        
        return (
          <div className="mobile-message-detail-modal" onClick={handleCloseMobileDetail}>
            <div className="mobile-detail-content" onClick={(e) => e.stopPropagation()}>
              <div className="mobile-detail-header">
                {/* 左侧:消息序号和导航按钮 */}
                <div className="mobile-header-left">
                  {/* 新增:消息序号显示 */}
                  <span className="message-number">
                    #{currentMessageIndex + 1}
                  </span>
                  <button 
                    className="nav-btn"
                    onClick={() => handleNavigateMessage('prev')}
                    disabled={isFirstMessage}
                    title={t('timeline.actions.previousMessage')}
                  >
                    ←
                  </button>
                  <button 
                    className="nav-btn"
                    onClick={() => handleNavigateMessage('next')}
                    disabled={isLastMessage}
                    title={t('timeline.actions.nextMessage')}
                  >
                    →
                  </button>
                </div>
                
                {/* 中间:标签页 */}
                <div className="mobile-header-tabs">
                  {availableTabs.map(tab => (
                    <button
                      key={tab.id}
                      className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                
                {/* 右侧:设置和关闭按钮 */}
                <div className="mobile-header-right">
                  {onShowSettings && (
                    <button 
                      className="action-btn"
                      onClick={onShowSettings}
                      title={t('app.navbar.settings')}
                    >
                      ⚙️
                    </button>
                  )}
                  <button 
                    className="close-btn" 
                    onClick={handleCloseMobileDetail}
                  >
                    ×
                  </button>
                </div>
              </div>
              
              <div className="mobile-detail-body">
                <MessageDetailPanel
                  data={data}
                  selectedMessageIndex={selectedMessageIndex}
                  activeTab={activeTab}
                  searchQuery={searchQuery}
                  format={format}
                  onTabChange={setActiveTab}
                  markActions={markActions}
                  displayMessages={displayMessages}
                  copiedMessageIndex={copiedMessageIndex}
                  onCopyMessage={handleCopyMessage}
                  t={t}
                  showTabs={false}
                />
              </div>
            </div>
          </div>
        );
      })()}
      
      {/* 重命名对话框 */}
      <RenameDialog
        isOpen={showRenameDialog}
        currentName={conversationInfo?.originalName || conversationInfo?.name || ''}
        onSave={handleSaveRename}
        onCancel={handleCancelRename}
        t={t}
      />
    </div>
  );
};

export default ConversationTimeline;