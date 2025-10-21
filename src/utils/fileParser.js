// utils/fileParser.js
// 文件解析相关功能 - 修复版，支持Claude、Gemini/NotebookLM格式

// ==================== 通用工具函数 ====================
// 解析JSONL文本（每行一个JSON对象）
export const parseJSONL = (text) => {
  if (!text) return [];
  return text.split('\n')
    .filter(line => line.trim())
    .map(line => {
      try { return JSON.parse(line); } 
      catch (e) { 
        console.warn('JSONL解析失败:', e.message); 
        return null; 
      }
    })
    .filter(Boolean);
};

// 解析时间戳
export const parseTimestamp = (timestampStr) => {
  if (!timestampStr) return "未知时间";
  
  try {
    const cleanTimestamp = timestampStr
      .replace(/\+.*$/, '')
      .replace('Z', '');
    
    const dt = new Date(cleanTimestamp);
    return dt.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (error) {
    console.error("解析时间戳错误:", error);
    return "未知时间";
  }
};

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// ==================== 格式检测 ====================
export const detectFileFormat = (jsonData) => {
  // JSONL格式检测
  if (Array.isArray(jsonData) && jsonData.length > 0) {
    const first = jsonData[0];
    if (first && typeof first === 'object' && 
        (first.mes || first.swipes || first.chat_metadata)) {
      return 'jsonl_chat';
    }
  }
  
  // Gemini/NotebookLM格式
  if (jsonData?.title && jsonData?.platform && jsonData?.exportedAt && 
      Array.isArray(jsonData.conversation)) {
    return 'gemini_notebooklm';
  }
  
  // Claude完整导出格式
  if (jsonData?.exportedAt && Array.isArray(jsonData.conversations)) {
    return 'claude_full_export';
  }
  
  // Claude单个对话格式
  if (Array.isArray(jsonData.chat_messages)) {
    return 'claude';
  }
  
  return 'unknown';
};

// ==================== 主入口函数 ====================
export const extractChatData = (jsonData, fileName = '') => {
  const format = detectFileFormat(jsonData);
  
  switch (format) {
    case 'claude':
      return extractClaudeData(jsonData);
    case 'gemini_notebooklm':
      return extractGeminiNotebookLMData(jsonData, fileName);
    case 'claude_full_export':
      return extractClaudeFullExportData(jsonData, fileName);
    case 'jsonl_chat':
      return extractJSONLChatData(jsonData, fileName);
    default:
      throw new Error(`不支持的文件格式: ${format}`);
  }
};

// ==================== Claude解析器 ====================
const extractClaudeData = (jsonData) => {
  const title = jsonData.name || "无标题对话";
  const createdAt = parseTimestamp(jsonData.created_at);
  const updatedAt = parseTimestamp(jsonData.updated_at);
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
    const timestamp = parseTimestamp(msg.created_at);

    const messageData = {
      index: msgIdx,
      uuid: msg.uuid || "",
      parent_uuid: msg.parent_message_uuid || "",
      sender,
      sender_label: senderLabel,
      timestamp,
      content_items: [],
      raw_text: "",
      display_text: "",
      thinking: "",
      tools: [],
      artifacts: [],
      citations: [],
      images: [],
      attachments: [], // 添加附件字段
      branch_id: null,
      is_branch_point: false,
      branch_level: 0
    };

    // 处理消息内容
    if (msg.content && Array.isArray(msg.content)) {
      processContentArray(msg.content, messageData, sender === "human");
    } else if (msg.text) {
      messageData.raw_text = msg.text;
      messageData.display_text = msg.text;
    }
    
    // 处理附件
    if (msg.attachments && Array.isArray(msg.attachments)) {
      messageData.attachments = msg.attachments.map(attachment => ({
        id: attachment.id || "",
        file_name: attachment.file_name || "未知文件",
        file_size: attachment.file_size || 0,
        file_type: attachment.file_type || "",
        extracted_content: attachment.extracted_content || "",
        created_at: attachment.created_at ? parseTimestamp(attachment.created_at) : ""
      }));
    }
    
    // 处理附件图片
    processMessageImages(msg, messageData);
    
    // 整理最终显示文本
    finalizeDisplayText(messageData, sender === "human");

    chatHistory.push(messageData);
  });

  return {
    meta_info: metaInfo,
    chat_history: chatHistory,
    raw_data: jsonData,
    format: 'claude'
  };
};

