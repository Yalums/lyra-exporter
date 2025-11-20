// otherParsers.js
// Gemini/NotebookLM/JSONL 平台的解析器和分支检测

import {
  MessageBuilder,
  createMessage,
  DateTimeUtils,
  processGeminiImage,
  extractThinkingAndContent,
  PARSER_CONFIG
} from './helpers.js';

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

        // 处理 canvas 内容
        if (assistantVersion.canvas && assistantVersion.canvas.length > 0) {
          assistantMessage.canvas = assistantVersion.canvas;
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

// ==================== JSONL 解析器 ====================
export const extractJSONLData = (jsonData, fileName) => {
  // 检查第一行是否为元数据
  const firstLine = jsonData[0] || {};
  const hasMetadata = firstLine.chat_metadata !== undefined;
  const charName = firstLine.character_name;
  const now = DateTimeUtils.formatDateTime(new Date().toISOString());

  const metaInfo = {
    title: hasMetadata && charName ? `与${charName}的对话` : (fileName.replace(/\.(jsonl|json)$/i, '') || '聊天记录'),
    created_at: firstLine.create_date || now,
    updated_at: now,
    project_uuid: "",
    uuid: `jsonl_${Date.now()}`,
    model: charName || "Chat Bot",
    platform: 'jsonl_chat',
    has_embedded_images: false,
    images_processed: 0
  };

  const chatHistory = [];
  let hasSwipes = false;
  let msgIndex = 0;

  jsonData.forEach((entry, entryIndex) => {
    // 跳过第一行元数据
    if (entryIndex === 0 && hasMetadata) return;
    // 跳过系统消息
    if (entry.is_system) return;

    const name = entry.name || "Unknown";
    const isUser = entry.is_user || false;
    const timestamp = entry.send_date || "";
    const senderLabel = isUser ? "User" : name;

    // 检查swipes（只对AI消息生效）
    const swipes = entry.swipes || [];
    const hasMultipleSwipes = !isUser && swipes.length > 1;
    if (hasMultipleSwipes) hasSwipes = true;

    if (hasMultipleSwipes) {
      const selectedSwipeId = entry.swipe_id !== undefined ? entry.swipe_id : 0;

      swipes.forEach((swipeText, swipeIndex) => {
        const messageData = createJSONLMessage(
          msgIndex++,
          swipeIndex,
          name,
          senderLabel,
          timestamp,
          isUser,
          swipeText,
          {
            totalSwipes: swipes.length,
            isSelected: swipeIndex === selectedSwipeId,
            swipeIndex: swipeIndex
          }
        );
        chatHistory.push(messageData);
      });
    } else {
      const messageText = entry.mes || (swipes.length > 0 ? swipes[0] : "");
      const messageData = createJSONLMessage(
        msgIndex++,
        0,
        name,
        senderLabel,
        timestamp,
        isUser,
        messageText,
        null
      );
      chatHistory.push(messageData);
    }
  });

  return {
    meta_info: metaInfo,
    chat_history: chatHistory,
    raw_data: jsonData,
    format: 'jsonl_chat',
    has_swipes: hasSwipes
  };
};

// 创建JSONL格式的消息对象
const createJSONLMessage = (entryIndex, swipeIndex, name, senderLabel, timestamp, isUser, messageText, swipeInfo) => {
  const messageData = new MessageBuilder(
    entryIndex * 1000 + swipeIndex,
    `jsonl_${entryIndex}_${swipeIndex}`,
    entryIndex > 0 ? `jsonl_${entryIndex - 1}_0` : "",
    isUser ? "human" : "assistant",
    senderLabel,
    timestamp
  ).setContent(messageText).build();

  messageData.swipe_info = swipeInfo;

  // 如果有swipe信息，添加到display_text前面作为标记
  if (swipeInfo) {
    const branchLabel = swipeInfo.isSelected ?
      `**[${swipeInfo.swipeIndex + 1}/${swipeInfo.totalSwipes}] 🚩**` :
      `**[${swipeInfo.swipeIndex + 1}/${swipeInfo.totalSwipes}]**`;
    messageData.display_text = `${branchLabel}\n\n${messageData.display_text}`;
  }

  return messageData;
};

// ==================== 其他平台分支检测 ====================
export const detectOtherBranches = (processedData) => {
  if (!processedData?.chat_history) return processedData;

  // JSONL 分支检测
  if (processedData.format === 'jsonl_chat') {
    const messages = processedData.chat_history;
    messages.forEach(msg => {
      if (msg.swipe_info) {
        msg.branch_id = msg.swipe_info.isSelected ? 'main' : `branch_${msg.index}`;
        msg.branch_level = msg.swipe_info.isSelected ? 0 : 1;
      } else {
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
