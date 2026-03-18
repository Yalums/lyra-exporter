// utils/branchAnalysis.js
// 从 ConversationTimeline.js 提取的分支分析和消息过滤逻辑

const ROOT_UUID = '00000000-0000-4000-8000-000000000000';

/**
 * 分析消息数组中的分支结构
 * @param {Array} messages - 消息数组
 * @returns {{ branchPoints: Map, msgDict: Object, parentChildren: Object }}
 */
export function analyzeBranches(messages) {
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

  const analysisMessages = messages;

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
    if (children.length > 1) {
      let branchPoint = null;

      if (parentUuid === ROOT_UUID) {
        // 根节点有多个子节点，创建虚拟分支点
        branchPoint = {
          uuid: ROOT_UUID,
          index: -1, // 使用-1表示这是根分支点
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

          // 计算当前片段的消息数量（直到下一个分支点或结束）
          let segmentCount = 0;
          let current = childMsg;
          while (current) {
            segmentCount++;
            const children = parentChildren[current.uuid] || [];
            if (children.length === 0) {
              current = null; // 对话结束
            } else if (children.length === 1) {
              current = msgDict[children[0]]; // 继续当前片段
            } else {
              current = null; // 遇到新的分支点，片段结束
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
}

/**
 * 根据分支过滤条件过滤消息
 * @param {Array} messages - 原始消息数组
 * @param {Map} branchFilters - 分支过滤状态 Map<uuid, selectedIndex>
 * @param {{ branchPoints: Map }} branchAnalysis - 分支分析结果
 * @param {boolean} showAllBranches - 是否显示所有分支
 * @returns {Array} 过滤后的消息数组
 */
export function filterDisplayMessages(messages, branchFilters, branchAnalysis, showAllBranches) {
  if (showAllBranches) return messages;
  if (branchAnalysis.branchPoints.size === 0) return messages;

  // 预处理：将每个分支的消息数组转换为 Set，大幅提高 lookup 性能
  const branchPointInfo = Array.from(branchAnalysis.branchPoints.entries()).map(([uuid, data]) => {
    const selectedIndex = branchFilters.get(uuid) ?? 0; // 默认选择第一个分支
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
        // 如果消息属于该分支点的任何一个分支
        if (info.allBranchUuids.has(msg.uuid)) {
          // 但如果不属于当前选中的分支
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
}

/**
 * 通过 uuid / messageId / index 在消息列表中定位一条消息
 * @param {Array} messages
 * @param {{ messageUuid, messageId, messageIndex, fileIndex, conversationUuid }} locator
 * @returns {Object|null}
 */
export function findMessageByLocator(messages, { messageUuid, messageId, messageIndex, fileIndex, conversationUuid }) {
  // 优先使用 uuid
  if (messageUuid) {
    const found = messages.find(msg =>
      msg.uuid === messageUuid ||
      msg.message_uuid === messageUuid ||
      msg.id === messageUuid
    );
    if (found) return found;
  }

  // 尝试 messageId（格式：fileUuid_msgUuid 或 file-xxx_msgUuid）
  if (messageId) {
    const parts = messageId.split('_');
    if (parts.length >= 2) {
      const msgUuid = parts.slice(1).join('_');
      const found = messages.find(msg =>
        msg.uuid === msgUuid ||
        msg.uuid === messageId ||
        msg.message_uuid === msgUuid
      );
      if (found) return found;
    }
    const byFullId = messages.find(msg => {
      const fullId = `file-${fileIndex}_${msg.uuid}`;
      const altId = `${conversationUuid}_${msg.uuid}`;
      return fullId === messageId || altId === messageId || msg.uuid === messageId;
    });
    if (byFullId) return byFullId;
  }

  // 最后按 index
  if (messageIndex !== undefined && messageIndex !== null) {
    const byIndex = messages.find(msg => msg.index === messageIndex);
    if (byIndex) return byIndex;
    if (messages[messageIndex]) return messages[messageIndex];
  }

  return null;
}

/**
 * 从目标消息沿 parent_uuid 向上追溯，构建到根节点的消息路径
 * @param {Object} targetMessage
 * @param {Array} messages
 * @returns {Array} 从根到目标的有序路径
 */
export function buildMessagePath(targetMessage, messages) {
  const path = [];
  let current = targetMessage;
  const visited = new Set();

  while (current && !visited.has(current.uuid)) {
    visited.add(current.uuid);
    path.unshift(current);
    if (current.parent_uuid) {
      current = messages.find(m => m.uuid === current.parent_uuid);
    } else {
      break;
    }
  }

  return path;
}

/**
 * 根据消息路径计算使目标消息可见所需的完整分支过滤器
 * @param {Object} targetMessage
 * @param {Array} messages
 * @param {{ branchPoints: Map }} branchAnalysis
 * @returns {Map<string, number>}
 */
export function computeBranchFiltersForMessage(targetMessage, messages, branchAnalysis) {
  const messagePath = buildMessagePath(targetMessage, messages);
  const newBranchFilters = new Map();

  for (const [branchPointUuid, branchData] of branchAnalysis.branchPoints) {
    let selectedBranchIndex = 0;

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
}

export { ROOT_UUID };
