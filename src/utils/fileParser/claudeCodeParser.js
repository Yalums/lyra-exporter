// claudeCodeParser.js
// Claude Code (CLI) JSONL 格式的解析器和分支检测

import {
  MessageBuilder,
  DateTimeUtils,
  PlatformUtils,
  buildMessageMaps,
  markBranchPath,
  extractBranchInfo
} from './helpers.js';

// ==================== 格式检测 ====================
// Claude Code JSONL 的特有条目类型（非 user/assistant 消息）
const CLAUDE_CODE_SYSTEM_TYPES = new Set([
  'queue-operation', 'file-history-snapshot', 'progress', 'hook_progress'
]);

export const isClaudeCodeFormat = (jsonArray) => {
  if (!Array.isArray(jsonArray) || jsonArray.length === 0) return false;

  // 检查前 20 个条目，寻找 Claude Code 特征
  const checkCount = Math.min(jsonArray.length, 20);
  let hasClaudeCodeSystemType = false;

  for (let i = 0; i < checkCount; i++) {
    const entry = jsonArray[i];
    if (!entry || typeof entry !== 'object') continue;

    // 特征1：找到带 sessionId + uuid 的 user/assistant 消息
    if (entry.sessionId && entry.uuid &&
        (entry.type === 'user' || entry.type === 'assistant')) {
      return true;
    }

    // 特征2：存在 Claude Code 特有的系统条目类型
    if (entry.sessionId && CLAUDE_CODE_SYSTEM_TYPES.has(entry.type)) {
      hasClaudeCodeSystemType = true;
    }
  }

  // 如果前 20 条中有系统类型但没有 user/assistant，继续扫描找消息条目
  if (hasClaudeCodeSystemType) {
    for (let i = checkCount; i < jsonArray.length; i++) {
      const entry = jsonArray[i];
      if (entry?.sessionId && entry?.uuid &&
          (entry.type === 'user' || entry.type === 'assistant')) {
        return true;
      }
    }
    // 有系统类型但完全没有消息 → 仍然识别为 Claude Code（可能是空会话）
    return true;
  }

  return false;
};

// ==================== 预处理：合并拆分的消息、过滤中断消息 ====================
const preprocessEntries = (rawEntries) => {
  // 第1步：只保留 user/assistant 类型
  const entries = rawEntries.filter(e => e.type === 'user' || e.type === 'assistant');

  // 第2步：构建 uuid → entry 映射
  const uuidMap = new Map();
  entries.forEach(e => uuidMap.set(e.uuid, e));

  // 第3步：识别并合并拆分的 assistant 消息
  // 模式：assistant(thinking only) → assistant(text)，后者 parentUuid 指向前者
  const mergedUuids = new Set(); // 被合并掉的 uuid
  const mergeTargets = new Map(); // 被合并的 uuid → 合并到的目标 uuid

  entries.forEach(entry => {
    if (entry.type !== 'assistant') return;
    const parent = uuidMap.get(entry.parentUuid);
    if (!parent || parent.type !== 'assistant') return;

    // 检查 parent 是否只有 thinking（没有 text）
    const parentContent = parent.message?.content;
    if (!Array.isArray(parentContent)) return;
    const parentHasText = parentContent.some(c => c.type === 'text' && c.text?.trim());
    const parentHasThinking = parentContent.some(c => c.type === 'thinking');
    if (!parentHasThinking || parentHasText) return;

    // 当前条目有 text 内容 → 合并到 parent
    const currentContent = entry.message?.content;
    if (!Array.isArray(currentContent)) return;
    const currentHasText = currentContent.some(c => c.type === 'text' || c.type === 'tool_use');
    if (!currentHasText) return;

    // 执行合并：将 parent 的 thinking 添加到当前条目
    const mergedContent = [...parentContent, ...currentContent];
    entry.message = { ...entry.message, content: mergedContent };
    // 当前条目继承 parent 的 parentUuid
    entry.parentUuid = parent.parentUuid;
    // 如果 parent 有更早的 timestamp，使用它
    if (parent.timestamp && (!entry.timestamp || parent.timestamp < entry.timestamp)) {
      entry._mergedTimestamp = parent.timestamp;
    }

    mergedUuids.add(parent.uuid);
    mergeTargets.set(parent.uuid, entry.uuid);
  });

  // 第4步：过滤 [Request interrupted by user] 消息
  const interruptUuids = new Set();
  const interruptRemap = new Map(); // 被跳过的 uuid → 其 parentUuid

  entries.forEach(entry => {
    if (entry.type !== 'user') return;
    const content = entry.message?.content;
    if (!Array.isArray(content) || content.length !== 1) return;
    if (content[0]?.type === 'text' && content[0]?.text === '[Request interrupted by user]') {
      interruptUuids.add(entry.uuid);
      // 重映射：跳过这条消息，后续子消息应指向它的 parent
      interruptRemap.set(entry.uuid, entry.parentUuid);
    }
  });

  // 第5步：构建最终消息列表
  const result = [];
  entries.forEach(entry => {
    if (mergedUuids.has(entry.uuid)) return; // 已被合并到子条目
    if (interruptUuids.has(entry.uuid)) return; // 是中断消息

    // 修正 parentUuid：如果指向被合并/中断的消息，重新链接
    let parentUuid = entry.parentUuid;
    // 解决合并重映射
    if (parentUuid && mergeTargets.has(parentUuid)) {
      parentUuid = mergeTargets.get(parentUuid);
    }
    // 解决中断消息重映射（可能多层）
    let maxHops = 10;
    while (parentUuid && interruptRemap.has(parentUuid) && maxHops-- > 0) {
      parentUuid = interruptRemap.get(parentUuid);
    }
    entry.parentUuid = parentUuid;

    result.push(entry);
  });

  return result;
};

