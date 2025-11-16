// utils/fileParser.js
// 集成文件解析和通用工具函数

// ==================== 通用工具函数模块 ====================

/**
 * 获取当前语言设置
 */
const getCurrentLocale = () => {
  try {
    const saved = localStorage.getItem('lyra_exporter_language') || 'en';
    if (saved === 'zh') {
      const browserLang = navigator.language || navigator.userLanguage || '';
      const lowerLang = browserLang.toLowerCase();
      if (lowerLang.includes('tw') || lowerLang.includes('hk') ||
          lowerLang.includes('mo') || lowerLang.includes('hant')) {
        return 'zh-TW';
      }
      return 'zh-CN';
    }
    return saved;
  } catch {
    return 'en';
  }
};

// ==================== 日期时间工具 ====================
export const DateTimeUtils = {
  formatDate(dateStr) {
    if (!dateStr) {
      const locale = getCurrentLocale();
      return locale.startsWith('zh') ? '未知时间' : 'Unknown time';
    }
    try {
      const date = new Date(dateStr);
      const locale = getCurrentLocale();
      return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  },

  formatTime(timestamp) {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      const locale = getCurrentLocale();
      return date.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return timestamp;
    }
  },

  formatDateTime(timestamp) {
    if (!timestamp) {
      const locale = getCurrentLocale();
      return locale.startsWith('zh') ? '未知时间' : 'Unknown time';
    }
    try {
      const date = new Date(timestamp);
      const locale = getCurrentLocale();
      return date.toLocaleString(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return timestamp;
    }
  },

  getCurrentDate() {
    return new Date().toISOString().split('T')[0];
  },

  toISODate(dateStr) {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toISOString().split('T')[0];
    } catch {
      return '';
    }
  }
};

// ==================== 平台和模型工具 ====================
export const PlatformUtils = {
  getModelDisplay(model) {
    if (!model || model === '未知模型') return 'Claude Sonnet';
    const modelMap = {
      'opus-4': 'Claude Opus 4',
      'opus4': 'Claude Opus 4',
      'claude-3-opus': 'Claude Opus 3',
      'opus-3': 'Claude Opus 3',
      'opus3': 'Claude Opus 3',
      'sonnet-4': 'Claude Sonnet 4',
      'sonnet4': 'Claude Sonnet 4',
      'haiku': 'Claude Haiku'
    };
    for (const [key, value] of Object.entries(modelMap)) {
      if (model.includes(key)) return value;
    }
    return model;
  },

  getPlatformName(platform) {
    const platformMap = {
      'gemini': 'Gemini',
      'notebooklm': 'NotebookLM',
      'aistudio': 'Google AI Studio',
      'claude': 'Claude',
      'jsonl_chat': 'SillyTavern',
      'chatgpt': 'ChatGPT'
    };
    return platformMap[platform?.toLowerCase()] || 'Claude';
  },

  getPlatformClass(platform) {
    const classMap = {
      'gemini': 'platform-gemini',
      'google ai studio': 'platform-gemini',
      'aistudio': 'platform-gemini',
      'notebooklm': 'platform-notebooklm',
      'jsonl_chat': 'platform-jsonl',
      'chatgpt': 'platform-chatgpt'
    };
    return classMap[platform?.toLowerCase()] || 'platform-claude';
  },

  getFormatFromPlatform(platform) {
    const formatMap = {
      'gemini': 'gemini_notebooklm',
      'google ai studio': 'gemini_notebooklm',
      'aistudio': 'gemini_notebooklm',
      'notebooklm': 'gemini_notebooklm',
      'chatgpt': 'chatgpt'
    };
    return formatMap[platform?.toLowerCase()] || 'claude';
  }
};

// ==================== 文件操作工具 ====================
export const FileUtils = {
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  getFileTypeText(format, platform, model) {
    const locale = getCurrentLocale();
    const isChinese = locale.startsWith('zh');
    switch (format) {
      case 'claude':
        return PlatformUtils.getModelDisplay(model);
      case 'claude_conversations':
        return isChinese ? '对话列表' : 'Conversation List';
      case 'claude_full_export':
        return isChinese ? '完整导出' : 'Full Export';
      case 'gemini_notebooklm':
        if (platform === 'notebooklm') return 'NotebookLM';
        if (platform === 'aistudio') return 'Google AI Studio';
        return 'Gemini';
      case 'jsonl_chat':
        return isChinese ? 'SillyTavern' : 'JSONL Chat';
      case 'chatgpt':
        return 'ChatGPT';
      default:
        return isChinese ? '未知格式' : 'Unknown Format';
    }
  }
};

