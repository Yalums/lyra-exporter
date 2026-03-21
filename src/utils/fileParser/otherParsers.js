// otherParsers.js
// Gemini/NotebookLM/JSONL/Copilot 平台的解析器和分支检测

import {
  MessageBuilder,
  createMessage,
  DateTimeUtils,
  processGeminiImage,
  PARSER_CONFIG
} from './helpers.js';

// ==================== Copilot 解析器 ====================
export const extractCopilotData = (jsonData) => {
  const title = jsonData.title || "无标题对话";
  const exportTime = DateTimeUtils.formatDateTime(jsonData.exportTime);
  const conversationId = jsonData.conversationId || "";

  const metaInfo = {
    title,
    created_at: exportTime,
    updated_at: exportTime,
    uuid: conversationId,
    model: "Copilot",
    platform: 'copilot',
    has_embedded_images: false,
    images_processed: 0
  };

  const chatHistory = [];
  const responses = jsonData.responses || [];

  responses.forEach((msg, msgIdx) => {
    const sender = msg.sender || "unknown";
    const senderLabel = sender === "human" ? "User" : "Copilot";

    const messageData = new MessageBuilder(
      msgIdx,
      `copilot_msg_${msgIdx}`,
      msgIdx > 0 ? `copilot_msg_${msgIdx - 1}` : "",
      sender,
      senderLabel,
      exportTime
    ).build();

    // 处理消息内容
    const messageText = msg.message || "";
    messageData.raw_text = messageText;
    messageData.display_text = messageText;

    chatHistory.push(messageData);
  });

  return {
    meta_info: metaInfo,
    chat_history: chatHistory,
    raw_data: jsonData,
    format: 'copilot',
    platform: 'copilot'
  };
};