// ==================== Claude Code 解析器 ====================
export const extractClaudeCodeData = (jsonArray, fileName = '') => {
  const messageEntries = preprocessEntries(jsonArray);

  if (messageEntries.length === 0) {
    throw new Error('[Claude Code Parser] 未找到有效的对话消息');
  }

  // 提取会话元数据
  const firstEntry = messageEntries[0];
  const lastEntry = messageEntries[messageEntries.length - 1];
  const sessionId = firstEntry.sessionId || '';
  const version = firstEntry.version || '';
  const gitBranch = firstEntry.gitBranch || '';
  const cwd = firstEntry.cwd || '';

  const firstAssistant = messageEntries.find(e => e.type === 'assistant');
  const model = firstAssistant?.message?.model || '';

  const title = generateTitle(messageEntries, fileName);

  const createdAt = DateTimeUtils.formatDateTime(firstEntry.timestamp);
  const updatedAt = DateTimeUtils.formatDateTime(lastEntry.timestamp);

  const metaInfo = {
    title,
    created_at: createdAt,
    updated_at: updatedAt,
    project_uuid: '',
    uuid: sessionId || `claude_code_${Date.now()}`,
    model: PlatformUtils.getModelDisplay(model) || model || 'Claude Code',
    platform: 'claude_code',
    has_embedded_images: false,
    images_processed: 0,
    claude_code_info: { version, gitBranch, cwd, sessionId }
  };

  const chatHistory = [];

  messageEntries.forEach((entry, msgIdx) => {
    const msg = entry.message;
    if (!msg) return;

    const sender = msg.role === 'user' ? 'human' : 'assistant';
    const senderLabel = sender === 'human' ? 'User' : 'Claude Code';
    const isHuman = sender === 'human';

    const timestamp = entry._mergedTimestamp || entry.timestamp;

    const messageData = new MessageBuilder(
      msgIdx,
      entry.uuid || `cc_msg_${msgIdx}`,
      entry.parentUuid || '',
      sender,
      senderLabel,
      DateTimeUtils.formatDateTime(timestamp)
    ).build();

    // 处理消息内容
    if (Array.isArray(msg.content)) {
      processClaudeCodeContent(msg.content, messageData, isHuman);
    } else if (typeof msg.content === 'string') {
      messageData.raw_text = msg.content;
      messageData.display_text = msg.content;
    }

    // 跳过无实际内容的助手消息
    if (!isHuman && !messageData.display_text && !messageData.thinking && messageData.tools.length === 0) {
      return;
    }

    chatHistory.push(messageData);
  });

  return {
    meta_info: metaInfo,
    chat_history: chatHistory,
    raw_data: jsonArray,
    format: 'claude_code',
    platform: 'claude_code'
  };
};