// ==================== Gemini/NotebookLM解析器 ====================
const extractGeminiNotebookLMData = (jsonData, fileName) => {
  const title = jsonData.title || 'AI对话记录';
  const platform = jsonData.platform || 'AI';
  const exportedAt = jsonData.exportedAt ? 
    parseTimestamp(jsonData.exportedAt) : 
    new Date().toLocaleString('zh-CN');
  
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

// ==================== Claude完整导出解析器 ====================
const extractClaudeFullExportData = (jsonData, fileName) => {
  const exportedAt = parseTimestamp(jsonData.exportedAt);
  const conversations = jsonData.conversations || [];
  const totalConversations = jsonData.totalConversations || conversations.length;
  
  const metaInfo = {
    title: `Claude完整导出 (${totalConversations}个对话)`,
    created_at: exportedAt,
    updated_at: exportedAt,
    project_uuid: "",
    uuid: `claude_full_export_${Date.now()}`,
    model: "Claude完整导出",
    platform: 'claude_full_export',
    exportedAt: exportedAt,
    totalConversations: totalConversations,
    includesImages: jsonData.includesImages || false,
    totalImagesProcessed: 0
  };

  const allMessages = [];
  const conversationGroups = {};
  const projectGroups = {};
  let globalMessageIndex = 0;

  conversations.forEach((conversation, convIdx) => {
    const convUuid = conversation.uuid;
    const convName = conversation.name || `对话 ${convIdx + 1}`;
    const projectUuid = conversation.project_uuid || 'no_project';
    const projectName = conversation.project?.name || '无项目';
    
    // 累加图片总数
    if(conversation._debug_info?.images_processed) {
      metaInfo.totalImagesProcessed += conversation._debug_info.images_processed;
    }
    
    // 初始化分组
    if (!conversationGroups[convUuid]) {
      conversationGroups[convUuid] = {
        uuid: convUuid,
        name: convName,
        model: conversation.model,
        created_at: parseTimestamp(conversation.created_at),
        updated_at: parseTimestamp(conversation.updated_at),
        is_starred: conversation.is_starred,
        project: conversation.project,
        messages: [],
        messageCount: 0
      };
    }
    
    if (!projectGroups[projectUuid]) {
      projectGroups[projectUuid] = {
        uuid: projectUuid,
        name: projectName,
        conversations: [],
        messages: [],
        messageCount: 0
      };
    }
    
    // 添加对话分隔标记
    const conversationHeader = {
      index: globalMessageIndex++,
      uuid: `conv_header_${convIdx}`,
      parent_uuid: globalMessageIndex > 1 ? allMessages[allMessages.length - 1].uuid : "",
      sender: "system",
      sender_label: "对话开始",
      timestamp: parseTimestamp(conversation.created_at),
      content_items: [],
      raw_text: `### ${convName} ${conversation.is_starred ? '⭐' : ''}\n\n**模型**: ${conversation.model || '未知'}\n**项目**: ${projectName}\n**创建时间**: ${parseTimestamp(conversation.created_at)}`,
      display_text: `### ${convName} ${conversation.is_starred ? '⭐' : ''}\n\n**模型**: ${conversation.model || '未知'}\n**项目**: ${projectName}\n**创建时间**: ${parseTimestamp(conversation.created_at)}`,
      thinking: "",
      tools: [],
      artifacts: [],
      citations: [],
      images: [],
      branch_id: null,
      is_branch_point: false,
      branch_level: 0,
      conversation_uuid: convUuid,
      project_uuid: projectUuid,
      is_conversation_header: true,
      conversation_name: convName,
      project_name: projectName,
      model: conversation.model,
      is_starred: conversation.is_starred,
      created_at: parseTimestamp(conversation.created_at),
      messageCount: conversation.chat_messages ? conversation.chat_messages.length : 0
    };
    
    allMessages.push(conversationHeader);
    conversationGroups[convUuid].messages.push(conversationHeader);
    projectGroups[projectUuid].messages.push(conversationHeader);
    
    // 处理该对话的所有消息
    if (conversation.chat_messages && Array.isArray(conversation.chat_messages)) {
      const singleConvData = extractClaudeData(conversation);
      singleConvData.chat_history.forEach(msg => {
        const updatedMsg = {
          ...msg,
          index: globalMessageIndex++,
          parent_uuid: msg.parent_uuid || (globalMessageIndex > 1 ? allMessages[allMessages.length - 1].uuid : ""),
          conversation_uuid: convUuid,
          project_uuid: projectUuid,
          conversation_name: convName,
          project_name: projectName
        };
        allMessages.push(updatedMsg);
        conversationGroups[convUuid].messages.push(updatedMsg);
        conversationGroups[convUuid].messageCount++;
        projectGroups[projectUuid].messages.push(updatedMsg);
        projectGroups[projectUuid].messageCount++;
      });
    }
    
    // 将对话添加到项目组
    if (!projectGroups[projectUuid].conversations.find(c => c.uuid === convUuid)) {
      projectGroups[projectUuid].conversations.push(conversationGroups[convUuid]);
    }
  });

  return {
    meta_info: metaInfo,
    chat_history: allMessages,
    raw_data: jsonData,
    format: 'claude_full_export',
    platform: 'claude_full_export',
    views: {
      conversations: conversationGroups,
      projects: projectGroups,
      conversationList: Object.values(conversationGroups),
      projectList: Object.values(projectGroups)
    }
  };
};

// ==================== 辅助函数 ====================

// 创建消息对象
function createMessage(index, uuid, parentUuid, sender, senderLabel, timestamp) {
  return {
    index,
    uuid,
    parent_uuid: parentUuid || "",
    sender,
    sender_label: senderLabel,
    timestamp,
    content_items: [],
    raw_text: "",
    display_text: "",
    thinking: "",
    tools: [],
    artifacts: [],
    citations: [],
    images: [],
    branch_id: null,
    is_branch_point: false,
    branch_level: 0
  };
}

// 处理content数组
function processContentArray(contentArray, messageData, isHumanMessage = false) {
  let displayText = "";

  contentArray.forEach((item, index) => {
    if (!item || typeof item !== 'object') return;
    
    const contentType = item.type || "";
    
    if (contentType === "text") {
      const text = item.text || "";
      messageData.raw_text += text;
      displayText += text;
      
      if (item.citations && Array.isArray(item.citations)) {
        item.citations.forEach(citation => {
          if (citation && typeof citation === 'object') {
            messageData.citations.push(citation);
          }
        });
      }
    }
    else if (contentType === "image") {
      const imageSource = item.source || {};
      const imageInfo = {
        index: messageData.images.length,
        file_name: `image_content_${index}`,
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
    else if (contentType === "thinking") {
      // 人类消息不包含思考过程
      if (!isHumanMessage) {
        messageData.thinking = (item.thinking || "").trim();
      }
    }
    else if (contentType === "tool_use") {
      // 人类消息不包含Artifacts
      if (!isHumanMessage) {
        if (item.name === "artifacts") {
          const artifactData = extractArtifact(item);
          if (artifactData) {
            messageData.artifacts.push(artifactData);
          }
        } else {
          const toolData = extractToolUse(item);
          if (toolData) {
            messageData.tools.push(toolData);
          }
        }
      }
    }
    else if (contentType === "tool_result") {
      const toolResult = extractToolResult(item);
      if (item.name && item.name.includes("artifacts")) {
        if (messageData.artifacts.length > 0) {
          messageData.artifacts[messageData.artifacts.length - 1].result = toolResult;
        }
      } else {
        if (toolResult && messageData.tools.length > 0) {
          messageData.tools[messageData.tools.length - 1].result = toolResult;
        }
      }
    }
  });
  
  messageData.content_items = contentArray;
  messageData.display_text += displayText.trim();
}

// 处理消息中的图片文件
function processMessageImages(message, messageData) {
  const processFiles = (files, version = '') => {
    if (files && Array.isArray(files)) {
      files.forEach((file) => {
        if (file.file_kind === 'image') {
          const imageInfo = {
            index: messageData.images.length,
            file_name: file.file_name || `image_${version}_${messageData.images.length}`,
            file_uuid: file.file_uuid,
            created_at: file.created_at,
            thumbnail_url: file.thumbnail_url,
            preview_url: file.preview_url,
            embedded_image: null,
            display_mode: 'url'
          };
          
          if (file.embedded_image && file.embedded_image.data) {
            imageInfo.embedded_image = file.embedded_image;
            imageInfo.display_mode = 'base64';
          }
          
          messageData.images.push(imageInfo);
        }
      });
    }
  };

  processFiles(message.files, 'v1');
  if (messageData.images.length === 0) {
    processFiles(message.files_v2, 'v2');
  }

  if (message.attachments && Array.isArray(message.attachments)) {
    message.attachments.forEach((attachment) => {
      if (attachment.file_type && attachment.file_type.startsWith('image/')) {
        const imageInfo = {
          index: messageData.images.length,
          file_name: attachment.file_name || `attachment_${messageData.images.length}`,
          file_type: attachment.file_type,
          file_url: attachment.file_url,
          embedded_image: null,
          display_mode: 'url'
        };
        
        if (attachment.embedded_image && attachment.embedded_image.data) {
          imageInfo.embedded_image = attachment.embedded_image;
          imageInfo.display_mode = 'base64';
        }
        
        messageData.images.push(imageInfo);
      }
    });
  }
}

// 处理Gemini格式的图片
function processGeminiImage(imgData, itemIndex, imgIndex, platform) {
  if (typeof imgData === 'string') {
    return {
      index: imgIndex,
      file_name: `${platform}_image_${itemIndex}_${imgIndex}`,
      file_type: imgData.startsWith('data:image/') ? 
        imgData.split(';')[0].replace('data:', '') : 'image/png',
      display_mode: 'base64',
      embedded_image: {
        data: imgData,
        size: 0,
      }
    };
  } else if (typeof imgData === 'object') {
    return {
      index: imgIndex,
      file_name: `${platform}_image_${itemIndex}_${imgIndex}`,
      file_type: imgData.format || 'image/png',
      display_mode: 'base64',
      embedded_image: {
        data: `data:${imgData.format || 'image/png'};base64,${imgData.data}`,
        size: imgData.size || 0,
      },
      original_src: imgData.original_src
    };
  }
  return null;
}

// 生成最终显示文本
function finalizeDisplayText(messageData, isHumanMessage = false) {
  const hasAttachmentImages = messageData.images.some(img => !img.placeholder);
  
  // 添加图片标记
  if (hasAttachmentImages) {
    const imageMarkdown = messageData.images
      .filter(img => !img.placeholder)
      .map((img, idx) => `[图片${idx + 1}: ${img.file_name}]`)
      .join(' ');
      
    if (imageMarkdown) {
      messageData.display_text = `${imageMarkdown}\n\n${messageData.display_text}`.trim();
    }
  }
  
  // 注意：附件信息不再添加到display_text中，而是保留在attachments字段中单独显示
}

// 提取artifact信息
function extractArtifact(artifactItem) {
  try {
    const input = artifactItem.input || {};
    const command = input.command || "";
    
    if (command === "create") {
      return {
        id: input.id || "",
        command,
        type: input.type || "",
        title: input.title || "无标题",
        content: input.content || "",
        language: input.language || "",
        result: null
      };
    } else if (command === "update" || command === "rewrite") {
      return {
        id: input.id || "",
        command,
        old_str: input.old_str || "",
        new_str: input.new_str || "",
        result: null
      };
    }
  } catch (error) {
    console.error("提取artifact时出错:", error);
  }
  return null;
}

// 提取工具使用信息
function extractToolUse(toolItem) {
  const toolData = {
    name: toolItem.name || "unknown",
    input: toolItem.input || {},
    result: null
  };

  if (toolItem.name === "web_search" && toolItem.input?.query) {
    toolData.query = toolItem.input.query;
  }

  return toolData;
}

// 提取工具结果信息
function extractToolResult(resultItem) {
  return {
    name: resultItem.name || "unknown",
    is_error: resultItem.is_error || false,
    content: resultItem.content || []
  };
}

// ==================== 分支检测（简化版） ====================
export const detectBranches = (processedData) => {
  if (!processedData?.chat_history) {
    return processedData;
  }
  
  // 如果是JSONL格式，使用专门的分支检测
  if (processedData.format === 'jsonl_chat') {
    return detectJSONLBranches(processedData);
  }
  
  try {
    const messages = processedData.chat_history;
    const ROOT_UUID = '00000000-0000-4000-8000-000000000000';
    
    // 构建父子关系映射
    const parentChildMap = new Map();
    const messageMap = new Map();
    
    messages.forEach(msg => {
      messageMap.set(msg.uuid, msg);
      const parentUuid = msg.parent_uuid;
      
      if (parentUuid) {
        if (!parentChildMap.has(parentUuid)) {
          parentChildMap.set(parentUuid, []);
        }
        parentChildMap.get(parentUuid).push(msg.uuid);
      }
    });
    
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
    console.error("分支检测出错:", error);
    return {
      ...processedData,
      branches: [],
      branch_points: []
    };
  }
};

// 标记分支路径
function markBranchPath(nodeUuid, branchPath, level, messageMap, parentChildMap, visited) {
  if (visited.has(nodeUuid) || !messageMap.has(nodeUuid)) {
    return;
  }
  
  visited.add(nodeUuid);
  const node = messageMap.get(nodeUuid);
  
  node.branch_id = branchPath;
  node.branch_level = level;
  
  const children = parentChildMap.get(nodeUuid) || [];
  
  if (children.length === 1) {
    markBranchPath(children[0], branchPath, level, messageMap, parentChildMap, visited);
  } else if (children.length > 1) {
    children.forEach((childUuid, index) => {
      const childPath = index === 0 ? branchPath : `${branchPath}.${index}`;
      const childLevel = index === 0 ? level : level + 1;
      markBranchPath(childUuid, childPath, childLevel, messageMap, parentChildMap, visited);
    });
  }
}

// 提取分支信息
function extractBranchInfo(messages) {
  const branches = [];
  const branchGroups = new Map();
  
  messages.forEach(msg => {
    if (msg.branch_id && msg.branch_id !== "main") {
      if (!branchGroups.has(msg.branch_id)) {
        branchGroups.set(msg.branch_id, []);
      }
      branchGroups.get(msg.branch_id).push(msg.uuid);
    }
  });
  
  branchGroups.forEach((uuids, branchId) => {
    branches.push({
      path: branchId,
      level: 0,
      id: branchId,
      messages: uuids
    });
  });
  
  return branches;
}

// ==================== 导出工具函数 ====================
export const getImageDisplayData = (imageInfo) => {
  if (imageInfo.display_mode === 'base64' && imageInfo.embedded_image) {
    return {
      src: imageInfo.embedded_image.data,
      alt: imageInfo.file_name,
      title: `${imageInfo.file_name} (${formatFileSize(imageInfo.embedded_image.size)})`,
      isBase64: true
    };
  }
  return {
    src: imageInfo.preview_url || imageInfo.thumbnail_url || imageInfo.file_url,
    alt: imageInfo.file_name,
    title: imageInfo.file_name,
    isBase64: false
  };
};

// ==================== JSONL/SillyTavern解析器 ====================
const extractJSONLChatData = (jsonData, fileName) => {
  // 检查第一行是否为元数据
  const firstLine = jsonData[0] || {};
  const hasMetadata = firstLine.chat_metadata !== undefined;
  
  const title = hasMetadata && firstLine.character_name ? 
    `与${firstLine.character_name}的对话` : 
    fileName.replace(/\.(jsonl|json)$/i, '') || '聊天记录';
  
  const metaInfo = {
    title,
    created_at: firstLine.create_date || new Date().toLocaleString('zh-CN'),
    updated_at: new Date().toLocaleString('zh-CN'),
    project_uuid: "",
    uuid: `jsonl_${Date.now()}`,
    model: firstLine.character_name || "Chat Bot",
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
function createJSONLMessage(entryIndex, swipeIndex, name, senderLabel, timestamp, isUser, messageText, swipeInfo) {
  const messageData = {
    index: entryIndex * 1000 + swipeIndex, // 确保每个分支有唯一的index
    uuid: `jsonl_${entryIndex}_${swipeIndex}`,
    parent_uuid: entryIndex > 0 ? `jsonl_${entryIndex - 1}_0` : "",
    sender: isUser ? "human" : "assistant",
    sender_label: senderLabel,
    timestamp,
    content_items: [],
    raw_text: messageText,
    display_text: "",
    thinking: "",
    tools: [],
    artifacts: [],
    citations: [],
    images: [],
    attachments: [],
    branch_id: null,
    is_branch_point: false,
    branch_level: 0,
    swipe_info: swipeInfo // 添加swipe信息
  };
  
  // 提取thinking和content
  const { thinking, content } = extractThinkingAndContent(messageText);
  
  messageData.thinking = thinking;
  messageData.display_text = content;
  
  // 如果有swipe信息，添加到display_text前面作为标记
  if (swipeInfo) {
    const branchLabel = swipeInfo.isSelected ? 
      `**[${swipeInfo.swipeIndex + 1}/${swipeInfo.totalSwipes}] 🚩**` :
      `**[${swipeInfo.swipeIndex + 1}/${swipeInfo.totalSwipes}]**`;
    messageData.display_text = `${branchLabel}\n\n${messageData.display_text}`;
  }
  
  return messageData;
}

// 提取thinking标签和content标签的内容
function extractThinkingAndContent(text) {
  if (!text) {
    return { thinking: "", content: "" };
  }
  
  let thinking = "";
  let content = text;
  
  // 提取<thinking>标签内容
  const thinkingMatch = text.match(/<thinking>([\s\S]*?)<\/thinking>/);
  if (thinkingMatch) {
    thinking = thinkingMatch[1].trim();
    // 从原文本中移除thinking标签
    content = text.replace(/<thinking>[\s\S]*?<\/thinking>/, '').trim();
  }
  
  // 提取<content>标签内容
  const contentMatch = content.match(/<content>([\s\S]*?)<\/content>/);
  if (contentMatch) {
    content = contentMatch[1].trim();
  } else {
    // 如果没有content标签，清理其他可能的标签
    content = content
      .replace(/<\/?thinking>/g, '')
      .replace(/<\/?content>/g, '')
      .replace(/<\/?guifan>/g, '')
      .trim();
  }
  
  return { thinking, content };
}

// 简化的JSONL分支检测
export const detectJSONLBranches = (processedData) => {
  if (!processedData?.chat_history || processedData.format !== 'jsonl_chat') {
    return processedData;
  }
  
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
};