// ==================== Gemini/NotebookLM 解析器 ====================
export const extractGeminiData = (jsonData, fileName) => {
  // 检测是否为新的多分支格式
  const isMultiBranchFormat = jsonData.conversation &&
    jsonData.conversation.length > 0 &&
    jsonData.conversation[0].turnIndex !== undefined &&
    jsonData.conversation[0].human?.versions !== undefined;

  if (isMultiBranchFormat) {
    return extractGeminiMultiBranchData(jsonData, fileName);
  }

  // 原有的 Gemini 格式解析逻辑
  const title = jsonData.title || 'AI对话记录';
  const platform = jsonData.platform || 'AI';
  const exportedAt = jsonData.exportedAt ?
    DateTimeUtils.formatDateTime(jsonData.exportedAt) :
    DateTimeUtils.formatDateTime(new Date().toISOString());

  const platformName = platform === 'gemini' ? 'Gemini' :
                      platform === 'notebooklm' ? 'NotebookLM' :
                      platform === 'aistudio' ? 'Google AI Studio' :
                      platform.charAt(0).toUpperCase() + platform.slice(1);

  const metaInfo = {
    title: title,
    created_at: exportedAt,
    updated_at: exportedAt,
    project_uuid: "",
    uuid: `${platform.toLowerCase()}_${Date.now()}`,
    model: platformName,
    platform: platform.toLowerCase(),
    has_embedded_images: false,
    totalImagesProcessed: 0
  };

  const chatHistory = [];
  let messageIndex = 0;

  jsonData.conversation.forEach((item, itemIndex) => {
    // 处理人类消息
    if (item.human) {
      const humanContent = typeof item.human === 'string' ?
        { text: item.human, images: [] } : item.human;

      if (humanContent.text || (humanContent.images && humanContent.images.length > 0)) {
        const humanMessage = createMessage(
          messageIndex++,
          `human_${itemIndex}`,
          messageIndex > 1 ? `assistant_${itemIndex - 1}` : "",
          "human",
          "人类",
          exportedAt
        );

        humanMessage.raw_text = humanContent.text || '';
        humanMessage.display_text = humanContent.text || '';

        // 挂载可选的 Canvas 内容
        if (typeof humanContent.canvas === 'string' && humanContent.canvas.trim()) {
          humanMessage.canvas = humanContent.canvas.trim();
        }

        // 处理图片
        if (humanContent.images && humanContent.images.length > 0) {
          metaInfo.has_embedded_images = true;
          humanContent.images.forEach((imgData, imgIndex) => {
            metaInfo.totalImagesProcessed++;
            const imageInfo = processGeminiImage(imgData, itemIndex, imgIndex, platform);
            if (imageInfo) {
              humanMessage.images.push(imageInfo);
            }
          });

          // 添加图片标记
          if (humanMessage.images.length > 0) {
            const imageMarkdown = humanMessage.images
              .map((img, idx) => `[图片${idx + 1}]`)
              .join(' ');
            humanMessage.display_text = `${imageMarkdown}\n\n${humanMessage.display_text}`.trim();
          }
        }

        chatHistory.push(humanMessage);
      }
    }

    // 处理AI助手消息
    if (item.assistant) {
      const assistantContent = typeof item.assistant === 'string' ?
        { text: item.assistant, images: [] } : item.assistant;

      if (assistantContent.text || (assistantContent.images && assistantContent.images.length > 0)) {
        const assistantMessage = createMessage(
          messageIndex++,
          `assistant_${itemIndex}`,
          `human_${itemIndex}`,
          "assistant",
          platformName,
          exportedAt
        );

        assistantMessage.raw_text = assistantContent.text || '';
        assistantMessage.display_text = assistantContent.text || '';

        // 思考内容
        if (assistantContent.thinking) {
          assistantMessage.thinking = assistantContent.thinking;
        }

        // 挂载可选的 Canvas 内容
        if (typeof assistantContent.canvas === 'string' && assistantContent.canvas.trim()) {
          assistantMessage.canvas = assistantContent.canvas.trim();
        }

        // 处理图片
        if (assistantContent.images && assistantContent.images.length > 0) {
          metaInfo.has_embedded_images = true;
          assistantContent.images.forEach((imgData, imgIndex) => {
            metaInfo.totalImagesProcessed++;
            const imageInfo = processGeminiImage(imgData, itemIndex, imgIndex, platform);
            if (imageInfo) {
              assistantMessage.images.push(imageInfo);
            }
          });

          // 添加图片标记
          if (assistantMessage.images.length > 0) {
            const imageMarkdown = assistantMessage.images
              .map((img, idx) => `[图片${idx + 1}]`)
              .join(' ');
            assistantMessage.display_text = `${imageMarkdown}\n\n${assistantMessage.display_text}`.trim();
          }
        }

        chatHistory.push(assistantMessage);
      }
    }
  });

  return {
    meta_info: metaInfo,
    chat_history: chatHistory,
    raw_data: jsonData,
    format: 'gemini_notebooklm',
    platform: platform.toLowerCase()
  };
};

