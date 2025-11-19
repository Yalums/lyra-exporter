// claudeParser.js
// Claude 平台的解析器和分支检测

import {
  MessageBuilder,
  DateTimeUtils,
  PARSER_CONFIG,
  processContentArray,
  processMessageImages,
  finalizeDisplayText,
  buildMessageMaps,
  markBranchPath,
  extractBranchInfo
} from './helpers.js';

// ==================== Claude 解析器 ====================
export const extractClaudeData = (jsonData) => {
  const title = jsonData.name || "无标题对话";
  const createdAt = DateTimeUtils.formatDateTime(jsonData.created_at);
  const updatedAt = DateTimeUtils.formatDateTime(jsonData.updated_at);
  const model = jsonData.model || "";

  const metaInfo = {
    title,
    created_at: createdAt,
    updated_at: updatedAt,
    project_uuid: jsonData.project_uuid || "",
    uuid: jsonData.uuid || "",
    model: model,
    platform: 'claude',
    has_embedded_images: jsonData._debug_info?.images_processed > 0,
    images_processed: jsonData._debug_info?.images_processed || 0
  };

  const chatHistory = [];
  const messages = jsonData.chat_messages || [];

  messages.forEach((msg, msgIdx) => {
    const sender = msg.sender || "unknown";
    const senderLabel = sender === "human" ? "User" : "Claude";
    const isHuman = sender === "human";

    const messageData = new MessageBuilder(
      msgIdx,
      msg.uuid || "",
      msg.parent_message_uuid || "",
      sender,
      senderLabel,
      DateTimeUtils.formatDateTime(msg.created_at)
    ).build();

    // 处理消息内容
    if (msg.content && Array.isArray(msg.content)) {
      processContentArray(msg.content, messageData, isHuman);
    } else if (msg.text) {
      messageData.raw_text = msg.text;
      messageData.display_text = msg.text;
    }

    // 处理附件
    if (msg.attachments && Array.isArray(msg.attachments)) {
      messageData.attachments = msg.attachments.map(att => ({
        id: att.id || "",
        file_name: att.file_name || "未知文件",
        file_size: att.file_size || 0,
        file_type: att.file_type || "",
        extracted_content: att.extracted_content || "",
        created_at: att.created_at ? DateTimeUtils.formatDateTime(att.created_at) : ""
      }));
    }

    // 处理附件图片
    processMessageImages(msg, messageData);

    // 整理最终显示文本
    finalizeDisplayText(messageData, isHuman);

    chatHistory.push(messageData);
  });

  return {
    meta_info: metaInfo,
    chat_history: chatHistory,
    raw_data: jsonData,
    format: 'claude'
  };
};

// ==================== Claude 分支检测 ====================
export const detectClaudeBranches = (processedData) => {
  if (!processedData?.chat_history) {
    return processedData;
  }

  try {
    const messages = processedData.chat_history;
    const ROOT_UUID = PARSER_CONFIG.ROOT_UUID;
    const { parentChildMap, messageMap } = buildMessageMaps(messages);

    // 标记分支点
    const branchPoints = [];

    parentChildMap.forEach((children, parentUuid) => {
      if (children.length > 1) {
        if (parentUuid === ROOT_UUID) {
          // 根节点有多个子节点，创建虚拟分支点
          branchPoints.push(ROOT_UUID);
        } else if (messageMap.has(parentUuid)) {
          const parentMsg = messageMap.get(parentUuid);
          parentMsg.is_branch_point = true;
          branchPoints.push(parentUuid);
        }
      }
    });

    // 标记分支路径
    const visited = new Set();

    // 找出所有根节点（没有parent或parent为特定根节点UUID）
    const rootMessages = messages.filter(msg =>
      !msg.parent_uuid ||
      msg.parent_uuid === ROOT_UUID ||
      !messageMap.has(msg.parent_uuid)
    );

    if (rootMessages.length === 1) {
      // 只有一个根节点，正常处理
      markBranchPath(rootMessages[0].uuid, 'main', 0, messageMap, parentChildMap, visited);
    } else if (rootMessages.length > 1) {
      // 多个根节点，说明第一条消息就有分支
      rootMessages.forEach((msg, index) => {
        const branchPath = index === 0 ? 'main' : `branch_root_${index}`;
        const branchLevel = index === 0 ? 0 : 1;
        markBranchPath(msg.uuid, branchPath, branchLevel, messageMap, parentChildMap, visited);
      });
    }

    return {
      ...processedData,
      branches: extractBranchInfo(messages),
      branch_points: branchPoints
    };

  } catch (error) {
    console.error("[Claude Parser] 分支检测出错:", error);
    return {
      ...processedData,
      branches: [],
      branch_points: []
    };
  }
};