// ==================== 处理 Claude Code 消息内容 ====================
const processClaudeCodeContent = (contentArray, messageData, isHuman) => {
  let displayText = '';

  contentArray.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const contentType = item.type || '';

    if (contentType === 'text') {
      const text = item.text || '';
      messageData.raw_text += text;
      displayText += text;
    }
    else if (contentType === 'thinking') {
      if (!isHuman && item.thinking) {
        messageData.thinking = (messageData.thinking ? messageData.thinking + '\n\n' : '') + item.thinking.trim();
      }
    }
    else if (contentType === 'tool_use') {
      messageData.tools.push({
        name: item.name || 'unknown',
        input: item.input || {},
        result: null
      });
    }
    else if (contentType === 'tool_result') {
      const resultContent = Array.isArray(item.content)
        ? item.content.map(c => c.text || '').join('\n')
        : (typeof item.content === 'string' ? item.content : '');

      if (messageData.tools.length > 0) {
        messageData.tools[messageData.tools.length - 1].result = {
          name: item.tool_use_id || 'unknown',
          is_error: item.is_error || false,
          content: resultContent
        };
      }
    }
    else if (contentType === 'image') {
      const imageSource = item.source || {};
      const imageInfo = {
        index: messageData.images.length,
        file_name: `image_${messageData.images.length}`,
        file_type: imageSource.media_type || 'image/jpeg',
        display_mode: 'base64',
        embedded_image: {
          data: `data:${imageSource.media_type};base64,${imageSource.data}`,
          size: imageSource.data ? atob(imageSource.data).length : 0,
        },
        placeholder: ` [图片${messageData.images.length + 1}] `
      };
      messageData.images.push(imageInfo);
      displayText += imageInfo.placeholder;
    }
  });

  messageData.content_items = contentArray;
  messageData.display_text += displayText.trim();
};

// ==================== 生成标题 ====================
const generateTitle = (messageEntries, fileName) => {
  if (fileName) {
    let name = fileName.replace(/\.(jsonl|json)$/i, '');
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(name)) {
      const firstUser = messageEntries.find(e => e.type === 'user');
      if (firstUser?.message?.content) {
        const content = firstUser.message.content;
        const text = Array.isArray(content)
          ? content.find(c => c.type === 'text')?.text || ''
          : (typeof content === 'string' ? content : '');
        if (text) {
          return text.substring(0, 80) + (text.length > 80 ? '...' : '');
        }
      }
      return 'Claude Code Session';
    }
    return name;
  }
  return 'Claude Code Session';
};

// ==================== Claude Code 分支检测 ====================
export const detectClaudeCodeBranches = (processedData) => {
  if (!processedData?.chat_history) {
    return processedData;
  }

  try {
    const messages = processedData.chat_history;
    const { parentChildMap, messageMap } = buildMessageMaps(messages);

    const branchPoints = [];
    parentChildMap.forEach((children, parentUuid) => {
      if (children.length > 1 && messageMap.has(parentUuid)) {
        const parentMsg = messageMap.get(parentUuid);
        parentMsg.is_branch_point = true;
        branchPoints.push(parentUuid);
      }
    });

    const visited = new Set();
    const rootMessages = messages.filter(msg =>
      !msg.parent_uuid || !messageMap.has(msg.parent_uuid)
    );

    if (rootMessages.length === 1) {
      markBranchPath(rootMessages[0].uuid, 'main', 0, messageMap, parentChildMap, visited);
    } else if (rootMessages.length > 1) {
      rootMessages.forEach((msg, index) => {
        const branchPath = index === 0 ? 'main' : `branch_root_${index}`;
        markBranchPath(msg.uuid, branchPath, index === 0 ? 0 : 1, messageMap, parentChildMap, visited);
      });
    }

    messages.forEach(msg => {
      if (!msg.branch_id) {
        msg.branch_id = 'main';
        msg.branch_level = 0;
      }
    });

    return {
      ...processedData,
      branches: extractBranchInfo(messages),
      branch_points: branchPoints
    };
  } catch (error) {
    console.error('[Claude Code Parser] 分支检测出错:', error);
    return {
      ...processedData,
      branches: [],
      branch_points: []
    };
  }
};