// ==================== Gemini 多分支格式解析器 ====================
const extractGeminiMultiBranchData = (jsonData, fileName) => {
  const title = jsonData.title || 'AI对话记录';
  const platform = jsonData.platform || 'gemini';
  const exportedAt = jsonData.exportedAt ?
    DateTimeUtils.formatDateTime(jsonData.exportedAt) :
    DateTimeUtils.formatDateTime(new Date().toISOString());

  const platformName = platform === 'gemini' ? 'Gemini' :
                      platform === 'notebooklm' ? 'NotebookLM' :
                      platform === 'aistudio' ? 'Google AI Studio' :
                      platform.charAt(0).toUpperCase() + platform.slice(1);

  const metaInfo = {
    title: title,
    created_at: exportedAt,
    updated_at: exportedAt,
    project_uuid: "",
    uuid: `${platform.toLowerCase()}_${Date.now()}`,
    model: platformName,
    platform: platform.toLowerCase(),
    has_embedded_images: false,
    totalImagesProcessed: 0
  };

  const chatHistory = [];
  let messageIndex = 0;

  // 首先收集每个 turn 的最后一个 assistant version，用于确定下一轮 human 的 parent
  const lastAssistantVersions = {};
  jsonData.conversation.forEach((turn) => {
    if (turn.assistant && turn.assistant.versions && turn.assistant.versions.length > 0) {
      const versions = turn.assistant.versions;
      lastAssistantVersions[turn.turnIndex] = versions[versions.length - 1].version;
    }
  });

  // 遍历每个 turn
  jsonData.conversation.forEach((turn) => {
    const turnIndex = turn.turnIndex;

    // 处理人类消息的所有版本
    if (turn.human && turn.human.versions) {
      turn.human.versions.forEach((humanVersion, versionIdx) => {
        const uuid = `human_${turnIndex}_v${humanVersion.version}`;

        // 确定 parent：指向上一轮的最后一个 assistant version
        // 使用 ROOT_UUID 作为首轮消息的 parent，以便 UI 能够检测首轮分支
        let parentUuid = PARSER_CONFIG.ROOT_UUID;
        if (turnIndex > 0) {
          const prevLastVersion = lastAssistantVersions[turnIndex - 1];
          if (prevLastVersion !== undefined) {
            parentUuid = `assistant_${turnIndex - 1}_v${prevLastVersion}`;
          } else {
            parentUuid = `assistant_${turnIndex - 1}_v0`;
          }
        }

        const humanMessage = createMessage(
          messageIndex++,
          uuid,
          parentUuid,
          "human",
          "人类",
          exportedAt
        );

        humanMessage.raw_text = humanVersion.text || '';
        humanMessage.display_text = humanVersion.text || '';
        humanMessage._version = humanVersion.version;
        humanMessage._version_type = humanVersion.type || 'normal';

        // 处理图片
        if (humanVersion.images && humanVersion.images.length > 0) {
          metaInfo.has_embedded_images = true;
          humanVersion.images.forEach((imgData, imgIndex) => {
            metaInfo.totalImagesProcessed++;
            const imageInfo = processGeminiImage(imgData, turnIndex, imgIndex, platform);
            if (imageInfo) {
              humanMessage.images.push(imageInfo);
            }
          });

          // 添加图片标记
          if (humanMessage.images.length > 0) {
            const imageMarkdown = humanMessage.images
              .map((img, idx) => `[图片${idx + 1}]`)
              .join(' ');
            humanMessage.display_text = `${imageMarkdown}\n\n${humanMessage.display_text}`.trim();
          }
        }

        chatHistory.push(humanMessage);
      });
    }

    // 处理助手消息的所有版本
    if (turn.assistant && turn.assistant.versions) {
      turn.assistant.versions.forEach((assistantVersion, versionIdx) => {
        const uuid = `assistant_${turnIndex}_v${assistantVersion.version}`;
        // assistant 的 parent 是对应的 human version
        const userVersion = assistantVersion.userVersion !== undefined ?
          assistantVersion.userVersion : 0;
        const parentUuid = `human_${turnIndex}_v${userVersion}`;

        const assistantMessage = createMessage(
          messageIndex++,
          uuid,
          parentUuid,
          "assistant",
          platformName,
          exportedAt
        );

        assistantMessage.raw_text = assistantVersion.text || '';
        assistantMessage.display_text = assistantVersion.text || '';
        assistantMessage._version = assistantVersion.version;
        assistantMessage._version_type = assistantVersion.type || 'normal';
        assistantMessage._user_version = userVersion;

        // 思考内容
        if (assistantVersion.thinking) {
          assistantMessage.thinking = assistantVersion.thinking;
        }

        // 处理 canvas 内容
        if (assistantVersion.canvas && assistantVersion.canvas.length > 0) {
          assistantMessage.canvas = assistantVersion.canvas;
        }

        // 处理图片
        if (assistantVersion.images && assistantVersion.images.length > 0) {
          metaInfo.has_embedded_images = true;
          assistantVersion.images.forEach((imgData, imgIndex) => {
            metaInfo.totalImagesProcessed++;
            const imageInfo = processGeminiImage(imgData, turnIndex, imgIndex, platform);
            if (imageInfo) {
              assistantMessage.images.push(imageInfo);
            }
          });

          // 添加图片标记
          if (assistantMessage.images.length > 0) {
            const imageMarkdown = assistantMessage.images
              .map((img, idx) => `[图片${idx + 1}]`)
              .join(' ');
            assistantMessage.display_text = `${imageMarkdown}\n\n${assistantMessage.display_text}`.trim();
          }
        }

        chatHistory.push(assistantMessage);
      });
    }
  });

  return {
    meta_info: metaInfo,
    chat_history: chatHistory,
    raw_data: jsonData,
    format: 'gemini_notebooklm',
    platform: platform.toLowerCase()
  };
};

