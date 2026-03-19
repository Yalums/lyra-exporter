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
  markBranchPath
} from './helpers.js';

// ==================== Claude 解析器 ====================
export const extractClaudeData = (jsonData) => {
  // 调试输出：检查原始数据中的字段
  console.log('[Loominary Parser Debug] Claude - 原始JSON顶层字段:', Object.keys(jsonData));
  console.log('[Loominary Parser Debug] Claude - 原始数据中的关键字段:', {
    organization_id: jsonData.organization_id,
    project_uuid: jsonData.project_uuid,
    project: jsonData.project,
    settings: jsonData.settings
  });

  const title = jsonData.name || "无标题对话";
  const createdAt = DateTimeUtils.formatDateTime(jsonData.created_at);
  const updatedAt = DateTimeUtils.formatDateTime(jsonData.updated_at);
  const model = jsonData.model || "";

  const metaInfo = {
    title,
    created_at: createdAt,
    updated_at: updatedAt,
    project_uuid: jsonData.project_uuid || "",
    organization_id: jsonData.organization_id || "",  // 新增：记录organization_id
    project: jsonData.project || null,  // 新增：记录完整的project对象
    uuid: jsonData.uuid || "",
    model: model,
    platform: 'claude',
    has_embedded_images: jsonData._debug_info?.images_processed > 0,
    images_processed: jsonData._debug_info?.images_processed || 0
  };

  console.log('[Loominary Parser Debug] Claude - 解析后的metaInfo:', {
    organization_id: metaInfo.organization_id,
    project_uuid: metaInfo.project_uuid,
    project: metaInfo.project
  });

  const chatHistory = [];
  const messages = jsonData.chat_messages || [];

  console.log('[Loominary claudeParser] chat_messages count:', messages.length);
  if (messages.length > 0) {
    const firstMsg = messages[0];
    console.log('[Loominary claudeParser] first message keys:', Object.keys(firstMsg));
    console.log('[Loominary claudeParser] first message sender:', firstMsg.sender);
    console.log('[Loominary claudeParser] first message content type:', Array.isArray(firstMsg.content) ? `Array[${firstMsg.content.length}]` : typeof firstMsg.content);
    if (Array.isArray(firstMsg.content) && firstMsg.content.length > 0) {
      console.log('[Loominary claudeParser] first message content[0]:', JSON.stringify(firstMsg.content[0]).substring(0, 200));
    }
    console.log('[Loominary claudeParser] first message has text:', !!firstMsg.text);
  } else {
    console.warn('[Loominary claudeParser] chat_messages is empty! Top-level keys of jsonData:', Object.keys(jsonData));
  }

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
    parentChildMap.forEach((children, parentUuid) => {
      if (children.length > 1) {
        if (parentUuid !== ROOT_UUID && messageMap.has(parentUuid)) {
          messageMap.get(parentUuid).is_branch_point = true;
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

    return processedData;

  } catch (error) {
    console.error("[Claude Parser] 分支检测出错:", error);
    return processedData;
  }
};
