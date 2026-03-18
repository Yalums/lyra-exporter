// components/ConversationTimeline.js
// 增强版时间线组件,整合了分支切换功能、复制功能和重命名功能
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MessageDetail from './MessageDetail';
import PlatformIcon, { inferJsonlModelKey } from './PlatformIcon';
import { PlatformUtils, DateTimeUtils, TextUtils } from '../utils/fileParser';
import { useI18n } from '../index.js';
import { getRenameManager } from '../utils/data/renameManager.js';
import BranchSwitcher from './BranchSwitcher';
import SystemContextCard from './SystemContextCard';
import { analyzeBranches, filterDisplayMessages, ROOT_UUID, findMessageByLocator, computeBranchFiltersForMessage } from '../utils/branchAnalysis';
import { Copy, ClipboardCheck, Star, Trash2, Pencil, ChevronsDown, RotateCcw, ChevronUp, ChevronDown, GitBranch, Filter, Image, Check, Search } from 'lucide-react';

// 时间线预览卡片的 Markdown 渲染配置（模块级常量，避免每次渲染重新创建）
const TIMELINE_MD_COMPONENTS = {
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
};

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
  const overlayRef = useRef(null);
  const mouseDownTargetRef = useRef(null);

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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleOverlayMouseDown = (e) => {
    mouseDownTargetRef.current = e.target;
  };

  const handleOverlayClick = (e) => {
    // 只在 mousedown 和 click 都发生在遮罩本身时才关闭（排除从内容区拖出的情况）
    if (mouseDownTargetRef.current === overlayRef.current && e.target === overlayRef.current) {
      onCancel();
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="modal-overlay" ref={overlayRef} onMouseDown={handleOverlayMouseDown} onClick={handleOverlayClick}>
      <div className="modal-content rename-dialog">
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
              onKeyDown={handleKeyDown}
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
    </div>,
    document.body
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
  showTabs = true, // 新增:控制是否显示标签页
  systemContext = null // 新增:system context 模式
}) => {
  // system context 模式：渲染专属面板
  if (systemContext) {
    return (
      <div className="detail-content">
        <MessageDetail
          processedData={data}
          selectedMessageIndex={null}
          activeTab={activeTab}
          searchQuery={searchQuery}
          format={format}
          onTabChange={onTabChange}
          showTabs={showTabs}
          systemContext={systemContext}
        />
      </div>
    );
  }

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
            {copiedMessageIndex === selectedMessageIndex ? <><ClipboardCheck size={14} /> {t('timeline.actions.copied')}</> : <><Copy size={14} /> {t('timeline.actions.copyMessage')}</>}
          </button>

          <button
            className={`btn-secondary${markActions.isMarked(selectedMessageIndex, 'completed') ? ' active' : ''}`}
            onClick={() => markActions.toggleMark(selectedMessageIndex, 'completed')}
          >
            <Check size={14} /> {markActions.isMarked(selectedMessageIndex, 'completed') ? t('timeline.actions.unmarkCompleted') : t('timeline.actions.markCompleted')}
          </button>
          <button
            className={`btn-secondary${markActions.isMarked(selectedMessageIndex, 'important') ? ' active' : ''}`}
            onClick={() => markActions.toggleMark(selectedMessageIndex, 'important')}
          >
            <Star size={14} /> {markActions.isMarked(selectedMessageIndex, 'important') ? t('timeline.actions.unmarkImportant') : t('timeline.actions.markImportant')}
          </button>
          <button
            className={`btn-secondary${markActions.isMarked(selectedMessageIndex, 'deleted') ? ' active' : ''}`}
            onClick={() => markActions.toggleMark(selectedMessageIndex, 'deleted')}
          >
            <Trash2 size={14} /> {markActions.isMarked(selectedMessageIndex, 'deleted') ? t('timeline.actions.unmarkDeleted') : t('timeline.actions.markDeleted')}
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
  files = [],
  currentFileIndex = null,
  onFileSwitch = null,
  searchQuery = '',
  branchState = null,
  onBranchStateChange = null,
  onDisplayMessagesChange = null, // 新增：当显示消息更改时通知父组件
  onRename = null, // 新增:重命名回调
  exportContext = null // 新增:系统上下文（project信息/用户记忆）
}) => {
  const { t } = useI18n();

  const [selectedMessageIndex, setSelectedMessageIndex] = useState(null);
  const [isSystemContextSelected, setIsSystemContextSelected] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [activeTab, setActiveTab] = useState('content');
  const [branchFilters, setBranchFilters] = useState(new Map());
  const [showAllBranches, setShowAllBranches] = useState(branchState?.showAllBranches || false);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState(null);

  // 重命名相关状态
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameManager] = useState(() => getRenameManager());
  const [customName, setCustomName] = useState('');

  // 滚动相关状态
  const leftPanelRef = React.useRef(null);
  const lastScrollTopRef = useRef(0);

  // 消息定位相关
  const messageRefs = useRef({});
  const copiedTimeoutRef = useRef(null); // 用于清理复制提示的 setTimeout

  // 在左面板内滚动到指定消息元素（避免 scrollIntoView 冒泡到父级导致页面跳动）
  const scrollToMessageInPanel = useCallback((messageEl, behavior = 'smooth') => {
    const panel = leftPanelRef.current;
    if (!panel || !messageEl) return;
    const panelRect = panel.getBoundingClientRect();
    const elRect = messageEl.getBoundingClientRect();
    // 计算目标元素相对于面板滚动区域的偏移，使其居中显示
    const offsetInPanel = elRect.top - panelRect.top + panel.scrollTop;
    const targetScrollTop = offsetInPanel - panelRect.height / 2 + elRect.height / 2;
    panel.scrollTo({ top: Math.max(0, targetScrollTop), behavior });
  }, []);

  // 清理复制提示的 setTimeout
  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  // ==================== 分支分析 ====================

  const branchAnalysis = useMemo(() => analyzeBranches(messages), [messages, format, conversation]);

  // ==================== 消息过滤和显示 ====================

  const displayMessages = useMemo(() => {
    return filterDisplayMessages(messages, branchFilters, branchAnalysis, showAllBranches);
  }, [messages, branchFilters, branchAnalysis, showAllBranches]);

  // ==================== 事件处理函数 ====================

  const handleBranchSwitch = useCallback((branchPointUuid, newBranchIndex) => {
    console.log(`[分支切换] 切换分支点 ${branchPointUuid} 到分支 ${newBranchIndex}`);

    // 总是设置为false,确保不是"显示所有分支"模式
    setShowAllBranches(false);

    setBranchFilters(prev => {
      const newFilters = new Map(prev);

      // 即使是相同的分支索引,也要重新设置以触发更新
      newFilters.set(branchPointUuid, newBranchIndex);

      console.log(`[分支切换] 更新分支过滤器:`, Array.from(newFilters.entries()));

      // 通知父组件分支状态变化
      if (onBranchStateChange) {
        onBranchStateChange({
          showAllBranches: false,
          currentBranchIndexes: newFilters
        });
      }

      return newFilters;
    });

  }, [onBranchStateChange]);

  const handleShowAllBranches = useCallback(() => {
    const newShowAllBranches = !showAllBranches;
    setShowAllBranches(newShowAllBranches);

    console.log(`[分支切换] ${newShowAllBranches ? '显示所有分支' : '隐藏分支'}`);

    // 通知父组件分支状态变化
    if (onBranchStateChange) {
      onBranchStateChange({
        showAllBranches: newShowAllBranches,
        currentBranchIndexes: newShowAllBranches ? new Map() : branchFilters
      });
    }

    if (newShowAllBranches) {
      setBranchFilters(new Map());
    }

  }, [showAllBranches, branchFilters, onBranchStateChange]);

  // ==================== 状态和副作用 ====================

  // 重置分支状态 - 当对话切换时，立即隐藏
  useEffect(() => {
    setIsTransitioning(true);
    setBranchFilters(new Map());
    setShowAllBranches(false);
    setSelectedMessageIndex(null);
  }, [conversation?.uuid]);

  // 新消息到来后 fade-in
  useEffect(() => {
    if (isTransitioning) {
      if (messages && messages.length > 0) {
        const t = setTimeout(() => setIsTransitioning(false), 30);
        return () => clearTimeout(t);
      } else {
        // 安全兜底：即使 messages 暂时为空也不能永远卡在 transitioning
        const fallback = setTimeout(() => setIsTransitioning(false), 500);
        return () => clearTimeout(fallback);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, isTransitioning]);

  // 消息定位 - 监听 scrollToMessage 事件
  useEffect(() => {
    const handleScrollToMessage = (event) => {
      const { messageIndex, messageId, messageUuid, highlight, fileIndex, conversationUuid } = event.detail;

      console.log(`[消息定位] 开始定位 - fileIndex: ${fileIndex}, messageUuid: ${messageUuid}, messageIndex: ${messageIndex}`);
      console.log(`[消息定位] 当前消息总数: ${messages.length}, 显示消息数: ${displayMessages.length}`);

      // 如果消息列表为空，等待并重试
      if (messages.length === 0) {
        console.log(`[消息定位] 消息列表为空，等待加载后重试...`);
        let retryCount = 0;
        const maxRetries = 10;
        const retryInterval = setInterval(() => {
          retryCount++;
          if (messages.length > 0 || retryCount >= maxRetries) {
            clearInterval(retryInterval);
            if (messages.length > 0) {
              console.log(`[消息定位] 消息已加载，重试定位 (第${retryCount}次)`);
              window.dispatchEvent(new CustomEvent('scrollToMessage', { detail: event.detail }));
            } else {
              console.error(`[消息定位] 超过最大重试次数，消息列表仍为空`);
            }
          }
        }, 200);
        return;
      }

      const targetMessage = findMessageByLocator(messages, { messageUuid, messageId, messageIndex, fileIndex, conversationUuid });

      if (!targetMessage) {
        console.warn(`[消息定位] 未找到目标消息`);
        console.warn(`  - messageUuid: ${messageUuid}`);
        console.warn(`  - messageId: ${messageId}`);
        console.warn(`  - messageIndex: ${messageIndex}`);
        console.warn(`  - 第一条消息UUID: ${messages[0]?.uuid}`);
        console.warn(`  - 最后一条消息UUID: ${messages[messages.length - 1]?.uuid}`);

        // 尝试显示所有分支后再次定位
        if (branchAnalysis.branchPoints.size > 0 && !showAllBranches) {
          console.log(`[消息定位] 尝试显示所有分支后定位...`);
          handleShowAllBranches();

          // 延迟后重试
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('scrollToMessage', { detail: event.detail }));
          }, 800);
        }
        return;
      }

      const targetMessageIndex = targetMessage.index;
      console.log(`[消息定位] 找到目标消息 - index: ${targetMessageIndex}, uuid: ${targetMessage.uuid}`);

      // 检查消息是否在当前显示的消息中
      const isMessageVisible = displayMessages.some(msg => msg.uuid === targetMessage.uuid);

      if (!isMessageVisible && branchAnalysis.branchPoints.size > 0 && !showAllBranches) {
        // 消息不在当前分支,需要切换分支
        console.log(`[消息定位] 消息不在当前分支,尝试切换分支...`);

        // 查找是否有分支包含该消息
        const foundBranch = Array.from(branchAnalysis.branchPoints.values()).some(branchData =>
          branchData.branches.some(branch =>
            branch.messages.some(msg => msg.uuid === targetMessage.uuid)
          )
        );

        if (foundBranch) {
          const newBranchFilters = computeBranchFiltersForMessage(targetMessage, messages, branchAnalysis);
          console.log(`[消息定位] 批量更新分支过滤器:`, Array.from(newBranchFilters.entries()));

          // 批量更新所有分支过滤器
          setBranchFilters(newBranchFilters);
          setShowAllBranches(false);

          // 通知父组件
          if (onBranchStateChange) {
            onBranchStateChange({
              showAllBranches: false,
              currentBranchIndexes: newBranchFilters
            });
          }

          // 延迟执行定位,等待DOM更新
          setTimeout(() => {
            const messageEl = messageRefs.current[targetMessageIndex];
            if (messageEl) {
              scrollToMessageInPanel(messageEl);

              setSelectedMessageIndex(targetMessageIndex);

              if (highlight) {
                messageEl.classList.add('highlight-from-search');
                setTimeout(() => {
                  messageEl.classList.remove('highlight-from-search');
                }, 3000);
              }
            } else {
              console.warn(`[消息定位] 切换分支后仍未找到消息元素: ${targetMessageIndex}`);
              // 可能需要更多时间等待渲染
              setTimeout(() => {
                const el = messageRefs.current[targetMessageIndex];
                if (el) {
                  scrollToMessageInPanel(el);
                  setSelectedMessageIndex(targetMessageIndex);
                  if (highlight) {
                    el.classList.add('highlight-from-search');
                    setTimeout(() => el.classList.remove('highlight-from-search'), 3000);
                  }
                }
              }, 300);
            }
          }, 600);
        } else {
          console.warn(`[消息定位] 未找到包含该消息的分支,显示所有分支`);
          // 如果没找到分支,显示所有分支
          handleShowAllBranches();

          // 延迟执行定位
          setTimeout(() => {
            const messageEl = messageRefs.current[targetMessageIndex];
            if (messageEl) {
              scrollToMessageInPanel(messageEl);

              setSelectedMessageIndex(targetMessageIndex);

              if (highlight) {
                messageEl.classList.add('highlight-from-search');
                setTimeout(() => {
                  messageEl.classList.remove('highlight-from-search');
                }, 3000);
              }
            }
          }, 600);
        }
      } else {
        // 消息在当前分支中可见,直接定位
        console.log(`[消息定位] 消息在当前分支中,直接定位`);
        const messageEl = messageRefs.current[targetMessageIndex];
        if (!messageEl) {
          console.warn(`[消息定位] 未找到消息元素: ${targetMessageIndex}`);
          // 可能需要等待DOM渲染
          setTimeout(() => {
            const el = messageRefs.current[targetMessageIndex];
            if (el) {
              scrollToMessageInPanel(el);

              setSelectedMessageIndex(targetMessageIndex);

              if (highlight) {
                el.classList.add('highlight-from-search');
                setTimeout(() => {
                  el.classList.remove('highlight-from-search');
                }, 3000);
              }
            } else {
              console.warn(`[消息定位] 延迟后仍未找到元素`);
            }
          }, 200);
          return;
        }

        // 滚动到视图中心
        scrollToMessageInPanel(messageEl);

        // 设置选中状态
        setSelectedMessageIndex(targetMessageIndex);

        // 添加高亮效果
        if (highlight) {
          messageEl.classList.add('highlight-from-search');
          setTimeout(() => {
            messageEl.classList.remove('highlight-from-search');
          }, 3000);
        }
      }
    };

    window.addEventListener('scrollToMessage', handleScrollToMessage);
    return () => window.removeEventListener('scrollToMessage', handleScrollToMessage);
  }, [messages, displayMessages, branchAnalysis, handleShowAllBranches, showAllBranches]);

  // 同步外部分支状态
  useEffect(() => {
    if (branchState) {
      setShowAllBranches(branchState.showAllBranches);
      if (branchState.currentBranchIndexes) {
        setBranchFilters(branchState.currentBranchIndexes);
      }
    }
  }, [branchState]);

  // 新增：当 displayMessages 更改时通知父组件
  useEffect(() => {
    if (onDisplayMessagesChange) {
      onDisplayMessagesChange(displayMessages);
    }
  }, [displayMessages, onDisplayMessagesChange]);

  // 初始化自定义名称
  useEffect(() => {
    if (conversation?.uuid) {
      const savedName = renameManager.getRename(conversation.uuid, conversation.name);
      setCustomName(savedName);
    }
  }, [conversation, renameManager]);

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
    if (messages.length > 0 && !selectedMessageIndex) {
      setSelectedMessageIndex(messages[0].index);
    }
  }, [messages, selectedMessageIndex]);



  // 重置滚动状态 - 当对话切换时
  useEffect(() => {
    if (leftPanelRef.current) {
      leftPanelRef.current.scrollTop = 0;
    }
    lastScrollTopRef.current = 0;
  }, [conversation?.uuid]);

  // 自动隐藏顶栏：检测左面板滚动方向
  useEffect(() => {
    const panel = leftPanelRef.current;
    if (!panel) return;

    const handleNavbarScroll = () => {
      const currentScrollTop = panel.scrollTop;
      const delta = currentScrollTop - lastScrollTopRef.current;
      // 忽略微小抖动和初始重置后的第一帧
      if (Math.abs(delta) > 2) {
        if (delta > 0 && currentScrollTop > 80) {
          document.documentElement.classList.add('navbar-hidden');
        } else if (delta < 0) {
          document.documentElement.classList.remove('navbar-hidden');
        }
      }
      lastScrollTopRef.current = currentScrollTop;
    };

    panel.addEventListener('scroll', handleNavbarScroll, { passive: true });
    return () => {
      panel.removeEventListener('scroll', handleNavbarScroll);
      document.documentElement.classList.remove('navbar-hidden');
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMessageSelect = (messageIndex) => {
    setSelectedMessageIndex(messageIndex);
    setIsSystemContextSelected(false);
    setActiveTab('content');
  };

  const handleSystemContextSelect = () => {
    setIsSystemContextSelected(true);
    setSelectedMessageIndex(null);
    setActiveTab('instructions');
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
    try {
      await navigator.clipboard.writeText(message.display_text || '');
      setCopiedMessageIndex(messageIndex);
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = setTimeout(() => setCopiedMessageIndex(null), 2000);
    } catch {}
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

  // 跳转到最新对话分支
  const handleJumpToLatest = useCallback(() => {
    if (!messages || messages.length === 0) {
      console.warn('[跳转到最新] 没有可用的消息');
      return;
    }

    // 找到时间戳最新的消息（按时间排序，取最后一个）
    const sortedMessages = [...messages].sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeA - timeB;
    });

    const latestMessage = sortedMessages[sortedMessages.length - 1];
    console.log(`[跳转到最新] 找到最新消息 - index: ${latestMessage.index}, uuid: ${latestMessage.uuid}, timestamp: ${latestMessage.timestamp}`);

    // 检查消息是否在当前显示的消息中
    const isMessageVisible = displayMessages.some(msg => msg.uuid === latestMessage.uuid);

    if (!isMessageVisible && branchAnalysis.branchPoints.size > 0 && !showAllBranches) {
      // 消息不在当前分支，需要切换分支
      console.log(`[跳转到最新] 消息不在当前分支，尝试切换分支...`);

      const newBranchFilters = computeBranchFiltersForMessage(latestMessage, messages, branchAnalysis);
      console.log(`[跳转到最新] 批量更新分支过滤器:`, Array.from(newBranchFilters.entries()));

      // 批量更新所有分支过滤器
      setBranchFilters(newBranchFilters);
      setShowAllBranches(false);

      // 通知父组件
      if (onBranchStateChange) {
        onBranchStateChange({
          showAllBranches: false,
          currentBranchIndexes: newBranchFilters
        });
      }

      // 延迟执行定位，等待DOM更新
      setTimeout(() => {
        const messageEl = messageRefs.current[latestMessage.index];
        if (messageEl) {
          scrollToMessageInPanel(messageEl);

          setSelectedMessageIndex(latestMessage.index);

          // 添加高亮效果
          messageEl.classList.add('highlight-from-search');
          setTimeout(() => {
            messageEl.classList.remove('highlight-from-search');
          }, 3000);
        } else {
          console.warn(`[跳转到最新] 切换分支后仍未找到消息元素: ${latestMessage.index}`);
          // 可能需要更多时间等待渲染
          setTimeout(() => {
            const el = messageRefs.current[latestMessage.index];
            if (el) {
              scrollToMessageInPanel(el);
              setSelectedMessageIndex(latestMessage.index);
              el.classList.add('highlight-from-search');
              setTimeout(() => el.classList.remove('highlight-from-search'), 3000);
            }
          }, 300);
        }
      }, 600);
    } else {
      // 消息在当前分支中可见，直接定位
      console.log(`[跳转到最新] 消息在当前分支中，直接定位`);
      const messageEl = messageRefs.current[latestMessage.index];
      if (!messageEl) {
        console.warn(`[跳转到最新] 未找到消息元素: ${latestMessage.index}`);
        // 可能需要等待DOM渲染
        setTimeout(() => {
          const el = messageRefs.current[latestMessage.index];
          if (el) {
            scrollToMessageInPanel(el);

            setSelectedMessageIndex(latestMessage.index);

            el.classList.add('highlight-from-search');
            setTimeout(() => {
              el.classList.remove('highlight-from-search');
            }, 3000);
          } else {
            console.warn(`[跳转到最新] 延迟后仍未找到元素`);
          }
        }, 200);
        return;
      }

      // 滚动到视图中心
      scrollToMessageInPanel(messageEl);

      // 设置选中状态
      setSelectedMessageIndex(latestMessage.index);

      // 添加高亮效果
      messageEl.classList.add('highlight-from-search');
      setTimeout(() => {
        messageEl.classList.remove('highlight-from-search');
      }, 3000);
    }
  }, [messages, displayMessages, branchAnalysis, showAllBranches, onBranchStateChange]);

  // ==================== 工具函数 ====================

  const conversationInfo = useMemo(() => {
    const lastMsg = displayMessages[displayMessages.length - 1];
    const lastUpdated = lastMsg?.timestamp
      ? DateTimeUtils.formatDateTime(lastMsg.timestamp)
      : t('timeline.conversation.unknownTime');

    if (conversation) {
      const platformName = PlatformUtils.getPlatformName(data?.meta_info?.platform);
      const displayName = customName || conversation.name || t('timeline.conversation.unnamedConversation');

      return {
        name: displayName,
        originalName: conversation.name,
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
  }, [conversation, data, displayMessages, customName, format, t]);

  const isMarked = (messageIndex, markType) => {
    return marks[markType]?.has(messageIndex) || false;
  };

  const getPlatformAvatarClass = (sender, platform) => {
    if (sender === 'human') return 'human';

    if (format === 'jsonl_chat') return 'assistant platform-jsonl_chat';
    if (format === 'chatgpt') return 'assistant platform-chatgpt';
    if (format === 'grok') return 'assistant platform-grok';
    if (format === 'copilot') return 'assistant platform-copilot';
    if (format === 'gemini_notebooklm') {
      const platformLower = platform?.toLowerCase() || '';
      return platformLower.includes('notebooklm') ? 'assistant platform-notebooklm' : 'assistant platform-gemini';
    }
    return 'assistant platform-claude';
  };

  const getFilePreview = (direction) => {
    if (!files || files.length <= 1 || currentFileIndex === null) {
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

  const platformClass = PlatformUtils.getPlatformClass(conversationInfo?.platform);
  const prevFilePreview = getFilePreview('prev');
  const nextFilePreview = getFilePreview('next');
  const rootBranchData = branchAnalysis.branchPoints.get(ROOT_UUID);

  return (
    <div className={`enhanced-timeline-container ${platformClass} desktop-layout`}>
      <div className="timeline-main-content">
        {/* 左侧时间线面板 */}
        <div className="timeline-left-panel" ref={leftPanelRef} style={{ opacity: isTransitioning ? 0 : 1, transition: 'opacity 0.2s ease' }}>
          {/* 文件切换预览 - 顶部 */}
          {prevFilePreview && (
            <div
              className="file-preview file-preview-top"
              onClick={() => onFileSwitch && onFileSwitch(prevFilePreview.index)}
            >
              <div className="file-preview-inner">
                <ChevronUp size={24} className="file-preview-arrow" />
                <span className="file-preview-name">{prevFilePreview.file.name}</span>
                <span className="file-preview-hint">{t('timeline.file.clickToPrevious')}</span>
              </div>
            </div>
          )}

          {/* 对话信息卡片 */}
          {conversationInfo && (
            <div className={"conversation-info-card"}>
              <h2>
                {conversationInfo.name}
                {conversationInfo.is_starred && <Star size={16} style={{ marginLeft: '6px', verticalAlign: 'middle', color: 'var(--accent-primary)' }} />}
                <button
                  className="btn-secondary small"
                  onClick={handleOpenRename}
                  title={t('rename.action')}
                  style={{ marginLeft: '4px' }}
                >
                  <Pencil size={13} />
                </button>
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
              {/* 系统上下文卡片（从时间线移至此处） */}
              <SystemContextCard
                exportContext={exportContext}
                isSelected={isSystemContextSelected}
                onSelect={handleSystemContextSelect}
              />
              {/* 操作按钮行：跳转最新 + 重置标记 + 显示全部分支 */}
              <div className="conversation-action-row">
                {messages && messages.length > 0 && (
                  <button
                    className="btn-secondary small"
                    onClick={handleJumpToLatest}
                    title={t('timeline.actions.jumpToLatest')}
                  >
                    <ChevronsDown size={13} /> {t('timeline.actions.jumpToLatest')}
                  </button>
                )}
                {markActions && (
                  <button
                    className="btn-secondary small"
                    onClick={() => {
                      if (window.confirm(t('timeline.actions.confirmClearMarks'))) {
                        markActions.clearAllMarks();
                      }
                    }}
                    title={t('timeline.actions.clearAllMarks')}
                  >
                    <RotateCcw size={13} /> {t('timeline.actions.resetMarks')}
                  </button>
                )}
                {branchAnalysis.branchPoints.size > 0 && (
                  <button
                    className="btn-secondary small"
                    onClick={handleShowAllBranches}
                    title={showAllBranches ? t('timeline.branch.showSelectedOnly') : t('timeline.branch.showAllBranches')}
                  >
                    {showAllBranches ? <><Filter size={13} /> {t('timeline.branch.filterBranches')}</> : <><GitBranch size={13} /> {t('timeline.branch.showAll')}</>}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 时间线 */}
          <div className="timeline">
            <div className="timeline-line"></div>


            {/* 根分支切换器（第一条消息就有分支的情况） */}
            {rootBranchData && rootBranchData.branches.length > 1 && !showAllBranches && (
              <div className="root-branch-container">
                <div className="root-branch-label">
                  <span className="label-text">{t('timeline.branch.detected')} {branchAnalysis.branchPoints.size} {t('timeline.branch.branchPoints')}</span>
                </div>
                <BranchSwitcher
                  key={`branch-${ROOT_UUID}`}
                  branchPoint={rootBranchData.branchPoint}
                  availableBranches={rootBranchData.branches}
                  currentBranchIndex={branchFilters.get(ROOT_UUID) ?? rootBranchData.currentBranchIndex}
                  onBranchChange={(newIndex) => handleBranchSwitch(ROOT_UUID, newIndex)}
                  onShowAllBranches={handleShowAllBranches}
                  showAllMode={false}
                  className="timeline-branch-switcher"
                />
              </div>
            )}

            {displayMessages.map((msg, index) => {
              const branchData = branchAnalysis.branchPoints.get(msg.uuid);
              // 图片：合并 images 数组与 attachments 中的嵌入图片（含 Grok 兼容）
              const embeddedImages = msg.attachments?.filter(att =>
                att.is_embedded_image || (format === 'grok' && att.file_type?.startsWith('image/'))
              ) || [];
              const totalImages = (msg.images?.length || 0) + embeddedImages.length;
              // 附件：排除嵌入图片，只保留真实附件（含 Grok 兼容）
              const regularAttachments = msg.attachments?.filter(att =>
                !att.is_embedded_image && !(format === 'grok' && att.file_type?.startsWith('image/'))
              ) || [];
              const shouldShowBranchSwitcher = branchData &&
                branchData.branches.length > 1 &&
                !showAllBranches;

              return (
                <React.Fragment key={msg.uuid || index}>
                  {/* 消息项 */}
                  <div
                    className="timeline-message"
                    ref={(el) => { if (el) messageRefs.current[msg.index] = el; }}
                  >
                    <div className={`timeline-dot ${msg.sender === 'human' ? 'human' : 'assistant'}`}></div>

                    <div
                      className={`timeline-content ${!isSystemContextSelected && selectedMessageIndex !== null && selectedMessageIndex === msg.index ? 'selected' : ''} ${isMarked(msg.index, 'deleted') ? 'is-deleted' : ''}`}
                      onClick={() => handleMessageSelect(msg.index)}
                    >
                      <div className="timeline-header">
                        <div className="timeline-sender">
                          <div className={`timeline-avatar ${getPlatformAvatarClass(msg.sender, conversationInfo?.platform)}${format === 'jsonl_chat' && inferJsonlModelKey(msg.model_id) ? ' model-icon-white-bg' : ''}`}>
                            {msg.sender === 'human' ? '👤' : (
                              <PlatformIcon
                                platform={conversationInfo?.platform?.toLowerCase() || 'claude'}
                                format={format}
                                size={20}
                                modelId={format === 'jsonl_chat' ? msg.model_id : undefined}
                              />
                            )}
                          </div>
                          <div className="sender-info">
                            <div className="sender-name">
                              {msg.sender_label}
                              {(showAllBranches || branchAnalysis.branchPoints.size === 0) && (
                                <span className="sort-position"> (#{index + 1})</span>
                              )}
                            </div>
                            <div className="sender-time">
                              {DateTimeUtils.formatTime(msg.timestamp)}
                            </div>
                          </div>
                        </div>

                      </div>

                      <div className="timeline-body">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={TIMELINE_MD_COMPONENTS}
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
                        {/* 图片：images 数组 + attachments 中的嵌入图片 */}
                        {totalImages > 0 && (
                          <div className="timeline-tag">
                            <Image size={14} />
                            <span>{totalImages}{t('timeline.tags.images')}</span>
                          </div>
                        )}
                        {/* 附件：排除嵌入图片，只显示真实附件 */}
                        {regularAttachments.length > 0 && (
                          <div className="timeline-tag">
                            <span>📎</span>
                            <span>{regularAttachments.length}{t('timeline.tags.attachments')}</span>
                          </div>
                        )}
                        {/* Artifacts - 仅助手消息显示 */}
                        {msg.sender !== 'human' && msg.artifacts && msg.artifacts.length > 0 && (
                          <div className="timeline-tag">
                            <span>🔧</span>
                            <span>{msg.artifacts.length}{t('timeline.tags.artifacts')}</span>
                          </div>
                        )}
                        {/* Canvas - 仅助手消息显示（Gemini格式） */}
                        {msg.sender !== 'human' && msg.canvas && msg.canvas.length > 0 && (
                          <div className="timeline-tag">
                            <span>🔧</span>
                            <span>Canvas</span>
                          </div>
                        )}
                        {/* 工具使用 - 通常只有助手消息有 */}
                        {msg.tools && msg.tools.length > 0 && (
                          <div className="timeline-tag">
                            <Search size={14} />
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
                            <span>{t('timeline.tags.completed')}</span>
                          </div>
                        )}
                        {isMarked(msg.index, 'important') && (
                          <div className="timeline-tag important">
                            <span>{t('timeline.tags.important')}</span>
                          </div>
                        )}
                        {isMarked(msg.index, 'deleted') && (
                          <div className="timeline-tag deleted">
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
          {nextFilePreview && (
            <div
              className="file-preview file-preview-bottom"
              onClick={() => onFileSwitch && onFileSwitch(nextFilePreview.index)}
            >
              <div className="file-preview-inner">
                <ChevronDown size={24} className="file-preview-arrow" />
                <span className="file-preview-name">{nextFilePreview.file.name}</span>
                <span className="file-preview-hint">{t('timeline.file.clickToNext')}</span>
              </div>
            </div>
          )}
        </div>

        {/* 右侧消息详情 */}
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
                systemContext={isSystemContextSelected ? exportContext : null}
              />
            </div>
          </div>
      </div>

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