// ==================== JSONL 多文件合并工具 ====================

// 简单哈希函数，用于生成消息指纹
const simpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
};

// 生成消息指纹，用于识别相同消息（不包含时间戳，避免导出时间差异导致误判）
const generateMessageFingerprint = (entry) => {
  const content = entry.mes || (entry.swipes?.[0] || "");
  const sender = entry.name || "";
  const isUser = entry.is_user || false;
  // 只用 sender + isUser + content 来识别消息，移除时间戳
  return `${sender}|${isUser}|${simpleHash(content)}`;
};

// ==================== 消息图节点类 ====================
class MessageNode {
  constructor(fingerprint, entry) {
    this.fingerprint = fingerprint;  // 消息指纹
    this.entry = entry;              // 原始消息数据
    this.parents = new Set();        // 父节点指纹集合（可能有多个来自不同文件）
    this.children = new Set();       // 子节点指纹集合
    this.fileIndices = new Set();    // 包含此消息的文件索引
    this.isRoot = false;             // 是否是某个文件的根消息
  }
}

// ==================== 基于内容匹配的多文件合并器 ====================
class JSONLMerger {
  constructor() {
    this.nodeMap = new Map();        // fingerprint -> MessageNode
    this.rootFingerprints = new Set(); // 根消息的指纹集合
  }

  // 添加文件到消息图
  addFile(messages, fileIndex) {
    let prevFingerprint = null;

    for (const entry of messages) {
      if (entry.is_system) continue;

      const fp = generateMessageFingerprint(entry);

      // 查找或创建节点
      if (!this.nodeMap.has(fp)) {
        this.nodeMap.set(fp, new MessageNode(fp, entry));
      }

      const node = this.nodeMap.get(fp);
      node.fileIndices.add(fileIndex);

      // 建立父子关系
      if (prevFingerprint) {
        node.parents.add(prevFingerprint);
        const parentNode = this.nodeMap.get(prevFingerprint);
        if (parentNode) {
          parentNode.children.add(fp);
        }
      } else {
        // 这是该文件的第一条消息
        node.isRoot = true;
        this.rootFingerprints.add(fp);
      }

      prevFingerprint = fp;
    }
  }

  // 查找真正的根节点（没有父节点，或者父节点不在图中的节点）
  findTrueRoots() {
    const trueRoots = new Set();

    for (const [fp, node] of this.nodeMap) {
      // 检查是否有有效的父节点
      let hasValidParent = false;
      for (const parentFp of node.parents) {
        if (this.nodeMap.has(parentFp)) {
          hasValidParent = true;
          break;
        }
      }

      if (!hasValidParent) {
        trueRoots.add(fp);
      }
    }

    return trueRoots;
  }

