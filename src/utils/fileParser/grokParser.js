// grokParser.js
// Grok 平台的解析器

import {
  MessageBuilder,
  DateTimeUtils,
  PARSER_CONFIG,
  finalizeDisplayText
} from './helpers.js';

// ==================== Grok 解析器 ====================
export const extractGrokData = (jsonData) => {
  const title = jsonData.title || "无标题对话";
  const exportTime = DateTimeUtils.formatDateTime(jsonData.exportTime);
  const conversationId = jsonData.conversationId || "";

  const metaInfo = {
    title,
    created_at: exportTime,
    updated_at: exportTime,
    uuid: conversationId,
    model: "Grok",
    platform: 'grok',
    has_embedded_images: false,
    images_processed: 0
  };

  const chatHistory = [];
  const responses = jsonData.responses || [];

  responses.forEach((msg, msgIdx) => {
    const sender = msg.sender || "unknown";
    const senderLabel = sender === "human" ? "User" : "Grok";
    const isHuman = sender === "human";

    const messageData = new MessageBuilder(
      msgIdx,
      msg.responseId || `grok_msg_${msgIdx}`,
      msg.parentResponseId || "",  // 使用树结构中的 parent_uuid
      sender,
      senderLabel,
      DateTimeUtils.formatDateTime(msg.createTime)
    ).build();

    // 添加树结构信息
    if (msg.childResponseIds && msg.childResponseIds.length > 0) {
      messageData.childResponseIds = msg.childResponseIds;
    }
    if (msg.threadId) {
      messageData.threadId = msg.threadId;
    }

    // 处理消息内容
    let messageText = msg.message || "";

    // 处理引用标签 - 转换为 Markdown 链接
    if (msg.citations && Array.isArray(msg.citations)) {
      const citationMap = new Map();
      msg.citations.forEach(cit => {
        citationMap.set(cit.id, {
          url: cit.url,
          title: cit.title || 'Source'
        });
      });

      // 替换 <grok:render card_id="...">...</grok:render> 标签
      messageText = messageText.replace(
        /<grok:render card_id="([^"]+)"[\s\S]*?<\/grok:render>/g,
        (match, cardId) => {
          const citation = citationMap.get(cardId);
          if (citation) {
            const escapedTitle = citation.title.replace(/([\[\]])/g, '\\$1');
            return `[${escapedTitle}](${citation.url})`;
          }
          return '';
        }
      );

      // 保存引用信息
      messageData.citations = msg.citations.map(cit => ({
        url: cit.url,
        title: cit.title || 'Source'
      }));
    }

    // 移除未处理的 grok 标签
    messageText = messageText.replace(/<grok:render[\s\S]*?<\/grok:render>/g, '').trim();

    messageData.raw_text = msg.message || "";
    messageData.display_text = messageText;

    // 处理 web 搜索结果
    if (msg.webSearchResults && Array.isArray(msg.webSearchResults)) {
      messageData.web_search_results = msg.webSearchResults.map(result => ({
        url: result.url,
        title: result.title || '',
        snippet: result.snippet || ''
      }));
    }

    // 处理附件
    if (msg.attachments && Array.isArray(msg.attachments)) {
      messageData.attachments = msg.attachments;
    }

    // 处理图片附件
    if (msg.imageAttachments && Array.isArray(msg.imageAttachments)) {
      msg.imageAttachments.forEach((img, imgIdx) => {
        messageData.images.push({
          index: imgIdx,
          file_name: img.fileName || `grok_image_${imgIdx}`,
          file_type: img.mimeType || 'image/jpeg',
          url: img.url || '',
          display_mode: img.data ? 'base64' : 'url',
          embedded_image: img.data ? {
            data: img.data.startsWith('data:') ? img.data : `data:${img.mimeType || 'image/jpeg'};base64,${img.data}`,
            size: img.size || 0
          } : null
        });
      });

      if (messageData.images.length > 0) {
        metaInfo.has_embedded_images = true;
        metaInfo.images_processed = messageData.images.length;
      }
    }

    // 处理文件附件
    if (msg.fileAttachments && Array.isArray(msg.fileAttachments)) {
      msg.fileAttachments.forEach(file => {
        const mimeType = file.mimeType || '';
        const isImage = mimeType.startsWith('image/');

        // 图片类型的文件标记为 is_embedded_image
        messageData.attachments.push({
          file_name: file.fileName || '未知文件',
          file_size: file.size || 0,
          file_type: mimeType,
          url: file.url || '',
          is_embedded_image: isImage
        });
      });
    }

    // 处理从 DOM 捕捉的图片（capturedImages）
    if (msg.capturedImages && Array.isArray(msg.capturedImages)) {
      msg.capturedImages.forEach((img, imgIdx) => {
        const imageIndex = messageData.images.length + imgIdx;

        messageData.images.push({
          index: imageIndex,
          file_name: `grok_${img.source}_${imageIndex}.${img.format.split('/')[1] || 'jpg'}`,
          file_type: img.format,
          url: img.original_src || '',
          display_mode: 'base64',
          source: img.source,
          embedded_image: {
            data: `data:${img.format};base64,${img.data}`,
            size: img.size || 0
          }
        });
      });

      if (msg.capturedImages.length > 0) {
        metaInfo.has_embedded_images = true;
        metaInfo.images_processed += msg.capturedImages.length;
      }
    }

    // 整理最终显示文本
    finalizeDisplayText(messageData, isHuman);

    chatHistory.push(messageData);
  });

  return {
    meta_info: metaInfo,
    chat_history: chatHistory,
    raw_data: jsonData,
    format: 'grok'
  };
};

