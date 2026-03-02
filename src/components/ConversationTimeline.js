// components/ConversationTimeline.js
// 增强版时间线组件,整合了分支切换功能、排序控制、复制功能和重命名功能
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MessageDetail from './MessageDetail';
import PlatformIcon from './PlatformIcon';
import { copyMessage } from '../utils/copyManager';
import { PlatformUtils, DateTimeUtils, TextUtils } from '../utils/fileParser';
import { useI18n } from '../index.js';
import { getRenameManager } from '../utils/renameManager';
import StorageManager from '../utils/storageManager';
// AI Chat 上下文桥接
import { useContextBridge } from '../ai-chat';
import BranchSwitcher from './shared/BranchSwitcher';
import { analyzeBranches, filterDisplayMessages, ROOT_UUID } from '../utils/branchAnalysis';

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
  onDisplayMessagesChange = null, // 新增：当显示消息更改时通知父组件
  onShowSettings = null, // 新增:打开设置面板
  onHideNavbar = null, // 新增:控制导航栏显示
  onRename = null, // 新增:重命名回调
  onMobileDetailChange = null // 新增:移动端详情显示状态变化回调
}) => {
  const { t } = useI18n();

  // AI Chat 上下文桥接
  const {
    initContext,
    addMessageToContext,
    addMessagesToContext,
    recordBranchSwitch: recordBranchSwitchToContext
  } = useContextBridge();

  const [selectedMessageIndex, setSelectedMessageIndex] = useState(null);
  const [activeTab, setActiveTab] = useState('content');
  const [deviceMode, setDeviceMode] = useState(() => {
    return StorageManager.get('device-mode', 'auto');
  });
  const [isDesktop, setIsDesktop] = useState(() => {
    const mode = StorageManager.get('device-mode', 'auto');
    if (mode === 'mobile') return false;
    if (mode === 'desktop') return true;
    return window.innerWidth >= 1024;
  });
  const [branchFilters, setBranchFilters] = useState(new Map());
  const [showAllBranches, setShowAllBranches] = useState(branchState?.showAllBranches || false);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState(null);
  const [sortingEnabled, setSortingEnabled] = useState(false);
  const [showMobileDetail, setShowMobileDetail] = useState(false); // 新增:移动端详情显示状态

  // 通知父组件移动端详情显示状态变化
  useEffect(() => {
    if (onMobileDetailChange) {
      onMobileDetailChange(showMobileDetail);
    }
  }, [showMobileDetail, onMobileDetailChange]);

  // 重命名相关状态
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameManager] = useState(() => getRenameManager());
  const [customName, setCustomName] = useState('');

  // 滚动相关状态
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [scrollDirection, setScrollDirection] = useState('up');
  const [forceUpdateCounter, setForceUpdateCounter] = useState(0); // 用于强制更新
  const leftPanelRef = React.useRef(null);
  const mobileDetailBodyRef = React.useRef(null); // 移动端详情 body 引用

  // 消息定位相关
  const messageRefs = useRef({});
  const copiedTimeoutRef = useRef(null); // 用于清理复制提示的 setTimeout

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

  const displayMessages = useMemo(() =>
    filterDisplayMessages(messages, branchFilters, branchAnalysis, showAllBranches),
    [messages, branchFilters, branchAnalysis, showAllBranches, forceUpdateCounter]
  );

  // ==================== 事件处理函数 ====================

  const handleBranchSwitch = useCallback((branchPointUuid, newBranchIndex) => {
    console.log(`[分支切换] 切换分支点 ${branchPointUuid} 到分支 ${newBranchIndex}`);

    // 总是设置为false,确保不是"显示所有分支"模式
    setShowAllBranches(false);

    setBranchFilters(prev => {
      const newFilters = new Map(prev);

      // 获取之前的分支索引，用于记录分支切换
      const previousBranchIndex = prev.get(branchPointUuid) ?? 0;

      // 即使是相同的分支索引,也要重新设置以触发更新
      newFilters.set(branchPointUuid, newBranchIndex);

      console.log(`[分支切换] 更新分支过滤器:`, Array.from(newFilters.entries()));

      // 生成复合分支 ID (保持与 useEffect 和 handleMessageSelect 一致)
      const generateBranchId = (map) => {
        if (!map || map.size === 0) return 'main';
        return `branch_${Array.from(map.entries()).map(([k, v]) => `${k.slice(-4)}_${v}`).join('_')}`;
      };

      const fromBranch = generateBranchId(prev);
      const toBranch = generateBranchId(newFilters);

      // 记录分支切换到 AI Chat 上下文（useContextBridge会自动判断是否需要清理旧下文）
      // 使用复合 ID 以确保 clearBranch 能正确找到之前的消息
      if (fromBranch !== toBranch) {
        recordBranchSwitchToContext(fromBranch, toBranch);

        // 立即将新分支的消息添加到上下文
        try {
          const branchData = branchAnalysis.branchPoints.get(branchPointUuid);
          if (branchData && branchData.branches[newBranchIndex]) {
            const newBranchMessages = branchData.branches[newBranchIndex].messages;
            const contextMessages = newBranchMessages.map(msg => ({
              index: msg.index,
              uuid: msg.uuid,
              sender: msg.sender,
              content: msg.text || msg.content || msg.display_text || '',
              branch: toBranch // 使用新的复合分支 ID
            }));

            console.log(`[分支切换] 添加新分支消息到上下文: ${contextMessages.length} 条, BranchID: ${toBranch}`);
            addMessagesToContext(contextMessages, toBranch);
          }
        } catch (e) {
          console.error('[分支切换] 添加上下文失败:', e);
        }
      }

      // 通知父组件分支状态变化
      if (onBranchStateChange) {
        onBranchStateChange({
          showAllBranches: false,
          currentBranchIndexes: newFilters
        });
      }

      return newFilters;
    });

    // 强制触发消息列表更新
    setForceUpdateCounter(prev => prev + 1);
  }, [onBranchStateChange, recordBranchSwitchToContext]);

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

    // 强制触发消息列表更新
    setForceUpdateCounter(prev => prev + 1);
  }, [showAllBranches, branchFilters, onBranchStateChange, sortActions, sortingEnabled, hasCustomSort]);

  // ==================== 状态和副作用 ====================

  // 文件切换时重置上下文 - 在分支重置和消息追踪之前执行
  useEffect(() => {
    if (files && files.length > 0 && currentFileIndex !== null && currentFileIndex >= 0 && files[currentFileIndex]) {
      const file = files[currentFileIndex];
      console.log(`[ConversationTimeline] 文件切换，初始化上下文 - file: ${file.name}`);
      initContext({
        uuid: `file_${currentFileIndex}_${file.name}`,
        name: file.name
      });
    }
  }, [currentFileIndex, files, initContext]);

  // 重置分支状态 - 当对话切换时
  useEffect(() => {
    // 当对话改变时，重置分支过滤器和显示模式
    console.log(`[ConversationTimeline] 对话切换，重置分支状态 - conversation.uuid: ${conversation?.uuid}`);
    setBranchFilters(new Map());
    setShowAllBranches(false);
    setSortingEnabled(false);
    setSelectedMessageIndex(null);
    // 强制更新消息列表
    setForceUpdateCounter(prev => prev + 1);

    // 注意：不在这里调用 initContext，上下文应该在加载新文件时清空
    // 这样用户在同一个文件的不同对话/分支间切换时，上下文会累积
  }, [conversation?.uuid]);

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

      // 首先尝试通过messageUuid或messageId找到消息
      let targetMessage = null;
      let targetMessageIndex = messageIndex;

      // 优先使用messageUuid
      if (messageUuid) {
        targetMessage = messages.find(msg => msg.uuid === messageUuid);
        if (!targetMessage) {
          // 尝试在所有消息中查找(包括子消息)
          targetMessage = messages.find(msg => {
            // 检查消息的各种可能的UUID字段
            return msg.uuid === messageUuid ||
              msg.message_uuid === messageUuid ||
              msg.id === messageUuid;
          });
        }
      }

      // 如果没有找到,尝试使用messageId
      if (!targetMessage && messageId) {
        // messageId格式可能是: fileUuid_msgUuid或file-xxx_msgUuid
        const parts = messageId.split('_');
        if (parts.length >= 2) {
          const msgUuid = parts.slice(1).join('_'); // 处理可能包含下划线的uuid

          // 通过uuid在原始messages中查找
          targetMessage = messages.find(msg =>
            msg.uuid === msgUuid ||
            msg.uuid === messageId ||
            msg.message_uuid === msgUuid
          );
        }

        if (!targetMessage) {
          // 尝试直接用messageId查找
          targetMessage = messages.find(msg => {
            const fullId = `file-${fileIndex}_${msg.uuid}`;
            const altId = `${conversationUuid}_${msg.uuid}`;
            return fullId === messageId || altId === messageId || msg.uuid === messageId;
          });
        }
      }

      // 如果还没找到,通过index查找
      if (!targetMessage && messageIndex !== undefined && messageIndex !== null) {
        targetMessage = messages.find(msg => msg.index === messageIndex);

        // 如果index也找不到,可能是相对索引
        if (!targetMessage && messages[messageIndex]) {
          targetMessage = messages[messageIndex];
        }
      }

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

      // 更新targetMessageIndex为实际的index
      targetMessageIndex = targetMessage.index;
      console.log(`[消息定位] 找到目标消息 - index: ${targetMessageIndex}, uuid: ${targetMessage.uuid}`);

      // 检查消息是否在当前显示的消息中
      const isMessageVisible = displayMessages.some(msg => msg.uuid === targetMessage.uuid);

      if (!isMessageVisible && branchAnalysis.branchPoints.size > 0 && !showAllBranches) {
        // 消息不在当前分支,需要切换分支
        console.log(`[消息定位] 消息不在当前分支,尝试切换分支...`);

        // 查找包含该消息的分支
        let foundBranch = false;
        let targetBranchPoint = null;
        let targetBranchIndex = null;

        for (const [branchPointUuid, branchData] of branchAnalysis.branchPoints) {
          for (let branchIndex = 0; branchIndex < branchData.branches.length; branchIndex++) {
            const branch = branchData.branches[branchIndex];
            if (branch.messages.some(msg => msg.uuid === targetMessage.uuid)) {
              // 找到包含目标消息的分支
              console.log(`[消息定位] 找到消息所在分支: ${branchPointUuid}, 分支索引: ${branchIndex}`);
              targetBranchPoint = branchPointUuid;
              targetBranchIndex = branchIndex;
              foundBranch = true;
              break;
            }
          }
          if (foundBranch) break;
        }

        if (foundBranch && targetBranchPoint !== null) {
          // 不要先调用handleBranchSwitch，直接构建完整的分支路径
          // 从目标消息开始向上追溯，找到所有需要设置的分支点
          const messagePath = [];
          let currentMsg = targetMessage;
          const visitedUuids = new Set();

          // 构建消息路径
          while (currentMsg && !visitedUuids.has(currentMsg.uuid)) {
            visitedUuids.add(currentMsg.uuid);
            messagePath.unshift(currentMsg);

            // 找到父消息
            if (currentMsg.parent_uuid) {
              currentMsg = messages.find(m => m.uuid === currentMsg.parent_uuid);
            } else {
              break;
            }
          }

          console.log(`[消息定位] 构建消息路径，长度: ${messagePath.length}`);

          // 创建新的分支过滤器
          const newBranchFilters = new Map();

          // 遍历所有分支点，确定正确的分支选择
          for (const [branchPointUuid, branchData] of branchAnalysis.branchPoints) {
            let selectedBranchIndex = 0;

            // 检查消息路径是否经过这个分支点的某个分支
            for (let bIdx = 0; bIdx < branchData.branches.length; bIdx++) {
              const branch = branchData.branches[bIdx];
              // 检查路径中是否有消息在这个分支中
              if (messagePath.some(pathMsg =>
                branch.messages.some(branchMsg => branchMsg.uuid === pathMsg.uuid)
              )) {
                selectedBranchIndex = bIdx;
                console.log(`[消息定位] 分支点 ${branchPointUuid} 需要设置为分支 ${bIdx}`);
                break;
              }
            }

            newBranchFilters.set(branchPointUuid, selectedBranchIndex);
          }

          console.log(`[消息定位] 批量更新分支过滤器:`, Array.from(newBranchFilters.entries()));

          // 批量更新所有分支过滤器
          setBranchFilters(newBranchFilters);
          setShowAllBranches(false);
          setForceUpdateCounter(prev => prev + 1);

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
              messageEl.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
              });

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
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
              messageEl.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
              });

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
              el.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
              });

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
        messageEl.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });

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
  }, [messages, displayMessages, branchAnalysis, handleBranchSwitch, handleShowAllBranches, showAllBranches]);

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

  // 自动追踪当前分支的所有消息到 AI 上下文
  useEffect(() => {
    if (!displayMessages || displayMessages.length === 0) return;

    // 只在明确选择了分支时才自动追踪，避免追踪全部消息
    // 1. 不是显示所有分支模式
    if (showAllBranches) {
      console.log('[ContextBridge] Skipping auto-track: showing all branches');
      return;
    }

    // 2. 必须有分支点（存在分支结构）
    if (branchAnalysis.branchPoints.size === 0) {
      console.log('[ContextBridge] Skipping auto-track: no branch points detected');
      return;
    }

    // 3. 必须已经选择了分支（branchFilters 不为空）
    if (branchFilters.size === 0) {
      console.log('[ContextBridge] Skipping auto-track: no branch filter set');
      return;
    }

    // 获取当前分支 ID
    const currentBranchId = `branch_${Array.from(branchFilters.entries()).map(([k, v]) => `${k.slice(-4)}_${v}`).join('_')}`;

    console.log(`[ContextBridge] Auto-tracking ${displayMessages.length} messages from branch: ${currentBranchId}`);

    // 批量添加所有消息到上下文
    displayMessages.forEach(msg => {
      addMessageToContext({
        index: msg.index,
        uuid: msg.uuid,
        sender: msg.sender,
        text: msg.display_text || msg.text || ''
      }, currentBranchId);
    });
  }, [displayMessages, branchFilters, branchAnalysis, showAllBranches, addMessageToContext]);

  // 初始化自定义名称
  useEffect(() => {
    if (conversation?.uuid) {
      const savedName = renameManager.getRename(conversation.uuid, conversation.name);
      setCustomName(savedName);
    }
  }, [conversation, renameManager]);

  // 关闭移动端详情并清理 history 记录
  const closeMobileDetailAndCleanHistory = useCallback(() => {
    setShowMobileDetail(prev => {
      if (prev) {
        // 如果当前 history state 是 detail，需要后退以清理
        if (window.history.state && window.history.state.view === 'detail') {
          window.history.back();
        }
        if (onHideNavbar) {
          onHideNavbar(false);
        }
        return false;
      }
      return prev;
    });
  }, [onHideNavbar]);

  // 监听窗口大小变化（仅在自动模式下）
  useEffect(() => {
    const handleResize = () => {
      // 只有在自动模式下才响应窗口大小变化
      if (deviceMode === 'auto') {
        const newIsDesktop = window.innerWidth >= 1024;
        setIsDesktop(newIsDesktop);
        // 如果切换到桌面端,关闭移动端详情
        if (newIsDesktop) {
          closeMobileDetailAndCleanHistory();
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [deviceMode, closeMobileDetailAndCleanHistory]);

  // 监听设备模式变化事件
  useEffect(() => {
    const handleDeviceModeChange = (event) => {
      const newMode = event.detail.deviceMode;
      setDeviceMode(newMode);

      // 根据新模式更新 isDesktop 状态
      if (newMode === 'mobile') {
        setIsDesktop(false);
        // 如果当前在显示移动端详情，保持显示
      } else if (newMode === 'desktop') {
        setIsDesktop(true);
        // 切换到桌面端时关闭移动端详情
        closeMobileDetailAndCleanHistory();
      } else {
        // auto 模式：根据当前窗口大小判断
        const newIsDesktop = window.innerWidth >= 1024;
        setIsDesktop(newIsDesktop);
        if (newIsDesktop) {
          closeMobileDetailAndCleanHistory();
        }
      }
    };

    window.addEventListener('deviceModeChange', handleDeviceModeChange);
    return () => window.removeEventListener('deviceModeChange', handleDeviceModeChange);
  }, [closeMobileDetailAndCleanHistory]);

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

  const handleMessageSelect = (messageIndex) => {
    setSelectedMessageIndex(messageIndex);
    setActiveTab('content'); // 重置到内容标签

    // 将选中的消息添加到 AI Chat 上下文
    const selectedMessage = messages.find(m => m.index === messageIndex);
    if (selectedMessage) {
      // 获取当前分支 ID（从 branchFilters 或默认 main）
      const currentBranchId = branchFilters.size > 0
        ? `branch_${Array.from(branchFilters.entries()).map(([k, v]) => `${k.slice(-4)}_${v}`).join('_')}`
        : 'main';
      addMessageToContext({
        index: messageIndex,
        uuid: selectedMessage.uuid,
        sender: selectedMessage.sender,
        text: selectedMessage.display_text || selectedMessage.text || ''
      }, currentBranchId);
    }

    if (!isDesktop) {
      // 移动端:显示移动端详情 modal
      setShowMobileDetail(true);

      // 添加 history 记录，支持后退关闭详情
      // 记录详情视图状态，以便后退时能正确处理
      window.history.pushState(
        {
          view: 'detail',
          msgIndex: messageIndex,
          parentView: 'timeline' // 记录父视图，方便后退时恢复
        },
        ''
      );

      // 隐藏导航栏
      if (onHideNavbar) {
        onHideNavbar(true);
      }
    }
  };

  const handleCloseMobileDetail = () => {
    // 始终使用 window.history.back() 来关闭详情
    // 这样可以保证历史记录的一致性
    window.history.back();
  };

  // 监听 popstate 事件，处理移动端详情后退
  useEffect(() => {
    const handlePopState = (event) => {
      const state = event.state;

      // 只处理 detail 视图相关的后退
      // 如果后退后不再是 detail 视图，则关闭移动端详情
      if (!state || state.view !== 'detail') {
        // 检查是否需要关闭详情（通过 ref 获取实时状态）
        setShowMobileDetail(prev => {
          if (prev) {
            // 关闭详情时恢复导航栏
            if (onHideNavbar) {
              onHideNavbar(false);
            }
            return false;
          }
          return prev;
        });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [onHideNavbar]);

  // 当移动端切换消息时，重置滚动位置到顶部
  useEffect(() => {
    if (showMobileDetail && mobileDetailBodyRef.current) {
      mobileDetailBodyRef.current.scrollTop = 0;
    }
  }, [selectedMessageIndex, showMobileDetail]);

  const handleNavigateMessage = (direction, scrollToPosition = null) => {
    const currentIndex = displayMessages.findIndex(m => m.index === selectedMessageIndex);
    if (currentIndex === -1) return;

    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < displayMessages.length) {
      setSelectedMessageIndex(displayMessages[newIndex].index);
      setActiveTab('content');

      // 切换消息后设置滚动位置
      if (mobileDetailBodyRef.current) {
        setTimeout(() => {
          const container = mobileDetailBodyRef.current;
          if (!container) return;

          if (scrollToPosition === 'bottom') {
            container.scrollTop = container.scrollHeight - container.clientHeight;
          } else {
            container.scrollTop = 0;
          }
        }, 50);
      }
    }
  };

  // 翻页函数（用于点击和滑动）
  const handlePageTurn = (direction) => {
    const container = mobileDetailBodyRef.current;
    if (!container) return;

    const viewportHeight = container.clientHeight;
    const scrollHeight = container.scrollHeight;
    const currentScroll = container.scrollTop;
    const pageSize = viewportHeight * 0.8; // 80% 视口高度，保留 20% 重叠

    if (direction === 'next') {
      // 下一页
      const maxScroll = scrollHeight - viewportHeight;
      if (currentScroll >= maxScroll - 1) {
        // 已在底部，切换到下一条消息
        const currentIndex = displayMessages.findIndex(m => m.index === selectedMessageIndex);
        if (currentIndex < displayMessages.length - 1) {
          handleNavigateMessage('next', 'top');
        }
      } else {
        // 翻到下一页
        container.scrollTop = Math.min(currentScroll + pageSize, maxScroll);
      }
    } else {
      // 上一页
      if (currentScroll <= 1) {
        // 已在顶部，切换到上一条消息
        const currentIndex = displayMessages.findIndex(m => m.index === selectedMessageIndex);
        if (currentIndex > 0) {
          handleNavigateMessage('prev', 'bottom');
        }
      } else {
        // 翻到上一页
        container.scrollTop = Math.max(currentScroll - pageSize, 0);
      }
    }
  };

  // 使用原生事件监听器禁用滚动并处理翻页
  useEffect(() => {
    const container = mobileDetailBodyRef.current;
    if (!container || !showMobileDetail) return;

    let touchStartY = 0;
    let touchStartX = 0;
    let touchStartTime = 0;

    const onTouchStart = (e) => {
      const touch = e.touches[0];
      touchStartY = touch.clientY;
      touchStartX = touch.clientX;
      touchStartTime = Date.now();
    };

    const onTouchMove = (e) => {
      // 完全阻止滚动
      e.preventDefault();
    };

    const onTouchEnd = (e) => {
      const touch = e.changedTouches[0];
      const deltaY = touch.clientY - touchStartY;
      const deltaX = touch.clientX - touchStartX;
      const deltaTime = Date.now() - touchStartTime;

      const SWIPE_THRESHOLD = 30;
      const TAP_THRESHOLD = 10; // 点击判定阈值
      const TAP_MAX_TIME = 300; // 点击最大时间

      // 判断是否为点击（移动距离小且时间短）
      const isTap = Math.abs(deltaX) < TAP_THRESHOLD &&
                    Math.abs(deltaY) < TAP_THRESHOLD &&
                    deltaTime < TAP_MAX_TIME;

      if (isTap) {
        // 点击翻页：左半边=上一页，右半边=下一页
        const screenWidth = window.innerWidth;
        const tapX = touch.clientX;

        if (tapX < screenWidth / 2) {
          handlePageTurn('prev');
        } else {
          handlePageTurn('next');
        }
        return;
      }

      // 滑动翻页
      if (Math.abs(deltaY) > SWIPE_THRESHOLD) {
        if (deltaY < 0) {
          // 向上滑动 = 下一页
          handlePageTurn('next');
        } else {
          // 向下滑动 = 上一页
          handlePageTurn('prev');
        }
      }
    };

    // 添加原生事件监听器，passive: false 才能阻止滚动
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
    };
  }, [showMobileDetail, selectedMessageIndex, displayMessages]);

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
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = setTimeout(() => setCopiedMessageIndex(null), 2000);
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

      // 构建消息路径
      const messagePath = [];
      let currentMsg = latestMessage;
      const visitedUuids = new Set();

      while (currentMsg && !visitedUuids.has(currentMsg.uuid)) {
        visitedUuids.add(currentMsg.uuid);
        messagePath.unshift(currentMsg);

        if (currentMsg.parent_uuid) {
          currentMsg = messages.find(m => m.uuid === currentMsg.parent_uuid);
        } else {
          break;
        }
      }

      console.log(`[跳转到最新] 构建消息路径，长度: ${messagePath.length}`);

      // 创建新的分支过滤器
      const newBranchFilters = new Map();

      // 遍历所有分支点，确定正确的分支选择
      for (const [branchPointUuid, branchData] of branchAnalysis.branchPoints) {
        let selectedBranchIndex = 0;

        // 检查消息路径是否经过这个分支点的某个分支
        for (let bIdx = 0; bIdx < branchData.branches.length; bIdx++) {
          const branch = branchData.branches[bIdx];
          // 检查路径中是否有消息在这个分支中
          if (messagePath.some(pathMsg =>
            branch.messages.some(branchMsg => branchMsg.uuid === pathMsg.uuid)
          )) {
            selectedBranchIndex = bIdx;
            console.log(`[跳转到最新] 分支点 ${branchPointUuid} 需要设置为分支 ${bIdx}`);
            break;
          }
        }

        newBranchFilters.set(branchPointUuid, selectedBranchIndex);
      }

      console.log(`[跳转到最新] 批量更新分支过滤器:`, Array.from(newBranchFilters.entries()));

      // 批量更新所有分支过滤器
      setBranchFilters(newBranchFilters);
      setShowAllBranches(false);
      setForceUpdateCounter(prev => prev + 1);

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
          messageEl.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });

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
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
            el.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });

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
      messageEl.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });

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

    // 优先根据format判断，因为format更准确
    if (format === 'jsonl_chat') return 'assistant platform-jsonl_chat';
    if (format === 'chatgpt') return 'assistant platform-chatgpt';
    if (format === 'grok') return 'assistant platform-grok';
    if (format === 'copilot') return 'assistant platform-copilot';
    if (format === 'gemini_notebooklm') {
      const platformLower = platform?.toLowerCase() || '';
      if (platformLower.includes('notebooklm')) return 'assistant platform-notebooklm';
      return 'assistant platform-gemini';
    }

    // 兼容性：也检查platform字段
    const platformLower = platform?.toLowerCase() || 'claude';
    if (platformLower.includes('jsonl')) return 'assistant platform-jsonl_chat';
    if (platformLower.includes('chatgpt')) return 'assistant platform-chatgpt';
    if (platformLower.includes('grok')) return 'assistant platform-grok';
    if (platformLower.includes('copilot')) return 'assistant platform-copilot';
    if (platformLower.includes('gemini')) return 'assistant platform-gemini';
    if (platformLower.includes('ai studio') || platformLower.includes('aistudio')) return 'assistant platform-aistudio';
    if (platformLower.includes('notebooklm')) return 'assistant platform-notebooklm';
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
                  {/* 跳转到最新消息按钮 */}
                  {messages && messages.length > 0 && (
                    <button
                      className="btn-secondary small"
                      onClick={handleJumpToLatest}
                      title={t('timeline.actions.jumpToLatest')}
                      style={{ fontSize: '12px', padding: '2px 8px' }}
                    >
                      ⏩ {t('timeline.actions.jumpToLatest')}
                    </button>
                  )}
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

            {/* 根分支切换器（第一条消息就有分支的情况） */}
            {(() => {
              const rootBranchData = branchAnalysis.branchPoints.get(ROOT_UUID);
              if (rootBranchData && rootBranchData.branches.length > 1 && !showAllBranches) {
                return (
                  <div className="root-branch-container">
                    <div className="root-branch-label">
                      <span className="label-text">{t('timeline.branch.detected')} {branchAnalysis.branchPoints.size} {t('timeline.branch.branchPoints')}</span>
                      {/*对话起始点 · 有多个开始分支*/}
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
                );
              }
              return null;
            })()}

            {displayMessages.map((msg, index) => {
              const branchData = branchAnalysis.branchPoints.get(msg.uuid);
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
                      className={`timeline-content ${selectedMessageIndex === msg.index ? 'selected' : ''}`}
                      onClick={() => handleMessageSelect(msg.index)}
                    >
                      <div className="timeline-header">
                        <div className="timeline-sender">
                          <div className={`timeline-avatar ${getPlatformAvatarClass(msg.sender, conversationInfo?.platform)}`}>
                            {msg.sender === 'human' ? '👤' : (
                              <PlatformIcon
                                platform={conversationInfo?.platform?.toLowerCase() || 'claude'}
                                format={format}
                                size={20}
                                style={{ backgroundColor: 'transparent' }}
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
                            li: ({ children }) => <span style={{ whiteSpace: 'normal' }}>• {children} </span>
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
                        {/* 图片 - 合并 images 数组和 attachments 中的嵌入图片 */}
                        {(() => {
                          // 兼容性处理：对于 Grok 格式，自动检测图片类型的附件
                          const embeddedImages = msg.attachments?.filter(att => {
                            if (att.is_embedded_image) return true;
                            // Grok 兼容：检查 MIME 类型
                            if (format === 'grok' && att.file_type && att.file_type.startsWith('image/')) return true;
                            return false;
                          }) || [];
                          const totalImages = (msg.images?.length || 0) + embeddedImages.length;
                          return totalImages > 0 && (
                            <div className="timeline-tag">
                              <span>🖼️</span>
                              <span>{totalImages}{t('timeline.tags.images')}</span>
                            </div>
                          );
                        })()}
                        {/* 附件 - 排除嵌入的图片，只显示真实附件 */}
                        {(() => {
                          // 兼容性处理：对于 Grok 格式，自动排除图片类型的附件
                          const regularAttachments = msg.attachments?.filter(att => {
                            if (att.is_embedded_image) return false;
                            // Grok 兼容：排除图片类型
                            if (format === 'grok' && att.file_type && att.file_type.startsWith('image/')) return false;
                            return true;
                          }) || [];
                          return regularAttachments.length > 0 && (
                            <div className="timeline-tag">
                              <span>📎</span>
                              <span>{regularAttachments.length}{t('timeline.tags.attachments')}</span>
                            </div>
                          );
                        })()}
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
            // 助手消息的处理
            // Claude格式和JSONL格式都支持思考过程
            if (format === 'claude' || format === 'jsonl_chat' || !format) {
              if (currentMessage.thinking) {
                availableTabs.push({ id: 'thinking', label: t('messageDetail.tabs.thinking') });
              }
            }
            // 只有Claude格式支持Artifacts
            if (format === 'claude' || !format) {
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

              <div
                className="mobile-detail-body"
                ref={mobileDetailBodyRef}
              >
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