  // 生成 chatHistory
  generateChatHistory() {
    const chatHistory = [];
    let msgIndex = 0;
    let branchCounter = 0;
    const visited = new Set();
    const fpToUuid = new Map(); // fingerprint -> generated uuid

    // 找到真正的根节点
    const trueRoots = this.findTrueRoots();

    // DFS 遍历
    // siblingEmittedSwipes: 兄弟节点共享的已发出 swipe 文本集合，用于跨节点去重
    const traverse = (fingerprint, parentUuid, branchId, branchLevel, siblingEmittedSwipes) => {
      if (visited.has(fingerprint)) {
        // 已访问过，返回已生成的 uuid
        return fpToUuid.get(fingerprint);
      }

      visited.add(fingerprint);
      const node = this.nodeMap.get(fingerprint);
      if (!node) return null;

      const entry = node.entry;
      const name = entry.name || "Unknown";
      const isUser = entry.is_user || false;
      const timestamp = entry.send_date || "";
      const senderLabel = isUser ? "User" : name;

      // 检查当前消息是否是分支点（有多个子节点）
      const isBranchPoint = node.children.size > 1;

      // 处理 swipes - 展开为真正的分支
      const swipes = entry.swipes || [];
      const messageText = entry.mes || (swipes[0] || "");
      const hasMultipleSwipes = !isUser && swipes.length > 1;

      let currentUuid;

      if (hasMultipleSwipes) {
        const selectedSwipeId = entry.swipe_id !== undefined ? entry.swipe_id : 0;

        // 所有 swipes 都指向同一个 parent，形成真正的分支结构
        swipes.forEach((swipeText, swipeIndex) => {
          // 跨兄弟节点 swipe 去重：跳过已被兄弟节点发出的非选中重复 swipe
          if (siblingEmittedSwipes && swipeIndex !== selectedSwipeId && siblingEmittedSwipes.has(swipeText)) {
            return;
          }
          if (siblingEmittedSwipes) {
            siblingEmittedSwipes.add(swipeText);
          }

          // 每个 swipe 创建独立的分支（除了第一个保持当前分支）
          let swipeBranchId = branchId;
          let swipeBranchLevel = branchLevel;

          if (swipeIndex > 0) {
            branchCounter++;
            swipeBranchId = `branch_${branchCounter}`;
            swipeBranchLevel = branchLevel + 1;
          }

          // 每个 swipe 分配唯一的 msgIndex，确保 MessageDetail 能正确定位
          const swipeMsgIndex = msgIndex;
          msgIndex++;

          const uuid = `jsonl_${swipeBranchId}_${swipeMsgIndex}_0`;

          // 关键：被选中的 swipe 设置为 currentUuid，这样后续消息才能正确链接到选中的分支
          // 而不是始终链接到 swipes[0]
          if (swipeIndex === selectedSwipeId) {
            currentUuid = uuid;
            fpToUuid.set(fingerprint, uuid);
          }

          const msg = this.createMessage(
            swipeMsgIndex,
            uuid,
            parentUuid,  // 所有 swipes 都指向同一个 parent
            name,
            senderLabel,
            timestamp,
            isUser,
            swipeText,
            swipeBranchId,
            swipeBranchLevel,
            {
              totalSwipes: swipes.length,
              isSelected: swipeIndex === selectedSwipeId,
              swipeIndex: swipeIndex
            }
          );

          // swipes 的父节点是分支点
          if (swipeIndex === 0 && (isBranchPoint || swipes.length > 1)) {
            msg.is_branch_point = true;
          }

          // 提取 SillyTavern 的 extra.reasoning（每个 swipe 独立的思考过程）
          const swipeReasoning = entry.swipe_info?.[swipeIndex]?.extra?.reasoning;
          if (swipeReasoning) {
            msg.thinking = swipeReasoning;
          }

          // 提取每条 swipe 对应的模型 ID（用于图标显示）
          const swipeModel = entry.swipe_info?.[swipeIndex]?.extra?.model || entry.extra?.model;
          if (swipeModel) {
            msg.model_id = swipeModel;
          }

          chatHistory.push(msg);
        });
      } else {
        currentUuid = `jsonl_${branchId}_${msgIndex}_0`;
        fpToUuid.set(fingerprint, currentUuid);

        const msg = this.createMessage(
          msgIndex,
          currentUuid,
          parentUuid,
          name,
          senderLabel,
          timestamp,
          isUser,
          messageText,
          branchId,
          branchLevel,
          null
        );

        if (isBranchPoint) {
          msg.is_branch_point = true;
        }

        // 提取 SillyTavern 的 extra.reasoning（非 swipe 消息的思考过程）
        if (entry.extra?.reasoning) {
          msg.thinking = entry.extra.reasoning;
        }

        // 提取当前消息的模型 ID（用于图标显示）
        if (entry.extra?.model) {
          msg.model_id = entry.extra.model;
        }

        chatHistory.push(msg);
        msgIndex++;
      }

      // 递归处理子节点
      const childFingerprints = Array.from(node.children);
      // 创建共享 swipe 去重集合，传递给同一父节点的所有子节点
      const childSharedSwipes = new Set();
      childFingerprints.forEach((childFp, childIndex) => {
        let childBranchId = branchId;
        let childBranchLevel = branchLevel;

        // 如果有多个子节点，非第一个子节点创建新分支
        if (childFingerprints.length > 1 && childIndex > 0) {
          branchCounter++;
          childBranchId = `branch_${branchCounter}`;
          childBranchLevel = branchLevel + 1;
        }

        traverse(childFp, currentUuid, childBranchId, childBranchLevel, childSharedSwipes);
      });

      return currentUuid;
    };

    // 从所有真正的根节点开始遍历
    const rootFps = Array.from(trueRoots);
    rootFps.forEach((rootFp, rootIndex) => {
      let rootBranchId = 'main';
      let rootBranchLevel = 0;

      // 如果有多个根节点，非第一个根节点创建新分支
      if (rootFps.length > 1 && rootIndex > 0) {
        branchCounter++;
        rootBranchId = `branch_${branchCounter}`;
        rootBranchLevel = 1;
      }

      traverse(rootFp, PARSER_CONFIG.ROOT_UUID, rootBranchId, rootBranchLevel);
    });

    return chatHistory;
  }

