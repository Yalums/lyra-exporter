# 重构实施指南

本文档提供了详细的代码迁移步骤和示例。

## 📁 新文件详细设计

### 1. RenameDialog.js - 共用重命名对话框

#### 文件位置
```
src/components/common/RenameDialog.js
```

#### 设计思路
- 提取 ConversationTimeline 和 UnifiedCard 中重复的 RenameDialog 组件
- 创建 useRename Hook 统一管理重命名状态和逻辑
- 支持自定义验证和回调

#### 导出接口
```javascript
// 组件导出
export const RenameDialog = ({ isOpen, currentName, onSave, onCancel, t, validate })

// Hook 导出
export const useRename = (itemId, initialName, options) => ({
  showDialog: boolean,
  currentName: string,
  openRename: () => void,
  saveRename: (newName) => void,
  cancelRename: () => void
})
```

#### 代码示例
```javascript
// components/common/RenameDialog.js
import React, { useState, useEffect } from 'react';
import { getRenameManager } from '../../utils/renameManager';

/**
 * 通用重命名对话框组件
 */
export const RenameDialog = ({
  isOpen,
  currentName,
  onSave,
  onCancel,
  t,
  validate = null, // 自定义验证函数
  placeholder = null
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

    // 空值验证
    if (!trimmedName) {
      setError(t('rename.error.empty'));
      return;
    }

    // 自定义验证
    if (validate) {
      const validationError = validate(trimmedName);
      if (validationError) {
        setError(validationError);
        return;
      }
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
              placeholder={placeholder || t('rename.placeholder')}
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

/**
 * 重命名 Hook - 管理重命名状态和逻辑
 */
export const useRename = (itemId, initialName, {
  onRename = null,
  validate = null,
  saveToManager = true
} = {}) => {
  const [showDialog, setShowDialog] = useState(false);
  const [currentName, setCurrentName] = useState(initialName || '');
  const [renameManager] = useState(() => saveToManager ? getRenameManager() : null);

  // 同步外部名称变化
  useEffect(() => {
    setCurrentName(initialName || '');
  }, [initialName]);

  const openRename = () => {
    setShowDialog(true);
  };

  const saveRename = (newName) => {
    if (itemId && saveToManager && renameManager) {
      renameManager.setRename(itemId, newName);
    }

    setCurrentName(newName);
    setShowDialog(false);

    if (onRename) {
      onRename(itemId, newName);
    }
  };

  const cancelRename = () => {
    setShowDialog(false);
  };

  return {
    showDialog,
    currentName,
    openRename,
    saveRename,
    cancelRename
  };
};
```

#### 使用示例

**在 ConversationTimeline.js 中使用：**
```javascript
import { RenameDialog, useRename } from './common/RenameDialog';

const ConversationTimeline = ({ conversation, onRename, ... }) => {
  const { t } = useI18n();

  // 使用 Hook
  const {
    showDialog,
    currentName,
    openRename,
    saveRename,
    cancelRename
  } = useRename(
    conversation?.uuid,
    conversation?.name,
    { onRename }
  );

  return (
    <>
      {/* 重命名按钮 */}
      <button onClick={openRename}>✏️</button>

      {/* 重命名对话框 */}
      <RenameDialog
        isOpen={showDialog}
        currentName={currentName}
        onSave={saveRename}
        onCancel={cancelRename}
        t={t}
      />
    </>
  );
};
```

**在 UnifiedCard.js 中使用：**
```javascript
import { RenameDialog, useRename } from './common/RenameDialog';

export const Card = ({ item, onRename }) => {
  const { t } = useI18n();

  const {
    showDialog,
    currentName,
    openRename,
    saveRename,
    cancelRename
  } = useRename(
    item.uuid,
    item.originalName || item.name,
    { onRename }
  );

  const handleRename = (e) => {
    e.stopPropagation();
    openRename();
  };

  return (
    <div className="card">
      <button onClick={handleRename}>✏️</button>

      <RenameDialog
        isOpen={showDialog}
        currentName={currentName}
        onSave={saveRename}
        onCancel={cancelRename}
        t={t}
      />
    </div>
  );
};
```

