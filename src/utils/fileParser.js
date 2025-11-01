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
    case 'claude_full_export':
      return extractClaudeFullExportData(jsonData, fileName);
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
    // 元信息
    const title = jsonData.title || fileName.replace(/\.(jsonl|json)$/i, '') || 'ChatGPT 对话';
    const createdAt = jsonData.create_time ? parseTimestamp(new Date(jsonData.create_time * 1000).toISOString()) : new Date().toLocaleString('zh-CN');
    const updatedAt = jsonData.update_time ? parseTimestamp(new Date(jsonData.update_time * 1000).toISOString()) : createdAt;

    const modelSlug = jsonData.default_model_slug || '';
    const convUuid = jsonData.conversation_id || jsonData.id || '';

    const metaInfo = {
      title,
      created_at: createdAt,
      updated_at: updatedAt,
      project_uuid: '',
      uuid: convUuid,
      model: modelSlug,
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
            metadata.attachments.forEach(att => {
              const attachmentInfo = {
                id: att.id || '',
                file_name: att.name || att.file_name || '未知文件',
                file_size: att.size || att.file_size || 0,
                // 优先使用 mimeType，其次 mime_type，再次 file_type
                file_type: att.mimeType || att.mime_type || att.file_type || '',
                extracted_content: att.extractedContent || att.extracted_content || ''
                ,
                link: att.link || att.url || att.download_url || att.href || '',
                has_link: !!(att.link || att.url || att.download_url || att.href)
              };
              lastUserMessage.attachments.push(attachmentInfo);
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
          // 定位父消息，如果不存在则挂在根UUID
          let parentUuid = findNearestMessageUuid(node.parent);
          if (!parentUuid) parentUuid = ROOT_UUID;
          const timestamp = msg.create_time ? parseTimestamp(new Date(msg.create_time * 1000).toISOString()) : '';
          const messageData = createMessage(messageIndex++, uuid, parentUuid, 'human', 'User', timestamp);
          messageData._node_id = nodeId;

          // 处理用户文本内容
          const content = msg.content || {};
          const contentType = content.content_type || '';
          let rawText = '';
          if (contentType === 'text') {
            if (Array.isArray(content.parts)) {
              rawText = content.parts.join('');
            } else if (typeof content.content === 'string') {
              rawText = content.content;
            }
          } else {
            if (typeof content.content === 'string') {
              rawText = content.content;
            } else if (Array.isArray(content.parts)) {
              rawText = content.parts.join('');
            }
          }
          const extracted = extractThinkingAndContent(rawText);
          messageData.raw_text = rawText;
          messageData.display_text = extracted.content || rawText;

          // citations
          if (Array.isArray(metadata?.citations)) {
            // 过滤掉引用用户上传文件的条目（metadata.type === 'file' 或来源为 my_files）
            messageData.citations = metadata.citations.filter((cit) => {
              if (!cit || typeof cit !== 'object') return false;
              const meta = cit.metadata || {};
              const isFileCitation = meta.type === 'file' || meta.source === 'my_files';
              return !isFileCitation;
            });
          }

          // 处理用户上传的附件（直接挂在 user.metadata.attachments）
          if (Array.isArray(metadata?.attachments)) {
            metadata.attachments.forEach(att => {
              const attachmentInfo = {
                id: att.id || '',
                file_name: att.name || att.file_name || '未知文件',
                file_size: att.size || att.file_size || 0,
                file_type: att.mimeType || att.mime_type || att.file_type || '',
                extracted_content: att.extractedContent || att.extracted_content || '',
                link: att.link || att.url || att.download_url || att.href || '',
                has_link: !!(att.link || att.url || att.download_url || att.href)
              };
              messageData.attachments.push(attachmentInfo);
            });
          }

          finalizeDisplayText(messageData, true);
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
            const messageData = createMessage(messageIndex++, uuid, parentUuid, 'assistant', 'ChatGPT', timestamp);
            messageData._node_id = nodeId;

            // 处理文本内容
            let rawText = '';
            if (contentType === 'text' || contentType === 'code') {
              if (Array.isArray(content.parts)) {
                rawText = content.parts.join('');
              } else if (typeof content.content === 'string') {
                rawText = content.content;
              } else if (content.text) {
                rawText = content.text;
              }
            } else if (contentType === 'image_file') {
              const fileId = content.file_id || content.fileID || '';
              const fileName = content.name || content.file_name || 'image';
              const fileSize = content.size || 0;
              const fileType = content.mimeType || 'image/png';
              messageData.attachments.push({
                id: fileId,
                file_name: fileName,
                file_size: fileSize,
                file_type: fileType,
                extracted_content: '',
                // 将文件ID作为链接，表明可供下载
                link: fileId || '',
                has_link: !!fileId
              });
              rawText = `[图片: ${fileName}]`;
            } else {
              try {
                rawText = JSON.stringify(content);
              } catch (e) {
                rawText = '';
              }
            }

            const extracted = extractThinkingAndContent(rawText);
            const displayText = extracted.content || rawText;
            messageData.raw_text = rawText;
            messageData.display_text = displayText;
            messageData.thinking = pendingThinking;

            // 将 pendingAttachments 附加到当前助手消息
            if (pendingAttachments.length > 0) {
              pendingAttachments.forEach(att => {
                messageData.attachments.push({ ...att });
              });
              pendingAttachments = [];
            }

            // 如果此助手消息有 metadata.attachments，也要附加
            if (Array.isArray(metadata?.attachments)) {
              metadata.attachments.forEach(att => {
                const attachmentInfo = {
                  id: att.id || '',
                  file_name: att.name || att.file_name || '未知文件',
                  file_size: att.size || att.file_size || 0,
                  file_type: att.mimeType || att.mime_type || att.file_type || '',
                  extracted_content: att.extractedContent || att.extracted_content || '',
                  link: att.link || att.url || att.download_url || att.href || '',
                  has_link: !!(att.link || att.url || att.download_url || att.href)
                };
                messageData.attachments.push(attachmentInfo);
              });
            }

            // citations
            if (Array.isArray(metadata?.citations)) {
              // 过滤掉引用用户上传文件的条目（metadata.type === 'file' 或来源为 my_files）
              messageData.citations = metadata.citations.filter((cit) => {
                if (!cit || typeof cit !== 'object') return false;
                const meta = cit.metadata || {};
                const isFileCitation = meta.type === 'file' || meta.source === 'my_files';
                return !isFileCitation;
              });
            }

            // 工具调用
            if (pendingTools.length > 0) {
              messageData.tools = pendingTools.map(t => ({ ...t }));
            }

            finalizeDisplayText(messageData, false);
            chatHistory.push(messageData);
            nodeIdToMessage.set(nodeId, messageData);
            // 不在这里重置 pendingThinking 或 pendingTools
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
            metadata.attachments.forEach(att => {
              const attachmentInfo = {
                id: att.id || '',
                file_name: att.name || att.file_name || '未知文件',
                file_size: att.size || att.file_size || 0,
                file_type: att.mimeType || att.mime_type || att.file_type || '',
                extracted_content: att.extractedContent || att.extracted_content || '',
                link: att.link || att.url || att.download_url || att.href || '',
                has_link: !!(att.link || att.url || att.download_url || att.href)
              };
              pendingAttachments.push(attachmentInfo);
            });
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

        // 挂载可选的 Canvas 内容
        // Gemini NotebookLM 数据中，human 或 assistant 消息可能包含 canvas 字段
        // 若存在非空字符串，则将其保存到 message.canvas
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
        item.citations.forEach(citation => {
          if (citation && typeof citation === 'object') {
            // 过滤掉引用用户上传文件的条目（metadata.type === 'file' 或来源为 my_files）
            const meta = citation.metadata || {};
            const isFileCitation = meta.type === 'file' || meta.source === 'my_files';
            if (!isFileCitation) {
              messageData.citations.push(citation);
            }
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

  // 构建消息级的 parent-child 映射
  const messageMap = new Map();
  messages.forEach(msg => {
    messageMap.set(msg.uuid, msg);
    // 清理旧的 branch 标记
    msg.is_branch_point = false;
    msg.branch_id = null;
    msg.branch_level = 0;
  });
  const parentChildMap = new Map();
  messages.forEach(msg => {
    const parentUuid = msg.parent_uuid;
    if (parentUuid && messageMap.has(parentUuid)) {
      if (!parentChildMap.has(parentUuid)) {
        parentChildMap.set(parentUuid, []);
      }
      parentChildMap.get(parentUuid).push(msg.uuid);
    }
  });

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
  // 构建 branches 列表
  const branches = [];
  const branchGroups = new Map();
  messages.forEach(msg => {
    if (msg.branch_id && msg.branch_id !== 'main') {
      if (!branchGroups.has(msg.branch_id)) branchGroups.set(msg.branch_id, []);
      branchGroups.get(msg.branch_id).push(msg.uuid);
    }
  });
  branchGroups.forEach((uuids, branchId) => {
    branches.push({ path: branchId, level: 0, id: branchId, messages: uuids });
  });

  return {
    ...processedData,
    branch_points: branchPoints,
    branches
  };
}