  createMessage(msgIndex, uuid, parentUuid, name, senderLabel, timestamp, isUser, messageText, branchId, branchLevel, swipeInfo) {
    const messageData = new MessageBuilder(
      msgIndex,
      uuid,
      parentUuid,
      isUser ? "human" : "assistant",
      senderLabel,
      timestamp
    ).setContent(messageText).build();

    messageData.branch_id = branchId;
    messageData.branch_level = branchLevel;
    messageData.swipe_info = swipeInfo;

    // swipes 现在是真正的分支，不再需要 [1/6] 标记

    return messageData;
  }
}

/**
 * 合并多个 JSONL 文件为树状分支结构
 * 使用消息图自动识别公共消息序列，避免重复
 * 单文件也使用此逻辑，统一 swipes 分支处理
 * @param {Array} filesData - [{data: [], fileName: string}, ...]
 * @returns {Object} 合并后的数据结构，包含 chatHistory 和 metadata
 */
export const mergeJSONLFiles = (filesData) => {
  if (!filesData || filesData.length === 0) {
    return { chatHistory: [], metadata: { totalFiles: 0 } };
  }

  // 提取元数据信息
  const firstFileData = filesData[0];
  const hasMetadata = firstFileData.data[0]?.chat_metadata !== undefined;
  const charName = firstFileData.data[0]?.character_name;

  // 创建合并器（单文件和多文件统一使用）
  const merger = new JSONLMerger();

  // 将所有文件添加到消息图
  filesData.forEach((fileData, fileIndex) => {
    const fileHasMetadata = fileData.data[0]?.chat_metadata !== undefined;
    const messages = fileHasMetadata ? fileData.data.slice(1) : fileData.data;
    merger.addFile(messages, fileIndex);
  });

  // 生成合并后的 chatHistory
  const chatHistory = merger.generateChatHistory();

  return {
    chatHistory,
    metadata: {
      totalFiles: filesData.length,
      fileNames: filesData.map(f => f.fileName),
      mainFile: firstFileData.fileName,
      branchFiles: filesData.slice(1).map(f => f.fileName),
      characterName: charName,
      hasMetadata,
      isSingleFile: filesData.length === 1
    }
  };
};