---

### 2. TimelineBranch.js - 分支管理

#### 文件位置
```
src/components/timeline/TimelineBranch.js
```

#### 设计思路
- 集中管理分支分析、过滤、切换逻辑
- 提供独立的 BranchSwitcher 组件
- 通过 Hooks 暴露分支相关功能

#### 导出接口
```javascript
// 组件导出
export const BranchSwitcher = ({ branchPoint, availableBranches, currentBranchIndex, ... })

// Hooks 导出
export const useBranchAnalysis = (messages, format, conversation) => ({
  branchPoints: Map,
  msgDict: Object,
  parentChildren: Object
})

export const useBranchFilter = (messages, branchPoints, branchFilters, showAllBranches) => ({
  displayMessages: Array,
  filteredCount: number
})

export const useBranchState = (branchPoints, onBranchStateChange) => ({
  branchFilters: Map,
  showAllBranches: boolean,
  handleBranchSwitch: (uuid, index) => void,
  handleShowAllBranches: () => void,
  setBranchFilters: (filters) => void,
  setShowAllBranches: (show) => void
})
```

#### 核心逻辑提取

**分支分析逻辑 (从 ConversationTimeline line 459-579)：**
```javascript
// components/timeline/TimelineBranch.js

/**
 * 分支分析 Hook
 * 分析消息树结构，识别分支点和分支路径
 */
export const useBranchAnalysis = (messages, format, conversation) => {
  return useMemo(() => {
    // 辅助函数：查找分支的所有消息
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

    // 1. 过滤消息（针对 claude_full_export 格式）
    let analysisMessages = messages;
    if (format === 'claude_full_export' && conversation?.uuid) {
      const realConversationUuid = conversation.uuid.includes('-') ?
        conversation.uuid.split('-').slice(1).join('-') : conversation.uuid;

      analysisMessages = messages.filter(msg =>
        msg.conversation_uuid === realConversationUuid &&
        !msg.is_conversation_header
      );
    }

    // 2. 构建消息字典和父子关系
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

    // 3. 识别分支点
    const ROOT_UUID = '00000000-0000-4000-8000-000000000000';

    Object.entries(parentChildren).forEach(([parentUuid, children]) => {
      if (children.length > 1) {
        let branchPoint = null;

        if (parentUuid === ROOT_UUID) {
          // 根节点有多个子节点，创建虚拟分支点
          branchPoint = {
            uuid: ROOT_UUID,
            index: -1,
            display_text: '对话起始点',
            sender: 'system',
            sender_label: '系统',
            timestamp: '对话开始'
          };
        } else if (msgDict[parentUuid]) {
          branchPoint = msgDict[parentUuid];
        }

        if (branchPoint) {
          const sortedChildren = children
            .map(uuid => msgDict[uuid])
            .filter(msg => msg)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

          const branches = sortedChildren.map((childMsg, branchIndex) => {
            const branchMessages = findBranchMessages(childMsg.uuid, msgDict, parentChildren);

            // 计算当前片段的消息数量
            let segmentCount = 0;
            let current = childMsg;
            while (current) {
              segmentCount++;
              const children = parentChildren[current.uuid] || [];
              if (children.length === 0) {
                current = null;
              } else if (children.length === 1) {
                current = msgDict[children[0]];
              } else {
                current = null;
              }
            }

            return {
              branchIndex,
              startMessage: childMsg,
              messages: branchMessages,
              messageCount: branchMessages.length,
              segmentCount: segmentCount,
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
      }
    });

    return { branchPoints, msgDict, parentChildren };
  }, [messages, format, conversation]);
};

/**
 * 分支过滤 Hook
 * 根据分支选择过滤显示的消息
 */
export const useBranchFilter = (messages, branchPoints, branchFilters, showAllBranches) => {
  const displayMessages = useMemo(() => {
    // 显示所有分支
    if (showAllBranches) return messages;

    // 没有分支点
    if (branchPoints.size === 0) return messages;

    // 预处理：将每个分支的消息数组转换为 Set
    const branchPointInfo = Array.from(branchPoints.entries()).map(([uuid, data]) => {
      const selectedIndex = branchFilters.get(uuid) ?? 0;
      const branches = data.branches.map(b => ({
        index: b.branchIndex,
        messageUuids: new Set(b.messages.map(m => m.uuid))
      }));
      return {
        uuid,
        index: data.branchPoint.index,
        selectedIndex,
        selectedBranchUuids: branches[selectedIndex]?.messageUuids || new Set(),
        allBranchUuids: new Set(branches.flatMap(b => Array.from(b.messageUuids)))
      };
    });

    const visibleMessages = [];

    for (const msg of messages) {
      let shouldShow = true;

      for (const info of branchPointInfo) {
        // 对于普通分支点，只影响其后的消息；对于根分支点(index: -1)，影响所有消息
        if (info.index === -1 || msg.index > info.index) {
          if (info.allBranchUuids.has(msg.uuid)) {
            if (!info.selectedBranchUuids.has(msg.uuid)) {
              shouldShow = false;
              break;
            }
          }
        }
      }

      if (shouldShow) visibleMessages.push(msg);
    }

    return visibleMessages;
  }, [messages, branchFilters, branchPoints, showAllBranches]);

  return {
    displayMessages,
    filteredCount: messages.length - displayMessages.length
  };
};

/**
 * 分支状态管理 Hook
 */
export const useBranchState = (branchPoints, onBranchStateChange) => {
  const [branchFilters, setBranchFilters] = useState(new Map());
  const [showAllBranches, setShowAllBranches] = useState(false);
  const [forceUpdateCounter, setForceUpdateCounter] = useState(0);

  // 处理分支切换
  const handleBranchSwitch = useCallback((branchPointUuid, newBranchIndex) => {
    console.log(`[分支切换] 切换分支点 ${branchPointUuid} 到分支 ${newBranchIndex}`);

    setShowAllBranches(false);

    setBranchFilters(prev => {
      const newFilters = new Map(prev);
      newFilters.set(branchPointUuid, newBranchIndex);

      if (onBranchStateChange) {
        onBranchStateChange({
          showAllBranches: false,
          currentBranchIndexes: newFilters
        });
      }

      return newFilters;
    });

    setForceUpdateCounter(prev => prev + 1);
  }, [onBranchStateChange]);

  // 处理显示所有分支
  const handleShowAllBranches = useCallback(() => {
    const newShowAllBranches = !showAllBranches;
    setShowAllBranches(newShowAllBranches);

    if (onBranchStateChange) {
      onBranchStateChange({
        showAllBranches: newShowAllBranches,
        currentBranchIndexes: newShowAllBranches ? new Map() : branchFilters
      });
    }

    if (newShowAllBranches) {
      setBranchFilters(new Map());
    }

    setForceUpdateCounter(prev => prev + 1);
  }, [showAllBranches, branchFilters, onBranchStateChange]);

  // 初始化分支过滤器
  useEffect(() => {
    if (branchPoints.size > 0 && branchFilters.size === 0 && !showAllBranches) {
      const initialFilters = new Map();
      branchPoints.forEach((branchData, branchPointUuid) => {
        initialFilters.set(branchPointUuid, 0);
      });
      setBranchFilters(initialFilters);
    }
  }, [branchPoints, branchFilters.size, showAllBranches]);

  return {
    branchFilters,
    showAllBranches,
    forceUpdateCounter,
    handleBranchSwitch,
    handleShowAllBranches,
    setBranchFilters,
    setShowAllBranches
  };
};
```

