// helpers.js
// 共用工具函数、常量、MessageBuilder 类

// ==================== 配置常量 ====================
export const PARSER_CONFIG = {
  ROOT_UUID: '00000000-0000-4000-8000-000000000000',

  PLATFORM_NAMES: {
    gemini: 'Gemini',
    notebooklm: 'NotebookLM',
    aistudio: 'Google AI Studio',
    claude: 'Claude',
    jsonl_chat: 'SillyTavern',
    chatgpt: 'ChatGPT'
  },

  PLATFORM_CLASSES: {
    gemini: 'platform-gemini',
    'google ai studio': 'platform-gemini',
    aistudio: 'platform-gemini',
    notebooklm: 'platform-notebooklm',
    jsonl_chat: 'platform-jsonl',
    chatgpt: 'platform-chatgpt'
  },

  PLATFORM_FORMATS: {
    gemini: 'gemini_notebooklm',
    'google ai studio': 'gemini_notebooklm',
    aistudio: 'gemini_notebooklm',
    notebooklm: 'gemini_notebooklm',
    chatgpt: 'chatgpt'
  },

  MODEL_MAP: {
    'opus-4': 'Claude Opus 4',
    'opus4': 'Claude Opus 4',
    'claude-3-opus': 'Claude Opus 3',
    'opus-3': 'Claude Opus 3',
    'opus3': 'Claude Opus 3',
    'sonnet-4': 'Claude Sonnet 4',
    'sonnet4': 'Claude Sonnet 4',
    'haiku': 'Claude Haiku'
  }
};

// ==================== Locale 缓存 ====================
class LocaleCache {
  constructor() {
    this._locale = null;
    this._initLocale();

    // 监听 storage 事件以自动更新
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'lyra_exporter_language') {
          this._initLocale();
        }
      });
    }
  }

  _initLocale() {
    try {
      const saved = localStorage.getItem('lyra_exporter_language') || 'en';
      if (saved === 'zh') {
        const browserLang = navigator.language || navigator.userLanguage || '';
        const lowerLang = browserLang.toLowerCase();
        if (lowerLang.includes('tw') || lowerLang.includes('hk') ||
            lowerLang.includes('mo') || lowerLang.includes('hant')) {
          this._locale = 'zh-TW';
        } else {
          this._locale = 'zh-CN';
        }
      } else {
        this._locale = saved;
      }
    } catch {
      this._locale = 'en';
    }
  }

  get() {
    return this._locale;
  }

  refresh() {
    this._initLocale();
  }
}

export const localeCache = new LocaleCache();

// ==================== 日期时间工具 ====================
export const DateTimeUtils = {
  formatDate(dateStr) {
    if (!dateStr) {
      const locale = localeCache.get();
      return locale.startsWith('zh') ? '未知时间' : 'Unknown time';
    }
    try {
      const date = new Date(dateStr);
      const locale = localeCache.get();
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
      const locale = localeCache.get();
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
      const locale = localeCache.get();
      return locale.startsWith('zh') ? '未知时间' : 'Unknown time';
    }
    try {
      const date = new Date(timestamp);
      const locale = localeCache.get();
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
    for (const [key, value] of Object.entries(PARSER_CONFIG.MODEL_MAP)) {
      if (model.includes(key)) return value;
    }
    return model;
  },

  getPlatformName(platform) {
    return PARSER_CONFIG.PLATFORM_NAMES[platform?.toLowerCase()] || 'Claude';
  },

  getPlatformClass(platform) {
    return PARSER_CONFIG.PLATFORM_CLASSES[platform?.toLowerCase()] || 'platform-claude';
  },

  getFormatFromPlatform(platform) {
    return PARSER_CONFIG.PLATFORM_FORMATS[platform?.toLowerCase()] || 'claude';
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
    const locale = localeCache.get();
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
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (e) {
        console.warn('[JSONL Parser] 行解析失败:', {
          line: line.substring(0, 100) + '...',
          error: e.message,
          lineNumber: index
        });
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
    console.error("[Parser] 解析时间戳错误:", error);
    return "未知时间";
  }
};

// 过滤citations,移除文件引用
export const filterCitations = (citations) => {
  if (!Array.isArray(citations)) return [];
  return citations.filter((cit) => {
    if (!cit || typeof cit !== 'object') return false;
    const meta = cit.metadata || {};
    return meta.type !== 'file' && meta.source !== 'my_files';
  });
};

// 处理附件
export const processAttachments = (attachments) => {
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

// 提取thinking标签和content标签的内容
export const extractThinkingAndContent = (text) => {
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
};

// ==================== MessageBuilder 类 ====================
export class MessageBuilder {
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

// ==================== 创建消息对象（保留向后兼容） ====================
export const createMessage = (index, uuid, parentUuid, sender, senderLabel, timestamp) => {
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
};

// ==================== 处理content数组 ====================
export const processContentArray = (contentArray, messageData, isHumanMessage = false) => {
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
};

// ==================== 处理消息中的图片文件 ====================
export const processMessageImages = (message, messageData) => {
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
};

// ==================== 处理Gemini格式的图片 ====================
export const processGeminiImage = (imgData, itemIndex, imgIndex, platform) => {
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
};

// ==================== 生成最终显示文本 ====================
export const finalizeDisplayText = (messageData, isHumanMessage = false) => {
  const attachImages = messageData.images.filter(img => !img.placeholder);
  if (attachImages.length > 0) {
    const imageMarkdown = attachImages.map((img, idx) => `[图片${idx + 1}: ${img.file_name}]`).join(' ');
    messageData.display_text = `${imageMarkdown}\n\n${messageData.display_text}`.trim();
  }
};

// ==================== 提取artifact信息 ====================
export const extractArtifact = (artifactItem) => {
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
    }
    if (command === "update" || command === "rewrite") {
      return {
        id: input.id || "",
        command,
        old_str: input.old_str || "",
        new_str: input.new_str || "",
        result: null
      };
    }
  } catch (error) {
    console.error("[Parser] 提取artifact时出错:", error);
  }
  return null;
};

// ==================== 提取工具使用信息 ====================
export const extractToolUse = (toolItem) => {
  const toolData = {
    name: toolItem.name || "unknown",
    input: toolItem.input || {},
    result: null
  };
  if (toolItem.name === "web_search" && toolItem.input?.query) {
    toolData.query = toolItem.input.query;
  }
  return toolData;
};

// ==================== 提取工具结果信息 ====================
export const extractToolResult = (resultItem) => {
  return {
    name: resultItem.name || "unknown",
    is_error: resultItem.is_error || false,
    content: resultItem.content || []
  };
};

// ==================== 分支检测通用函数 ====================
// 构建消息父子关系映射
export const buildMessageMaps = (messages) => {
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

// 标记分支路径
export const markBranchPath = (nodeUuid, branchPath, level, messageMap, parentChildMap, visited) => {
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
};

// 提取分支信息
export const extractBranchInfo = (messages) => {
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
};

// ==================== 图片显示 ====================
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
