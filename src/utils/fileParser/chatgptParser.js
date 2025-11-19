// chatgptParser.js
// ChatGPT 平台的解析器和分支检测

import {
  MessageBuilder,
  DateTimeUtils,
  PARSER_CONFIG,
  processAttachments,
  buildMessageMaps,
  extractBranchInfo
} from './helpers.js';

// ==================== ChatGPT 解析器 ====================
/**
 * 解析 ChatGPT 对话导出格式
 * ChatGPT 导出包含 mapping 字典，每个节点包含 message 数据以及父子关系。
 * @param {Object} jsonData - ChatGPT 导出的原始 JSON
 * @param {String} fileName - 文件名，用于默认标题
 */
export const extractChatGPTData = (jsonData, fileName = '') => {
  try {
    const title = jsonData.title || fileName.replace(/\.(jsonl|json)$/i, '') || 'ChatGPT 对话';
    const createdAt = jsonData.create_time ? DateTimeUtils.formatDateTime(new Date(jsonData.create_time * 1000).toISOString()) : DateTimeUtils.formatDateTime(new Date().toISOString());

    const metaInfo = {
      title,
      created_at: createdAt,
      updated_at: jsonData.update_time ? DateTimeUtils.formatDateTime(new Date(jsonData.update_time * 1000).toISOString()) : createdAt,
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
    const ROOT_UUID = PARSER_CONFIG.ROOT_UUID;

    // 保存 nodeId 到消息对象的映射，便于设置 parent_uuid
    const nodeIdToMessage = new Map();
    let lastUserMessage = null;

    const mapping = jsonData.mapping || {};

    // 用于缓存当前助手消息的思考内容和工具调用
    let pendingThinking = '';
    let pendingTools = [];
    // 用于缓存assistant消息的推理概要内容（reasoning_recap）。
    // reasoning_recap 通常只是表示"已思考X秒"等信息，不应该单独生成消息，否则会导致分支预览显示该概要内容。
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
          const timestamp = msg.create_time ? DateTimeUtils.formatDateTime(new Date(msg.create_time * 1000).toISOString()) : '';

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
            const timestamp = msg.create_time ? DateTimeUtils.formatDateTime(new Date(msg.create_time * 1000).toISOString()) : '';

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
    console.error('[ChatGPT Parser] 解析数据出错:', error);
    throw error;
  }
};

// ==================== ChatGPT 分支检测 ====================
// 根据 ChatGPT 导出的 mapping 结构和当前节点，标记分支信息。
// ChatGPT 的 mapping 中每个节点可能有多个子节点，表示回复分支。
export const detectChatGPTBranches = (processedData) => {
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
};