**BranchSwitcher 组件 (从 ConversationTimeline line 90-310)：**
```javascript
// 直接从 ConversationTimeline 移出，保持原样
export const BranchSwitcher = ({ ... }) => {
  // ... 保持原有实现
};
```

---

### 3. TimelineMessageLocator.js - 消息定位

#### 文件位置
```
src/components/timeline/TimelineMessageLocator.js
```

#### 设计思路
- 统一消息定位、导航、路径追踪逻辑
- 消除 handleJumpToLatest 和 scrollToMessage 的代码重复
- 提供可复用的消息路径构建算法

#### 导出接口
```javascript
// 工具函数导出
export const buildMessagePath = (targetMessage, messages) => Array

// Hook 导出
export const useMessageLocator = (options) => ({
  scrollToMessage: (messageInfo) => void,
  locateMessage: (messageIndex) => HTMLElement | null
})

export const useJumpToLatest = (messages, branchAnalysis, options) => ({
  jumpToLatest: () => void,
  latestMessage: Object | null
})
```

#### 核心逻辑提取

**通用消息路径构建函数：**
```javascript
// components/timeline/TimelineMessageLocator.js

/**
 * 构建从目标消息到根节点的路径
 * @param {Object} targetMessage - 目标消息
 * @param {Array} messages - 所有消息列表
 * @returns {Array} 消息路径数组（从根到目标）
 */
export const buildMessagePath = (targetMessage, messages) => {
  const messagePath = [];
  let currentMsg = targetMessage;
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

  return messagePath;
};

/**
 * 计算到达目标消息需要的分支过滤器设置
 * @param {Array} messagePath - 消息路径
 * @param {Map} branchPoints - 分支点数据
 * @returns {Map} 新的分支过滤器
 */
export const calculateBranchFilters = (messagePath, branchPoints) => {
  const newBranchFilters = new Map();

  for (const [branchPointUuid, branchData] of branchPoints) {
    let selectedBranchIndex = 0;

    // 检查消息路径是否经过这个分支点的某个分支
    for (let bIdx = 0; bIdx < branchData.branches.length; bIdx++) {
      const branch = branchData.branches[bIdx];
      if (messagePath.some(pathMsg =>
        branch.messages.some(branchMsg => branchMsg.uuid === pathMsg.uuid)
      )) {
        selectedBranchIndex = bIdx;
        break;
      }
    }

    newBranchFilters.set(branchPointUuid, selectedBranchIndex);
  }

  return newBranchFilters;
};

/**
 * 消息定位 Hook
 */
export const useMessageLocator = ({
  messages,
  displayMessages,
  branchAnalysis,
  messageRefs,
  setBranchFilters,
  setShowAllBranches,
  setSelectedMessageIndex,
  setForceUpdateCounter,
  onBranchStateChange
}) => {
  const scrollToMessage = useCallback((messageInfo) => {
    const { messageIndex, messageId, messageUuid, highlight, fileIndex, conversationUuid } = messageInfo;

    console.log(`[消息定位] 开始定位 - messageUuid: ${messageUuid}, messageIndex: ${messageIndex}`);

    // 消息列表为空时等待并重试
    if (messages.length === 0) {
      console.log(`[消息定位] 消息列表为空，等待加载后重试...`);
      let retryCount = 0;
      const maxRetries = 10;
      const retryInterval = setInterval(() => {
        retryCount++;
        if (messages.length > 0 || retryCount >= maxRetries) {
          clearInterval(retryInterval);
          if (messages.length > 0) {
            scrollToMessage(messageInfo);
          }
        }
      }, 200);
      return;
    }

    // 1. 查找目标消息
    let targetMessage = null;

    if (messageUuid) {
      targetMessage = messages.find(msg =>
        msg.uuid === messageUuid ||
        msg.message_uuid === messageUuid ||
        msg.id === messageUuid
      );
    }

    if (!targetMessage && messageId) {
      const parts = messageId.split('_');
      if (parts.length >= 2) {
        const msgUuid = parts.slice(1).join('_');
        targetMessage = messages.find(msg =>
          msg.uuid === msgUuid || msg.uuid === messageId || msg.message_uuid === msgUuid
        );
      }
    }

    if (!targetMessage && messageIndex !== undefined && messageIndex !== null) {
      targetMessage = messages.find(msg => msg.index === messageIndex) || messages[messageIndex];
    }

    if (!targetMessage) {
      console.warn(`[消息定位] 未找到目标消息`);
      return;
    }

    const targetMessageIndex = targetMessage.index;
    console.log(`[消息定位] 找到目标消息 - index: ${targetMessageIndex}`);

    // 2. 检查消息是否可见
    const isMessageVisible = displayMessages.some(msg => msg.uuid === targetMessage.uuid);

    if (!isMessageVisible && branchAnalysis.branchPoints.size > 0) {
      // 3. 构建消息路径并计算分支过滤器
      const messagePath = buildMessagePath(targetMessage, messages);
      const newBranchFilters = calculateBranchFilters(messagePath, branchAnalysis.branchPoints);

      console.log(`[消息定位] 批量更新分支过滤器:`, Array.from(newBranchFilters.entries()));

      // 4. 批量更新分支过滤器
      setBranchFilters(newBranchFilters);
      setShowAllBranches(false);
      setForceUpdateCounter(prev => prev + 1);

      if (onBranchStateChange) {
        onBranchStateChange({
          showAllBranches: false,
          currentBranchIndexes: newBranchFilters
        });
      }

      // 5. 延迟执行滚动
      setTimeout(() => {
        performScroll(messageRefs.current[targetMessageIndex], targetMessageIndex, highlight);
      }, 600);
    } else {
      // 消息可见，直接滚动
      performScroll(messageRefs.current[targetMessageIndex], targetMessageIndex, highlight);
    }

    // 辅助函数：执行滚动
    function performScroll(messageEl, msgIndex, shouldHighlight) {
      if (!messageEl) {
        setTimeout(() => {
          const el = messageRefs.current[msgIndex];
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setSelectedMessageIndex(msgIndex);
            if (shouldHighlight) {
              el.classList.add('highlight-from-search');
              setTimeout(() => el.classList.remove('highlight-from-search'), 3000);
            }
          }
        }, 200);
        return;
      }

      messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setSelectedMessageIndex(msgIndex);

      if (shouldHighlight) {
        messageEl.classList.add('highlight-from-search');
        setTimeout(() => messageEl.classList.remove('highlight-from-search'), 3000);
      }
    }
  }, [
    messages,
    displayMessages,
    branchAnalysis,
    messageRefs,
    setBranchFilters,
    setShowAllBranches,
    setSelectedMessageIndex,
    setForceUpdateCounter,
    onBranchStateChange
  ]);

  return { scrollToMessage };
};

/**
 * 跳转到最新消息 Hook
 */
export const useJumpToLatest = ({
  messages,
  displayMessages,
  branchAnalysis,
  messageRefs,
  setBranchFilters,
  setShowAllBranches,
  setSelectedMessageIndex,
  setForceUpdateCounter,
  onBranchStateChange
}) => {
  const jumpToLatest = useCallback(() => {
    if (!messages || messages.length === 0) {
      console.warn('[跳转到最新] 没有可用的消息');
      return;
    }

    // 找到时间戳最新的消息
    const sortedMessages = [...messages].sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeA - timeB;
    });

    const latestMessage = sortedMessages[sortedMessages.length - 1];
    console.log(`[跳转到最新] 找到最新消息 - index: ${latestMessage.index}`);

    // 检查消息是否可见
    const isMessageVisible = displayMessages.some(msg => msg.uuid === latestMessage.uuid);

    if (!isMessageVisible && branchAnalysis.branchPoints.size > 0) {
      // 构建消息路径并计算分支过滤器
      const messagePath = buildMessagePath(latestMessage, messages);
      const newBranchFilters = calculateBranchFilters(messagePath, branchAnalysis.branchPoints);

      console.log(`[跳转到最新] 批量更新分支过滤器:`, Array.from(newBranchFilters.entries()));

      setBranchFilters(newBranchFilters);
      setShowAllBranches(false);
      setForceUpdateCounter(prev => prev + 1);

      if (onBranchStateChange) {
        onBranchStateChange({
          showAllBranches: false,
          currentBranchIndexes: newBranchFilters
        });
      }

      // 延迟执行滚动
      setTimeout(() => {
        scrollAndHighlight(messageRefs.current[latestMessage.index], latestMessage.index);
      }, 600);
    } else {
      // 消息可见，直接滚动
      scrollAndHighlight(messageRefs.current[latestMessage.index], latestMessage.index);
    }

    // 辅助函数：滚动并高亮
    function scrollAndHighlight(messageEl, msgIndex) {
      if (!messageEl) {
        setTimeout(() => {
          const el = messageRefs.current[msgIndex];
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setSelectedMessageIndex(msgIndex);
            el.classList.add('highlight-from-search');
            setTimeout(() => el.classList.remove('highlight-from-search'), 3000);
          }
        }, 200);
        return;
      }

      messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setSelectedMessageIndex(msgIndex);
      messageEl.classList.add('highlight-from-search');
      setTimeout(() => messageEl.classList.remove('highlight-from-search'), 3000);
    }
  }, [
    messages,
    displayMessages,
    branchAnalysis,
    messageRefs,
    setBranchFilters,
    setShowAllBranches,
    setSelectedMessageIndex,
    setForceUpdateCounter,
    onBranchStateChange
  ]);

  return { jumpToLatest };
};
```