// ==================== Grok 分支检测 ====================
export const detectGrokBranches = (processedData) => {
  if (!processedData?.chat_history) {
    return processedData;
  }

  const chatHistory = processedData.chat_history;
  const conversationTree = processedData.raw_data?.conversationTree;

  // 如果没有树结构信息，按旧逻辑处理（线性对话）
  if (!conversationTree || !conversationTree.nodes || conversationTree.nodes.length === 0) {
    chatHistory.forEach(msg => {
      msg.branch_id = 'main';
      msg.branch_level = 0;
      msg.is_branch_point = false;
    });

    return {
      ...processedData,
      branches: [],
      branch_points: []
    };
  }

  // 构建节点映射
  const nodeMap = new Map();
  conversationTree.nodes.forEach(node => {
    nodeMap.set(node.responseId, node);
  });

  // 查找所有分支点（有多个子节点的消息）
  const branchPoints = [];
  const branches = [];
  const messageMap = new Map();

  chatHistory.forEach(msg => {
    messageMap.set(msg.uuid, msg);
    const node = nodeMap.get(msg.uuid);

    if (node && node.childResponseIds && node.childResponseIds.length > 1) {
      // 这是一个分支点
      msg.is_branch_point = true;
      branchPoints.push({
        message_uuid: msg.uuid,
        message_index: msg.index,
        branch_count: node.childResponseIds.length,
        child_ids: node.childResponseIds
      });
    } else {
      msg.is_branch_point = false;
    }
  });

  // 如果没有分支点，所有消息都在主分支
  if (branchPoints.length === 0) {
    chatHistory.forEach(msg => {
      msg.branch_id = 'main';
      msg.branch_level = 0;
    });

    return {
      ...processedData,
      branches: [],
      branch_points: []
    };
  }

  // 构建分支路径
  const assignBranches = (nodeId, branchId, level) => {
    const msg = messageMap.get(nodeId);
    if (!msg) return;

    msg.branch_id = branchId;
    msg.branch_level = level;

    const node = nodeMap.get(nodeId);
    if (!node || !node.childResponseIds || node.childResponseIds.length === 0) {
      return;
    }

    if (node.childResponseIds.length === 1) {
      // 单一子节点，继续当前分支
      assignBranches(node.childResponseIds[0], branchId, level);
    } else {
      // 多个子节点，创建新分支
      node.childResponseIds.forEach((childId, idx) => {
        const newBranchId = idx === 0 ? branchId : `${branchId}_alt${idx}`;
        const newLevel = idx === 0 ? level : level + 1;

        if (idx > 0) {
          branches.push({
            branch_id: newBranchId,
            parent_branch: branchId,
            branch_point_uuid: nodeId,
            branch_index: idx
          });
        }

        assignBranches(childId, newBranchId, newLevel);
      });
    }
  };

  // 查找所有根节点（parentResponseId 为 null 的节点）
  const rootNodes = conversationTree.nodes.filter(n => !n.parentResponseId);

  if (rootNodes.length === 0) {
    // 没有根节点，所有消息标记为孤立
    chatHistory.forEach(msg => {
      if (!msg.branch_id) {
        msg.branch_id = 'orphan';
        msg.branch_level = 0;
        msg.is_branch_point = false;
      }
    });
  } else if (rootNodes.length === 1) {
    // 单一根节点，正常处理
    assignBranches(rootNodes[0].responseId, 'main', 0);
  } else {
    // 多个根节点（用户编辑消息产生的不同分支）
    rootNodes.forEach((rootNode, idx) => {
      const branchId = idx === 0 ? 'main' : `edit_${idx}`;
      assignBranches(rootNode.responseId, branchId, 0);

      // 记录用户编辑分支
      if (idx > 0) {
        const msg = messageMap.get(rootNode.responseId);
        if (msg && msg.sender === 'human') {
          branches.push({
            branch_id: branchId,
            parent_branch: null,
            branch_point_uuid: null,
            branch_index: idx,
            branch_type: 'user_edit',
            edit_sequence: idx
          });
        }
      }
    });
  }

  // 处理未分配的消息（真正的孤立节点）
  chatHistory.forEach(msg => {
    if (!msg.branch_id) {
      msg.branch_id = 'orphan';
      msg.branch_level = 0;
      msg.is_branch_point = false;
    }
  });

  return {
    ...processedData,
    branches,
    branch_points: branchPoints
  };
};