// 导出 formatFileSize 供外部使用
export const formatFileSize = FileUtils.formatFileSize;

// ==================== 文本处理工具 ====================
export const TextUtils = {
  filterImageReferences(text) {
    if (!text) return '';
    return text
      .replace(/\[(?:图片|附件|图像|image|attachment)\d*\s*[:：]\s*[^\]]+\]/gi, '')
      .replace(/\[(?:图片|附件|图像|image|attachment)\d+\]/gi, '')
      .replace(/\[图片[1-5]\]/gi, '')
      .trim();
  },

  getPreview(text, maxLength = 200) {
    if (!text) return '';
    const filteredText = this.filterImageReferences(text);
    if (filteredText.length <= maxLength) return filteredText;
    return filteredText.substring(0, maxLength) + '...';
  }
};

// ==================== 文件解析专用函数 ====================

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

export const parseTimestamp = (timestampStr) => {
  if (!timestampStr) return "未知时间";
  try {
    const cleanTimestamp = timestampStr.replace(/\+.*$/, '').replace('Z', '');
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

// 过滤citations,移除文件引用
const filterCitations = (citations) => {
  if (!Array.isArray(citations)) return [];
  return citations.filter((cit) => {
    if (!cit || typeof cit !== 'object') return false;
    const meta = cit.metadata || {};
    return meta.type !== 'file' && meta.source !== 'my_files';
  });
};

// 处理附件
const processAttachments = (attachments) => {
  if (!Array.isArray(attachments)) return [];
  return attachments.map(att => ({
    id: att.id || '',
    file_name: att.name || att.file_name || '未知文件',
    file_size: att.size || att.file_size || 0,
    file_type: att.mimeType || att.mime_type || att.file_type || '',
    extracted_content: att.extractedContent || att.extracted_content || '',
    link: att.link || att.url || att.download_url || att.href || '',
    has_link: !!(att.link || att.url || att.download_url || att.href)
  }));
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

  // Claude单个对话格式
  if (Array.isArray(jsonData.chat_messages)) {
    return 'claude';
  }

  // ChatGPT导出格式
  // ChatGPT 会话导出通常包含 mapping、current_node 等字段，mapping 是一个对象，current_node 指向当前节点。
  if (jsonData && typeof jsonData === 'object' && jsonData.mapping && typeof jsonData.mapping === 'object' && jsonData.current_node) {
    return 'chatgpt';
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
    case 'jsonl_chat':
      return extractJSONLChatData(jsonData, fileName);
    case 'chatgpt':
      return extractChatGPTData(jsonData, fileName);
    default:
      throw new Error(`不支持的文件格式: ${format}`);
  }
};

// ==================== ChatGPT 解析器 ====================
/**
 * 解析 ChatGPT 对话导出格式
 * ChatGPT 导出包含 mapping 字典，每个节点包含 message 数据以及父子关系。
 * @param {Object} jsonData - ChatGPT 导出的原始 JSON
 * @param {String} fileName - 文件名，用于默认标题
 */
const extractChatGPTData = (jsonData, fileName = '') => {
  try {
    const title = jsonData.title || fileName.replace(/\.(jsonl|json)$/i, '') || 'ChatGPT 对话';
    const createdAt = jsonData.create_time ? parseTimestamp(new Date(jsonData.create_time * 1000).toISOString()) : new Date().toLocaleString('zh-CN');

    const metaInfo = {
      title,
      created_at: createdAt,
      updated_at: jsonData.update_time ? parseTimestamp(new Date(jsonData.update_time * 1000).toISOString()) : createdAt,
      project_uuid: '',
      uuid: jsonData.conversation_id || jsonData.id || '',
      model: jsonData.default_model_slug || '',
      platform: 'chatgpt',
      has_embedded_images: false,
      images_processed: 0
    };

    const chatHistory = [];
    let messageIndex = 0;

    // 定义一个统一的根UUID，用于挂接首轮分支的根节点
    const ROOT_UUID = '00000000-0000-4000-8000-000000000000';

    // 保存 nodeId 到消息对象的映射，便于设置 parent_uuid
    const nodeIdToMessage = new Map();
    let lastUserMessage = null;

    const mapping = jsonData.mapping || {};

    // 用于缓存当前助手消息的思考内容和工具调用
    let pendingThinking = '';
    let pendingTools = [];
    // 用于缓存assistant消息的推理概要内容（reasoning_recap）。
    // reasoning_recap 通常只是表示“已思考X秒”等信息，不应该单独生成消息，否则会导致分支预览显示该概要内容。
    // 我们在生成最终输出消息时，将其作为前缀添加到display_text中。
    let pendingRecap = '';

    // 用于缓存由工具产生的附件。这些附件应在下一条助手最终输出消息上附加。
    // 部分工具（如 python_user_visible、web.run 等）会在 tool 消息的 metadata.attachments 中提供文件列表。
    let pendingAttachments = [];

    /**
     * 寻找某节点祖先链上最近的已生成消息，用于确定 parent_uuid
     * @param {string} parentId - 当前节点的父 nodeId
     * @returns {string} 消息的 uuid，如果不存在则返回空字符串
     */
    const findNearestMessageUuid = (parentId) => {
      let currentId = parentId;
      while (currentId) {
        if (nodeIdToMessage.has(currentId)) {
          return nodeIdToMessage.get(currentId).uuid;
        }
        const parentNode = mapping[currentId];
        currentId = parentNode && parentNode.parent ? parentNode.parent : null;
      }
      return '';
    };

    // 找出所有根节点（没有 parent 或 parent 不存在于 mapping 中）
    const rootNodeIds = [];
    for (const nodeId in mapping) {
      const node = mapping[nodeId];
      if (!node || !node.parent || !(node.parent in mapping)) {
        rootNodeIds.push(nodeId);
      }
    }

    /**
     * 解析助手的 "code" 类消息，将其转换为工具调用对象
     * @param {object} msg - 节点的 message 对象
     * @returns {object|null} 工具调用对象，或 null
     */
    const parseToolFromCode = (msg) => {
      const content = msg.content || {};
      // 尝试从 metadata.search_queries 或 content.text 中提取
      const metadata = msg.metadata || {};
      if (metadata.search_queries && Array.isArray(metadata.search_queries) && metadata.search_queries.length > 0) {
        return {
          name: 'search',
          input: metadata.search_queries.map(q => ({ q: q.q || q })),
          result: null
        };
      }
      const text = content.text || (Array.isArray(content.parts) ? content.parts.join('') : '');
      if (text) {
        try {
          const obj = JSON.parse(text);
          return {
            name: 'search',
            input: obj.search_query || obj.query || obj,
            result: null
          };
        } catch (e) {
          return {
            name: 'code',
            input: text,
            result: null
          };
        }
      }
      return null;
    };

    // 递归遍历节点，深度优先
    const traverse = (nodeId) => {
      const node = mapping[nodeId];
      if (!node) return;
      const msg = node.message;

      // 当 message 存在时才处理消息内容，但无论如何都要遍历子节点
      if (msg) {
        const author = msg.author || {};
        const role = author.role;
        const metadata = msg.metadata || {};

        // 如果该消息被标记为对话中隐藏，则跳过对话解析，但仍需遍历子节点
        if (metadata && metadata.is_visually_hidden_from_conversation) {
          if (node.children && Array.isArray(node.children)) {
            node.children.forEach(childId => traverse(childId));
          }
          return;
        }

        // === 系统消息：用于把附件附加到最近的用户消息 ===
        if (role === 'system') {
          if (!metadata?.is_visually_hidden_from_conversation && Array.isArray(metadata?.attachments) && lastUserMessage) {
            processAttachments(metadata.attachments).forEach(att => {
              lastUserMessage.attachments.push(att);
            });
          }
        }
        // === 用户消息 ===
        else if (role === 'user') {
          // 新一轮用户消息开始，重置 pendingThinking、pendingTools、pendingRecap
          pendingThinking = '';
          pendingTools = [];
          pendingRecap = '';

          const uuid = msg.id || nodeId;
          let parentUuid = findNearestMessageUuid(node.parent);
          if (!parentUuid) parentUuid = ROOT_UUID;
          const timestamp = msg.create_time ? parseTimestamp(new Date(msg.create_time * 1000).toISOString()) : '';

          // 处理用户文本内容
          const content = msg.content || {};
          const contentType = content.content_type || '';
          let rawText = '';
          if (contentType === 'text') {
            rawText = Array.isArray(content.parts) ? content.parts.join('') : (content.content || '');
          } else {
            rawText = content.content || (Array.isArray(content.parts) ? content.parts.join('') : '');
          }

          const messageData = new MessageBuilder(messageIndex++, uuid, parentUuid, 'human', 'User', timestamp)
            .setContent(rawText)
            .addCitations(metadata)
            .addAttachments(metadata)
            .finalize(true);

          messageData._node_id = nodeId;
          chatHistory.push(messageData);
          nodeIdToMessage.set(nodeId, messageData);
          lastUserMessage = messageData;
        }
        // === 助手消息 ===
        else if (role === 'assistant') {
          const content = msg.content || {};
          const contentType = content.content_type || '';

          // 遇到 model_editable_context：重置 pending 状态并跳过生成
          if (contentType === 'model_editable_context') {
            pendingThinking = '';
            pendingTools = [];
            pendingRecap = '';
          }
          // 累积思考内容
          else if (contentType === 'thoughts' && content.thoughts) {
            const joined = content.thoughts.map(th => {
              let s = '';
              if (th.summary) s += th.summary + '\n';
              if (th.content) s += th.content;
              return s.trim();
            }).join('\n\n');
            pendingThinking = pendingThinking ? pendingThinking + '\n\n' + joined : joined;
          }
          // code: 可能是工具调用
          else if (contentType === 'code') {
            const tool = parseToolFromCode(msg);
            if (tool) {
              pendingTools.push(tool);
            }
          }
          // 工具结果：tether_browsing_search_result 或 tool_result
          else if (contentType === 'tether_browsing_search_result' || contentType === 'tool_result') {
            try {
              const resultObj = typeof content === 'object' ? content : {};
              if (pendingTools.length > 0) {
                pendingTools[pendingTools.length - 1].result = resultObj;
              } else {
                pendingTools.push({ name: 'tool', input: {}, result: resultObj });
              }
            } catch (e) {
              // 忽略错误
            }
          }
          // reasoning_recap：保存到 pendingRecap，不生成单独消息
          else if (contentType === 'reasoning_recap') {
            let recapText = '';
            if (Array.isArray(content.parts)) {
              recapText = content.parts.join('');
            } else if (typeof content.content === 'string') {
              recapText = content.content;
            } else if (content.text) {
              recapText = content.text;
            }
            pendingRecap = recapText.trim();
          }
          // 其他：当成最终输出生成一条助手消息
          else {
            const uuid = msg.id || nodeId;
            let parentUuid = findNearestMessageUuid(node.parent);
            if (!parentUuid) parentUuid = ROOT_UUID;
            const timestamp = msg.create_time ? parseTimestamp(new Date(msg.create_time * 1000).toISOString()) : '';

            // 处理文本内容
            let rawText = '';
            let imageAttachment = null;
            if (contentType === 'text' || contentType === 'code') {
              rawText = Array.isArray(content.parts) ? content.parts.join('') : (content.content || content.text || '');
            } else if (contentType === 'image_file') {
              const fileId = content.file_id || content.fileID || '';
              const fileName = content.name || content.file_name || 'image';
              imageAttachment = {
                id: fileId,
                file_name: fileName,
                file_size: content.size || 0,
                file_type: content.mimeType || 'image/png',
                extracted_content: '',
                link: fileId || '',
                has_link: !!fileId
              };
              rawText = `[图片: ${fileName}]`;
            } else {
              try { rawText = JSON.stringify(content); } catch (e) { rawText = ''; }
            }

            const messageData = new MessageBuilder(messageIndex++, uuid, parentUuid, 'assistant', 'ChatGPT', timestamp)
              .setContent(rawText)
              .setThinking(pendingThinking)
              .addCitations(metadata)
              .addAttachments(metadata)
              .addTools(pendingTools.map(t => ({ ...t })))
              .finalize(false);

            messageData._node_id = nodeId;
            if (imageAttachment) messageData.attachments.unshift(imageAttachment);
            if (pendingAttachments.length > 0) {
              messageData.attachments.push(...pendingAttachments);
              pendingAttachments = [];
            }

            chatHistory.push(messageData);
            nodeIdToMessage.set(nodeId, messageData);
          }
        }
        // === 工具消息 ===
        else if (role === 'tool') {
          const toolName = author.name || '';
          const groups = metadata?.search_result_groups;
          if (Array.isArray(groups)) {
            // 重新整理 search_result_groups：缺失 domain 的根据 URL 提取并分组
            const domainMap = {};
            groups.forEach(grp => {
              const entries = Array.isArray(grp.entries) ? grp.entries : [];
              if (grp && grp.domain && String(grp.domain).trim()) {
                const dom = String(grp.domain).trim();
                if (!domainMap[dom]) domainMap[dom] = [];
                entries.forEach(entry => {
                  domainMap[dom].push({
                    url: entry.url || '',
                    title: entry.title || '',
                    snippet: entry.snippet || '',
                    pub_date: entry.pub_date || null,
                    attribution: entry.attribution || ''
                  });
                });
              } else {
                // 无 domain，从每个条目的 url 中解析域名分组
                entries.forEach(entry => {
                  const url = entry.url || '';
                  let dom = '';
                  const match = typeof url === 'string' && url.match(/^(?:https?:\/\/)?([^\/]+)/i);
                  if (match) dom = match[1] || '';
                  if (!domainMap[dom]) domainMap[dom] = [];
                  domainMap[dom].push({
                    url: entry.url || '',
                    title: entry.title || '',
                    snippet: entry.snippet || '',
                    pub_date: entry.pub_date || null,
                    attribution: entry.attribution || ''
                  });
                });
              }
            });
            // 构建去重后的分组数组
            const mappedGroups = Object.keys(domainMap).map(dom => ({
              domain: dom || '',
              entries: domainMap[dom]
            }));
            // 提取模型查询语句
            let queries = [];
            if (metadata?.search_model_queries && Array.isArray(metadata.search_model_queries.queries)) {
              queries = metadata.search_model_queries.queries.map(q => q.q || q);
            }

            if (pendingTools.length > 0) {
              const lastTool = pendingTools[pendingTools.length - 1];
              lastTool.result = lastTool.result || {};
              lastTool.result.groups = mappedGroups;
              if (queries.length > 0) lastTool.result.queries = queries;
            } else {
              const resultObj = { groups: mappedGroups };
              if (queries.length > 0) resultObj.queries = queries;
              pendingTools.push({ name: toolName || 'tool', input: {}, result: resultObj });
            }
          }

          // 工具产生的附件暂存到 pendingAttachments
          if (Array.isArray(metadata?.attachments)) {
            pendingAttachments.push(...processAttachments(metadata.attachments));
          }
          // 工具消息不生成可见消息
        }
      }

      // 递归子节点
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(childId => traverse(childId));
      }
    };

    // 按根节点顺序遍历
    rootNodeIds.forEach(rootId => {
      traverse(rootId);
    });

    const processed = {
      meta_info: metaInfo,
      chat_history: chatHistory,
      raw_data: jsonData,
      format: 'chatgpt',
      platform: 'chatgpt'
    };

    return processed;
  } catch (error) {
    console.error('解析 ChatGPT 数据出错:', error);
    throw error;
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
    const isHuman = sender === "human";

    const messageData = new MessageBuilder(
      msgIdx,
      msg.uuid || "",
      msg.parent_message_uuid || "",
      sender,
      senderLabel,
      parseTimestamp(msg.created_at)
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
        created_at: att.created_at ? parseTimestamp(att.created_at) : ""
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

// ==================== Gemini/NotebookLM辅助函数 ====================
// 处理Gemini消息的图片
const processGeminiMessageImages = (content, itemIndex, platform, metaInfo, message) => {
  if (!content.images || content.images.length === 0) return;

  metaInfo.has_embedded_images = true;
  content.images.forEach((imgData, imgIndex) => {
    metaInfo.totalImagesProcessed++;
    const imageInfo = processGeminiImage(imgData, itemIndex, imgIndex, platform);
    if (imageInfo) {
      message.images.push(imageInfo);
    }
  });

  // 添加图片标记
  if (message.images.length > 0) {
    const imageMarkdown = message.images
      .map((img, idx) => `[图片${idx + 1}]`)
      .join(' ');
    message.display_text = `${imageMarkdown}\n\n${message.display_text}`.trim();
  }
};

// ==================== Gemini/NotebookLM解析器 ====================
const extractGeminiNotebookLMData = (jsonData, fileName) => {
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

        // 挂载可选的 Canvas 内容
        if (typeof humanContent.canvas === 'string' && humanContent.canvas.trim()) {
          humanMessage.canvas = humanContent.canvas.trim();
        }

        // 处理图片
        processGeminiMessageImages(humanContent, itemIndex, platform, metaInfo, humanMessage);

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
        processGeminiMessageImages(assistantContent, itemIndex, platform, metaInfo, assistantMessage);

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

  // 遍历每个 turn
  jsonData.conversation.forEach((turn) => {
    const turnIndex = turn.turnIndex;

    // 处理人类消息的所有版本
    if (turn.human && turn.human.versions) {
      turn.human.versions.forEach((humanVersion, versionIdx) => {
        const uuid = `human_${turnIndex}_v${humanVersion.version}`;
        const parentUuid = turnIndex > 0 ? `assistant_${turnIndex - 1}_v0` : "";

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

// ==================== 辅助函数 ====================

// 消息构建器类 - 简化消息创建过程
class MessageBuilder {
  constructor(index, uuid, parentUuid, sender, senderLabel, timestamp) {
    this.message = {
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
      attachments: [],
      branch_id: null,
      is_branch_point: false,
      branch_level: 0
    };
  }

  setRawText(rawText) {
    this.message.raw_text = rawText;
    return this;
  }

  setContent(rawText) {
    const { thinking, content } = extractThinkingAndContent(rawText);
    this.message.raw_text = rawText;
    this.message.thinking = thinking;
    this.message.display_text = content;
    return this;
  }

  setThinking(thinking) {
    this.message.thinking = thinking;
    return this;
  }

  setDisplayText(text) {
    this.message.display_text = text;
    return this;
  }

  addAttachments(metadata) {
    if (Array.isArray(metadata?.attachments)) {
      this.message.attachments.push(...processAttachments(metadata.attachments));
    }
    return this;
  }

  addCitations(metadata) {
    if (Array.isArray(metadata?.citations)) {
      this.message.citations.push(...filterCitations(metadata.citations));
    }
    return this;
  }

  addTools(tools) {
    if (Array.isArray(tools)) {
      this.message.tools.push(...tools);
    }
    return this;
  }

  finalize(isHuman) {
    finalizeDisplayText(this.message, isHuman);
    return this.message;
  }

  build() {
    return this.message;
  }
}

// 创建消息对象（保留向后兼容）
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
    attachments: [],
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
        messageData.citations.push(...filterCitations(item.citations));
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
  const addImage = (imageInfo) => {
    imageInfo.index = messageData.images.length;
    messageData.images.push(imageInfo);
  };

  const processFiles = (files, version = '') => {
    if (!Array.isArray(files)) return;
    files.forEach((file) => {
      if (file.file_kind === 'image') {
        addImage({
          file_name: file.file_name || `image_${version}_${messageData.images.length}`,
          file_uuid: file.file_uuid,
          created_at: file.created_at,
          thumbnail_url: file.thumbnail_url,
          preview_url: file.preview_url,
          embedded_image: file.embedded_image?.data ? file.embedded_image : null,
          display_mode: file.embedded_image?.data ? 'base64' : 'url'
        });
      }
    });
  };

  processFiles(message.files, 'v1');
  if (messageData.images.length === 0) processFiles(message.files_v2, 'v2');

  if (Array.isArray(message.attachments)) {
    message.attachments.forEach((att) => {
      if (att.file_type?.startsWith('image/')) {
        addImage({
          file_name: att.file_name || `attachment_${messageData.images.length}`,
          file_type: att.file_type,
          file_url: att.file_url,
          embedded_image: att.embedded_image?.data ? att.embedded_image : null,
          display_mode: att.embedded_image?.data ? 'base64' : 'url'
        });
      }
    });
  }
}

// 处理Gemini格式的图片
function processGeminiImage(imgData, itemIndex, imgIndex, platform) {
  const fileName = `${platform}_image_${itemIndex}_${imgIndex}`;

  if (typeof imgData === 'string') {
    return {
      index: imgIndex,
      file_name: fileName,
      file_type: imgData.startsWith('data:image/') ? imgData.split(';')[0].replace('data:', '') : 'image/png',
      display_mode: 'base64',
      embedded_image: { data: imgData, size: 0 }
    };
  }

  if (typeof imgData === 'object') {
    const format = imgData.format || 'image/png';
    return {
      index: imgIndex,
      file_name: fileName,
      file_type: format,
      display_mode: 'base64',
      embedded_image: { data: `data:${format};base64,${imgData.data}`, size: imgData.size || 0 },
      original_src: imgData.original_src
    };
  }

  return null;
}

// 生成最终显示文本
function finalizeDisplayText(messageData, isHumanMessage = false) {
  const attachImages = messageData.images.filter(img => !img.placeholder);
  if (attachImages.length > 0) {
    const imageMarkdown = attachImages.map((img, idx) => `[图片${idx + 1}: ${img.file_name}]`).join(' ');
    messageData.display_text = `${imageMarkdown}\n\n${messageData.display_text}`.trim();
  }
}

// 提取artifact信息
function extractArtifact(artifactItem) {
  try {
    const input = artifactItem.input || {};
    const command = input.command || "";

    if (command === "create") {
      return { id: input.id || "", command, type: input.type || "", title: input.title || "无标题", content: input.content || "", language: input.language || "", result: null };
    }
    if (command === "update" || command === "rewrite") {
      return { id: input.id || "", command, old_str: input.old_str || "", new_str: input.new_str || "", result: null };
    }
  } catch (error) {
    console.error("提取artifact时出错:", error);
  }
  return null;
}

// 提取工具使用信息
function extractToolUse(toolItem) {
  const toolData = { name: toolItem.name || "unknown", input: toolItem.input || {}, result: null };
  if (toolItem.name === "web_search" && toolItem.input?.query) toolData.query = toolItem.input.query;
  return toolData;
}

// 提取工具结果信息
function extractToolResult(resultItem) {
  return { name: resultItem.name || "unknown", is_error: resultItem.is_error || false, content: resultItem.content || [] };
}

// ==================== 分支检测辅助函数 ====================
// 构建消息父子关系映射
const buildMessageMaps = (messages) => {
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

  return { parentChildMap, messageMap };
};

// ==================== 分支检测（简化版） ====================
export const detectBranches = (processedData) => {
  if (!processedData?.chat_history) {
    return processedData;
  }

  // 如果是 JSONL 格式，使用专门的分支检测
  if (processedData.format === 'jsonl_chat') {
    return detectJSONLBranches(processedData);
  }
  // 如果是 ChatGPT 格式，使用 ChatGPT 分支检测
  if (processedData.format === 'chatgpt') {
    return detectChatGPTBranches(processedData);
  }

  try {
    const messages = processedData.chat_history;
    const ROOT_UUID = '00000000-0000-4000-8000-000000000000';
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
  if (visited.has(nodeUuid) || !messageMap.has(nodeUuid)) return;

  visited.add(nodeUuid);
  const node = messageMap.get(nodeUuid);
  node.branch_id = branchPath;
  node.branch_level = level;

  const children = parentChildMap.get(nodeUuid) || [];
  children.forEach((childUuid, index) => {
    const childPath = index === 0 ? branchPath : `${branchPath}.${index}`;
    const childLevel = index === 0 ? level : level + 1;
    markBranchPath(childUuid, childPath, childLevel, messageMap, parentChildMap, visited);
  });
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
      title: `${imageInfo.file_name} (${FileUtils.formatFileSize(imageInfo.embedded_image.size)})`,
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
  const charName = firstLine.character_name;
  const now = new Date().toLocaleString('zh-CN');

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
function createJSONLMessage(entryIndex, swipeIndex, name, senderLabel, timestamp, isUser, messageText, swipeInfo) {
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

// ==================== ChatGPT 分支检测 ====================
// 根据 ChatGPT 导出的 mapping 结构和当前节点，标记分支信息。
// ChatGPT 的 mapping 中每个节点可能有多个子节点，表示回复分支。
export function detectChatGPTBranches(processedData) {
  /**
   * 自定义的 ChatGPT 分支检测：
   * 使用消息级的父子关系来识别分支点，而不是使用原始 mapping 中的每个节点。
   * 这样可以确保跳过的系统节点或上下文节点不会干扰分支标记，并能正确地把用户消息作为分支点。
   */
  if (!processedData || processedData.format !== 'chatgpt' || !processedData.chat_history) {
    return processedData;
  }
  const messages = processedData.chat_history;
  const rawData = processedData.raw_data || {};
  const mapping = rawData.mapping || {};
  const currentNode = rawData.current_node;

  // 构建 nodeId -> messageData 映射，只包括我们生成的消息
  const nodeIdToMessage = new Map();
  messages.forEach(msg => {
    if (msg._node_id) {
      nodeIdToMessage.set(msg._node_id, msg);
    }
  });

  // 计算主路径上的 nodeId 集合（从 currentNode 向上到根）
  const mainPathSet = new Set();
  let curr = currentNode;
  while (curr) {
    mainPathSet.add(curr);
    const parent = mapping[curr] ? mapping[curr].parent : null;
    if (!parent) break;
    curr = parent;
  }

  // 清理旧的 branch 标记
  messages.forEach(msg => {
    msg.is_branch_point = false;
    msg.branch_id = null;
    msg.branch_level = 0;
  });

  // 构建消息级的 parent-child 映射
  const { parentChildMap, messageMap } = buildMessageMaps(messages);

  // 标记消息级的分支点：具有多个子消息的父消息
  parentChildMap.forEach((children, parentUuid) => {
    if (children.length > 1) {
      const parentMsg = messageMap.get(parentUuid);
      if (parentMsg) parentMsg.is_branch_point = true;
    }
  });

  // 找出根消息：没有 parent_uuid 或 parent_uuid 不在消息映射中的消息
  const rootMessages = [];
  messages.forEach(msg => {
    const parentUuid = msg.parent_uuid;
    if (!parentUuid || !messageMap.has(parentUuid)) {
      rootMessages.push(msg);
    }
  });

  // 按消息出现顺序排序根消息（保持时间顺序）
  rootMessages.sort((a, b) => a.index - b.index);

  // 辅助函数：递归分配 branch_id 和 branch_level
  const visited = new Set();
  function assign(msg, branchPath, level) {
    if (!msg || visited.has(msg.uuid)) return;
    visited.add(msg.uuid);
    msg.branch_id = branchPath;
    msg.branch_level = level;
    const children = parentChildMap.get(msg.uuid) || [];
    if (children.length === 0) return;
    // 选择主路径子消息：_node_id 在主路径集合中的消息优先
    let mainChildUuid = null;
    for (const childUuid of children) {
      const childMsg = messageMap.get(childUuid);
      if (childMsg && childMsg._node_id && mainPathSet.has(childMsg._node_id)) {
        mainChildUuid = childUuid;
        break;
      }
    }
    if (!mainChildUuid && children.length > 0) {
      mainChildUuid = children[0];
    }
    // 为每个子消息分配分支路径
    let altIndex = 1;
    for (const childUuid of children) {
      const childMsg = messageMap.get(childUuid);
      if (!childMsg) continue;
      if (childUuid === mainChildUuid) {
        assign(childMsg, branchPath, level);
      } else {
        const childPath = branchPath ? `${branchPath}.${altIndex}` : `${altIndex}`;
        assign(childMsg, childPath, level + 1);
        altIndex++;
      }
    }
  }

  // 为根消息分配分支路径：第一个根作为 main，其余作为 main.1, main.2...
  rootMessages.forEach((rootMsg, idx) => {
    const branchPath = idx === 0 ? 'main' : `main.${idx}`;
    const level = idx === 0 ? 0 : 1;
    assign(rootMsg, branchPath, level);
  });

  // 归一化根路径：将第一个人类/助手消息的分支统一为 main
  try {
    const firstMsg = messages.find(m => m.sender === 'human' || m.sender === 'assistant');
    if (firstMsg && firstMsg.branch_id && firstMsg.branch_id !== 'main') {
      const prefix = firstMsg.branch_id;
      messages.forEach(msg => {
        if (msg.branch_id && msg.branch_id.startsWith(prefix)) {
          msg.branch_id = msg.branch_id.replace(prefix, 'main');
        }
      });
    }
  } catch (e) {
    // ignore errors
  }

  // 保留原有分支检测逻辑，不包含首轮分支、轮次或分支标签的处理

  // 构建分支点列表和 branches 信息
  const rawBranchPoints = [];
  parentChildMap.forEach((children, parentUuid) => {
    if (children.length > 1) {
      const parentMsg = messageMap.get(parentUuid);
      if (parentMsg) rawBranchPoints.push(parentMsg.uuid);
    }
  });
  // 仅将人类消息作为分支点（跳过助手消息）
  const branchPoints = [];
  rawBranchPoints.forEach(uuid => {
    const msg = messageMap.get(uuid);
    if (msg && msg.sender === 'human') {
      branchPoints.push(uuid);
    } else {
      // 将非人类的分支标记取消
      if (msg) {
        msg.is_branch_point = false;
      }
    }
  });

  return {
    ...processedData,
    branch_points: branchPoints,
    branches: extractBranchInfo(messages)
  };
}