---

## 🔄 ConversationTimeline.js 重构示例

### 重构前（部分代码）
```javascript
const ConversationTimeline = ({ ... }) => {
  // 20+ useState
  const [branchFilters, setBranchFilters] = useState(new Map());
  const [showAllBranches, setShowAllBranches] = useState(false);
  // ...

  // 分支分析 (130行)
  const branchAnalysis = useMemo(() => {
    // ... 复杂的分支分析逻辑
  }, [messages, format, conversation]);

  // 显示消息过滤 (60行)
  const displayMessages = useMemo(() => {
    // ... 复杂的过滤逻辑
  }, [messages, branchFilters, branchAnalysis]);

  // 消息定位 (300行)
  useEffect(() => {
    const handleScrollToMessage = (event) => {
      // ... 超长的定位逻辑
    };
    window.addEventListener('scrollToMessage', handleScrollToMessage);
    return () => window.removeEventListener('scrollToMessage', handleScrollToMessage);
  }, [...]);

  // 跳转到最新 (150行)
  const handleJumpToLatest = useCallback(() => {
    // ... 与 scrollToMessage 重复的逻辑
  }, [...]);

  // 内嵌的 RenameDialog 组件 (87行)
  const RenameDialog = ({ ... }) => { ... };

  // 内嵌的 BranchSwitcher 组件 (220行)
  const BranchSwitcher = ({ ... }) => { ... };

  return ( ... );
};
```