/**
 * 提取合并后的 JSONL 数据
 * 单文件和多文件统一使用消息图合并器处理
 * @param {Array} filesData - [{data: [], fileName: string}, ...]
 * @returns {Object} 标准的 processedData 格式
 */
export const extractMergedJSONLData = (filesData) => {
  const mergeResult = mergeJSONLFiles(filesData);
  const { chatHistory, metadata } = mergeResult;
  const now = DateTimeUtils.formatDateTime(new Date().toISOString());

  // 根据是否为单文件生成不同的标题
  const title = metadata.isSingleFile
    ? (metadata.characterName ? `与${metadata.characterName}的对话` : (filesData[0]?.fileName?.replace(/\.(jsonl|json)$/i, '') || '聊天记录'))
    : (metadata.characterName
      ? `与${metadata.characterName}的对话 (合并${metadata.totalFiles}个文件)`
      : `合并对话 (${metadata.totalFiles}个文件)`);

  const metaInfo = {
    title,
    created_at: now,
    updated_at: now,
    project_uuid: "",
    uuid: `jsonl_${metadata.isSingleFile ? '' : 'merged_'}${Date.now()}`,
    model: metadata.characterName || "Chat Bot",
    platform: 'jsonl_chat',
    has_embedded_images: false,
    images_processed: 0,
    merge_info: metadata.isSingleFile ? null : {
      source_files: metadata.fileNames,
      main_file: metadata.mainFile,
      branch_files: metadata.branchFiles,
      total_files: metadata.totalFiles
    }
  };

  return {
    meta_info: metaInfo,
    chat_history: chatHistory,
    raw_data: filesData.map(f => f.data),
    format: 'jsonl_chat',
    has_swipes: chatHistory.some(m => m.swipe_info),
    is_merged: !metadata.isSingleFile
  };
};

// ==================== 其他平台分支检测 ====================
export const detectOtherBranches = (processedData) => {
  if (!processedData?.chat_history) return processedData;

  // JSONL 分支信息已在 JSONLMerger 中设置，这里只检查是否需要补充默认值
  if (processedData.format === 'jsonl_chat') {
    const messages = processedData.chat_history;
    messages.forEach(msg => {
      // 只为没有 branch_id 的消息设置默认值
      if (!msg.branch_id) {
        msg.branch_id = 'main';
        msg.branch_level = 0;
      }
    });
    return processedData;
  }

  // Gemini 多分支格式检测（realtime 模式）
  if (processedData.format === 'gemini_notebooklm') {
    const messages = processedData.chat_history;

    // 检查是否有版本信息（多分支格式的标志）
    const hasVersionInfo = messages.some(msg => msg._version !== undefined);

    if (hasVersionInfo) {
      messages.forEach(msg => {
        const version = msg._version || 0;
        const versionType = msg._version_type || 'normal';

        // version 0 且 type 为 normal 的是主分支
        // edit/retry 类型或 version > 0 的是分支
        if (version === 0 && versionType === 'normal') {
          msg.branch_id = 'main';
          msg.branch_level = 0;
        } else {
          // 根据 userVersion 确定分支层级
          const userVersion = msg._user_version !== undefined ? msg._user_version : 0;
          msg.branch_id = `branch_v${version}_uv${userVersion}`;
          msg.branch_level = version > 0 ? version : 1;
        }
      });
    } else {
      // 普通 Gemini 格式，所有消息都是主分支
      messages.forEach(msg => {
        msg.branch_id = 'main';
        msg.branch_level = 0;
      });
    }

    return processedData;
  }

  // 其他格式默认处理
  return processedData;
};