### 重构后
```javascript
import { RenameDialog, useRename } from './common/RenameDialog';
import { BranchSwitcher, useBranchAnalysis, useBranchFilter, useBranchState } from './timeline/TimelineBranch';
import { useMessageLocator, useJumpToLatest } from './timeline/TimelineMessageLocator';

const ConversationTimeline = ({
  data,
  messages,
  conversation,
  onBranchStateChange,
  ...otherProps
}) => {
  const { t } = useI18n();

  // 基础状态
  const [selectedMessageIndex, setSelectedMessageIndex] = useState(null);
  const [activeTab, setActiveTab] = useState('content');
  const messageRefs = useRef({});

  // ===== 使用提取的 Hooks =====

  // 重命名功能
  const {
    showDialog: showRenameDialog,
    currentName: customName,
    openRename: handleOpenRename,
    saveRename: handleSaveRename,
    cancelRename: handleCancelRename
  } = useRename(conversation?.uuid, conversation?.name, { onRename });

  // 分支分析
  const branchAnalysis = useBranchAnalysis(messages, format, conversation);

  // 分支状态管理
  const {
    branchFilters,
    showAllBranches,
    handleBranchSwitch,
    handleShowAllBranches,
    setBranchFilters,
    setShowAllBranches
  } = useBranchState(branchAnalysis.branchPoints, onBranchStateChange);

  // 分支过滤
  const { displayMessages } = useBranchFilter(
    messages,
    branchAnalysis.branchPoints,
    branchFilters,
    showAllBranches
  );

  // 消息定位
  const { scrollToMessage } = useMessageLocator({
    messages,
    displayMessages,
    branchAnalysis,
    messageRefs,
    setBranchFilters,
    setShowAllBranches,
    setSelectedMessageIndex,
    setForceUpdateCounter,
    onBranchStateChange
  });

  // 跳转到最新
  const { jumpToLatest } = useJumpToLatest({
    messages,
    displayMessages,
    branchAnalysis,
    messageRefs,
    setBranchFilters,
    setShowAllBranches,
    setSelectedMessageIndex,
    setForceUpdateCounter,
    onBranchStateChange
  });

  // 监听消息定位事件
  useEffect(() => {
    const handleScrollEvent = (event) => scrollToMessage(event.detail);
    window.addEventListener('scrollToMessage', handleScrollEvent);
    return () => window.removeEventListener('scrollToMessage', handleScrollEvent);
  }, [scrollToMessage]);

  // ===== 渲染 =====
  return (
    <div className="enhanced-timeline-container">
      {/* ... 时间线内容 */}

      {/* 分支切换器 */}
      <BranchSwitcher
        branchPoint={branchPoint}
        availableBranches={branches}
        currentBranchIndex={currentBranchIndex}
        onBranchChange={handleBranchSwitch}
        onShowAllBranches={handleShowAllBranches}
        showAllMode={showAllBranches}
      />

      {/* 重命名对话框 */}
      <RenameDialog
        isOpen={showRenameDialog}
        currentName={customName}
        onSave={handleSaveRename}
        onCancel={handleCancelRename}
        t={t}
      />
    </div>
  );
};
```

---

## 📝 迁移检查清单

### 第1步：RenameDialog
- [ ] 创建 `src/components/common/RenameDialog.js`
- [ ] 实现 `RenameDialog` 组件
- [ ] 实现 `useRename` Hook
- [ ] 在 ConversationTimeline 中替换使用
- [ ] 在 UnifiedCard 中替换使用
- [ ] 测试重命名功能

### 第2步：TimelineBranch
- [ ] 创建 `src/components/timeline/TimelineBranch.js`
- [ ] 迁移 `BranchSwitcher` 组件
- [ ] 实现 `useBranchAnalysis` Hook
- [ ] 实现 `useBranchFilter` Hook
- [ ] 实现 `useBranchState` Hook
- [ ] 在 ConversationTimeline 中使用新 Hooks
- [ ] 测试分支切换功能

### 第3步：TimelineMessageLocator
- [ ] 创建 `src/components/timeline/TimelineMessageLocator.js`
- [ ] 实现 `buildMessagePath` 函数
- [ ] 实现 `calculateBranchFilters` 函数
- [ ] 实现 `useMessageLocator` Hook
- [ ] 实现 `useJumpToLatest` Hook
- [ ] 在 ConversationTimeline 中使用新 Hooks
- [ ] 测试消息定位和跳转功能

### 第4步：清理 ConversationTimeline
- [ ] 删除已迁移的组件和逻辑
- [ ] 整理 imports
- [ ] 简化状态管理
- [ ] 优化代码结构

### 第5步：测试
- [ ] 功能测试：分支切换
- [ ] 功能测试：消息定位
- [ ] 功能测试：跳转到最新
- [ ] 功能测试：重命名
- [ ] 回归测试：所有功能

---

## ✅ 预期收益

1. **代码行数**
   - ConversationTimeline: 2092 → ~1200 (-43%)
   - UnifiedCard: 369 → ~280 (-24%)

2. **可维护性**
   - 职责清晰：每个文件只做一件事
   - 易于测试：逻辑独立，可单独测试
   - 便于调试：问题范围更小

3. **代码复用**
   - 消除重复：RenameDialog、消息路径追踪
   - 统一体验：所有地方使用相同的逻辑

4. **扩展性**
   - 新功能接口清晰
   - 不影响其他模块
   - 便于并行开发
