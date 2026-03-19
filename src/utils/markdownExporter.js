// utils/markdownExporter.js
// 扩展模式下的 Markdown 静默导出：处理图片 ZIP 打包与记忆上下文注入

import { extractChatData, detectBranches, DateTimeUtils } from './fileParser';
import { getRenameManager } from './data/renameManager.js';
import {
  formatAttachments as formatAttachmentsHelper,
  formatThinking as formatThinkingHelper,
  formatArtifact as formatArtifactHelper,
  formatTool as formatToolHelper,
  formatCitations as formatCitationsHelper,
  getBranchMarker as getBranchMarkerHelper,
  getSenderLabel as getSenderLabelHelper,
  toExcelColumn,
  toRoman
} from './formatHelpers';
import { t } from '../index.js';
import * as fflateStatic from 'fflate';

const gt = (key) => t(`exportManager.${key}`);

export const ExportConfig = {
  DEFAULT: {
    includeThinking: true,
    includeTools: true,
    includeArtifacts: true,
    includeCitations: true,
    includeAttachments: true,
    includeTimestamps: false,
    excludeDeleted: true,
    includeCompleted: false,
    includeImportant: false,
  }
};

export class MarkdownGenerator {
  constructor(config = {}) {
    this.config = { ...ExportConfig.DEFAULT, ...config };
    this.renameManager = getRenameManager();
  }

  generate(processedData) {
    const sections = [
      this.generateMetadata(processedData),
      this.generateHeader(processedData),
      this.generateMessages(processedData),
      this.generateFooter(processedData)
    ];
    return sections.filter(Boolean).join('\n');
  }

  generateMetadata(processedData) {
    if (!this.config.exportObsidianMetadata) return '';
    const uuid = this.config.conversationUuid || processedData.meta_info?.uuid;
    const originalTitle = processedData.meta_info?.title || gt('metadata.defaultTitle');
    const title = uuid ? this.renameManager.getRename(uuid, originalTitle) : originalTitle;
    const lines = [
      '---',
      `title: ${title}`,
      `date: ${DateTimeUtils.getCurrentDate()}`,
      `export_time: ${DateTimeUtils.formatDateTime(new Date())}`,
      '---', ''
    ];
    return lines.join('\n');
  }

  generateHeader(processedData) {
    const { meta_info = {} } = processedData;
    const uuid = this.config.conversationUuid || meta_info.uuid;
    const originalTitle = meta_info.title || gt('metadata.defaultTitle');
    const title = uuid ? this.renameManager.getRename(uuid, originalTitle) : originalTitle;
    const lines = [
      `# ${title}`,
      `*${gt('metadata.created')}: ${meta_info.created_at || gt('metadata.unknown')}*`,
      `*${gt('metadata.exportTime')}: ${DateTimeUtils.formatDateTime(new Date())}*`,
      '', '---', ''
    ];
    return lines.join('\n');
  }

  generateMessages(processedData) {
    const { chat_history = [] } = processedData;
    const filteredMessages = this.filterMessages(chat_history);
    if (filteredMessages.length === 0) return gt('messages.noMatchingMessages') + '\n';
    return filteredMessages.map((msg, index) => this.formatMessage(msg, index + 1)).join('\n---\n\n');
  }

  generateFooter(processedData) {
    const { chat_history = [] } = processedData;
    const filteredMessages = this.filterMessages(chat_history);
    const originalCount = chat_history.length;
    if (filteredMessages.length < originalCount) {
      const message = gt('messages.exportedCount')
        .replace('{{count}}', filteredMessages.length)
        .replace('{{total}}', originalCount);
      return '\n' + message;
    }
    return '';
  }

  filterMessages(messages) {
    let filtered = [...messages];
    const marks = this.config.marks || { completed: new Set(), important: new Set(), deleted: new Set() };
    if (this.config.excludeDeleted) filtered = filtered.filter(msg => !marks.deleted.has(msg.index));
    if (this.config.includeCompleted && this.config.includeImportant) {
      filtered = filtered.filter(msg => marks.completed.has(msg.index) && marks.important.has(msg.index));
    } else if (this.config.includeCompleted) {
      filtered = filtered.filter(msg => marks.completed.has(msg.index));
    } else if (this.config.includeImportant) {
      filtered = filtered.filter(msg => marks.important.has(msg.index));
    }
    return filtered;
  }

  formatMessage(msg, index) {
    const lines = [];
    const branchMarker = this.config.includeBranchMarkers ? getBranchMarkerHelper(msg) : '';
    lines.push(this.formatMessageTitle(msg, index, branchMarker));
    if (this.config.includeTimestamps && msg.timestamp) lines.push(`*${msg.timestamp}*`);
    lines.push('');
    const thinkingFormat = this.config.thinkingFormat || 'codeblock';
    if (msg.thinking && this.config.includeThinking && msg.sender !== 'human' &&
        (thinkingFormat === 'codeblock' || thinkingFormat === 'xml')) {
      lines.push(formatThinkingHelper(msg.thinking, thinkingFormat, gt('format.thinkingLabel')));
    }
    if (msg.display_text) lines.push(msg.display_text, '');
    if (msg.attachments?.length > 0 && this.config.includeAttachments && msg.sender === 'human') {
      lines.push(formatAttachmentsHelper(msg.attachments, this.config));
    }
    if (msg.thinking && this.config.includeThinking && msg.sender !== 'human' && thinkingFormat === 'emoji') {
      lines.push(formatThinkingHelper(msg.thinking, thinkingFormat, gt('format.thinkingLabel')));
    }
    if (msg.artifacts?.length > 0 && this.config.includeArtifacts && msg.sender !== 'human') {
      msg.artifacts.forEach(artifact => lines.push(formatArtifactHelper(artifact, gt)));
    }
    if (msg.tools?.length > 0 && this.config.includeTools) {
      msg.tools.forEach(tool => lines.push(formatToolHelper(tool, gt)));
    }
    if (msg.citations?.length > 0 && this.config.includeCitations) {
      lines.push(formatCitationsHelper(msg.citations, gt));
    }
    return lines.join('\n');
  }

  formatMessageTitle(msg, index, branchMarker) {
    let title = '';
    if (this.config.includeHeaderPrefix) title += '#'.repeat(this.config.headerLevel || 2) + ' ';
    if (this.config.includeNumbering) {
      const fmt = this.config.numberingFormat || 'numeric';
      if (fmt === 'numeric') title += `${index}. `;
      else if (fmt === 'letter') title += `${toExcelColumn(index)}. `;
      else if (fmt === 'roman') title += `${toRoman(index)}. `;
    }
    title += getSenderLabelHelper(msg, this.config) + branchMarker;
    return title;
  }
}

export class FileExporter {
  static saveTextFile(text, fileName) {
    try {
      const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error('保存文件失败:', error);
      return false;
    }
  }

  static async exportSingleFile(data, config = {}) {
    const generator = new MarkdownGenerator(config);
    const markdown = generator.generate(data);
    const conversationUuid = config.conversationUuid || data._exportConfig?.conversationUuid;
    const fileName = this.generateFileName(data, conversationUuid);
    return this.saveTextFile(markdown, fileName);
  }

  static generateFileName(data, conversationUuid = null) {
    const date = DateTimeUtils.getCurrentDate();
    const renameManager = getRenameManager();
    const uuid = conversationUuid || data._exportConfig?.conversationUuid || data.meta_info?.uuid;
    const originalTitle = data.meta_info?.title || 'conversation';
    const title = uuid ? renameManager.getRename(uuid, originalTitle) : originalTitle;
    const cleanTitle = title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
    return `${cleanTitle}_${date}.md`;
  }
}


/**
 * 构建记忆上下文 Markdown 块（插入在对话消息之前）
 * @param {Object} exportContext - { projectInfo?, userMemory? }
 * @param {Array} knowledgeFileRefs - [{ name, zipPath }] 知识库文件的 ZIP 路径引用
 */
// 将任意值转为可读字符串（应对 API 返回对象的情况）
function toStr(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') return JSON.stringify(val, null, 2);
  return String(val);
}

function buildContextBlock(exportContext, knowledgeFileRefs) {
  if (!exportContext) return '';
  const { projectInfo, userMemory } = exportContext;
  if (!projectInfo && !userMemory) return '';

  const parts = [];

  if (userMemory) {
    const memories = toStr(userMemory.memories);
    if (memories) {
      parts.push(`<userMemories>${memories.replace(/\n/g, '\\n')}</userMemories>`);
    }
    const preferences = toStr(userMemory.preferences);
    if (preferences) {
      parts.push(`<userPreferences>${preferences.replace(/\n/g, '\\n')}</userPreferences>`);
    }
  }

  if (projectInfo) {
    const memory = toStr(projectInfo.memory);
    if (memory) {
      parts.push(`<projectMemories>${memory.replace(/\n/g, '\\n')}</projectMemories>`);
    }
    const instructions = toStr(projectInfo.instructions);
    if (instructions) {
      parts.push(`<projectInstructions>${instructions.replace(/\n/g, '\\n')}</projectInstructions>`);
    }
    if (knowledgeFileRefs && knowledgeFileRefs.length > 0) {
      const knowledgeContent = knowledgeFileRefs.map(({ name, zipPath }) => `- [${name}](${zipPath})`).join('\\n');
      parts.push(`<projectKnowledge>${knowledgeContent}</projectKnowledge>`);
    }
  }

  if (parts.length === 0) return '';
  return parts.join('') + '\n\n---\n\n';
}

/**
 * 替换 display_text 中的图片占位符为 Markdown 图片引用
 * 同时收集需要打包进 ZIP 的图片
 */
function processImagesInMessages(messages) {
  const imageFiles = []; // [{ zipPath, base64Data, mimeType }]

  const processed = messages.map(msg => {
    if (!msg.images || msg.images.length === 0) return msg;

    let text = msg.display_text || '';
    const newImages = [];

    msg.images.forEach((img, idx) => {
      const placeholder = img.placeholder || ` [图片${idx + 1}] `;
      const embeddedData = img.embedded_image?.data || (img.is_embedded_image ? img.link : null);

      if (embeddedData) {
        // 提取 mime type 和 base64
        const match = embeddedData.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          const mimeType = match[1];
          const ext = mimeType.split('/')[1] || 'jpg';
          const imgIndex = imageFiles.length + 1;
          const zipPath = `images/img_${String(imgIndex).padStart(3, '0')}.${ext}`;
          imageFiles.push({ zipPath, base64Data: match[2], mimeType });
          // 替换占位符
          text = text.replace(placeholder.trim(), `![${img.file_name || `image_${imgIndex}`}](${zipPath})`);
          newImages.push({ ...img, _zipPath: zipPath });
        } else {
          newImages.push(img);
        }
      } else {
        newImages.push(img);
      }
    });

    return { ...msg, display_text: text, images: newImages };
  });

  return { messages: processed, imageFiles };
}

/**
 * 从 popup config 对象构建 MarkdownGenerator 的 config
 */
function buildGeneratorConfig(exportConfig) {
  return {
    includeTimestamps: !!exportConfig.includeTimestamps,
    includeThinking: !!exportConfig.includeThinking,
    includeArtifacts: !!exportConfig.includeArtifacts,
    includeTools: !!exportConfig.includeTools,
    includeCitations: !!exportConfig.includeCitations,
    includeAttachments: !!exportConfig.includeAttachments,
    includeBranchMarkers: exportConfig.includeBranchMarkers !== false,
    includeNumbering: exportConfig.includeNumbering !== false,
    numberingFormat: exportConfig.numberingFormat || 'numeric',
    senderFormat: exportConfig.senderFormat || 'default',
    humanLabel: exportConfig.humanLabel || 'Human',
    assistantLabel: exportConfig.assistantLabel || 'Claude',
    includeHeaderPrefix: exportConfig.includeHeaderPrefix !== false,
    headerLevel: exportConfig.headerLevel || 2,
    thinkingFormat: exportConfig.thinkingFormat || 'codeblock',
    conversationUuid: exportConfig.conversationUuid || null,
  };
}

/**
 * 主函数：从 pendingData（扩展传入的原始 JSON + exportContext）生成 Markdown 导出包
 *
 * @param {string} jsonContent - JSON.stringify 的对话数据
 * @param {string} baseFilename - 不含扩展名的文件名
 * @param {Object} exportConfig - popup 的 loominary_export_config
 * @param {Object} exportContext - { projectInfo?, userMemory? }
 * @returns {{ needsZip: boolean, mdText: string, imageFiles, knowledgeFiles, filename }}
 */
export function prepareMarkdownExport(jsonContent, baseFilename, exportConfig = {}, exportContext = null, exportOptions = null, displayMessages = null, markManagerRef = null) {
  const jsonData = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;

  let processedData;
  if (jsonData.chat_history && jsonData.format) {
    processedData = jsonData;
  } else {
    processedData = extractChatData(jsonData, `${baseFilename}.json`);
  }
  processedData = detectBranches(processedData);

  // 根据 scope 决定消息来源
  let sourceMessages;
  if (exportOptions?.scope === 'currentBranch' && displayMessages?.length > 0) {
    // 当前分支：使用时间线中实际显示的消息（已经过分支过滤）
    sourceMessages = displayMessages;
  } else {
    // 全部分支：使用全部消息（不过滤分支）
    sourceMessages = processedData.chat_history || [];
  }

  // 根据 marks filter 过滤消息
  if (exportOptions && markManagerRef?.current) {
    const marks = markManagerRef.current.getMarks();
    if (exportOptions.excludeDeleted) {
      sourceMessages = sourceMessages.filter(msg => !marks.deleted.has(msg.index));
    }
    if (exportOptions.includeCompleted && exportOptions.includeImportant) {
      sourceMessages = sourceMessages.filter(msg => marks.completed.has(msg.index) && marks.important.has(msg.index));
    } else if (exportOptions.includeCompleted) {
      sourceMessages = sourceMessages.filter(msg => marks.completed.has(msg.index));
    } else if (exportOptions.includeImportant) {
      sourceMessages = sourceMessages.filter(msg => marks.important.has(msg.index));
    }
  }

  // 处理图片
  const { messages: messagesWithImageRefs, imageFiles } = processImagesInMessages(sourceMessages);

  // 处理 knowledge 文件
  const knowledgeFiles = []; // [{ zipPath, content }]
  const knowledgeFileRefs = []; // 供 contextBlock 使用

  if (exportContext?.projectInfo?.knowledgeFiles) {
    exportContext.projectInfo.knowledgeFiles.forEach(({ name, content }) => {
      const ext = name.match(/\.([^.]+)$/)?.[1] || 'txt';
      const safeName = name.replace(/[<>:"/\\|?*]/g, '_');
      const zipPath = `knowledge/${safeName}`;
      knowledgeFiles.push({ zipPath, content });
      knowledgeFileRefs.push({ name, zipPath });
    });
  }

  // 构建记忆/项目上下文块
  const contextBlock = buildContextBlock(exportContext, knowledgeFileRefs);

  // 生成 Markdown 正文
  const genConfig = buildGeneratorConfig(exportConfig);
  const generator = new MarkdownGenerator(genConfig);
  const bodyData = {
    ...processedData,
    chat_history: messagesWithImageRefs,
  };
  const bodyMd = generator.generate(bodyData);

  // 拼接：上下文块 + 正文
  const mdText = contextBlock ? contextBlock + bodyMd : bodyMd;

  const needsZip = imageFiles.length > 0 || knowledgeFiles.length > 0;
  const filename = needsZip ? `${baseFilename}.zip` : `${baseFilename}.md`;

  return { needsZip, mdText, imageFiles, knowledgeFiles, filename };
}

/**
 * 触发下载（纯 md 或 zip）
 * 在 React App 的 useEffect 里调用，需要 window.fflate（已由扩展注入）或 import fflate
 *
 * @param {Object} result - prepareMarkdownExport 返回值
 */
export async function downloadMarkdownExport(result) {
  const { needsZip, mdText, imageFiles, knowledgeFiles, filename } = result;

  if (!needsZip) {
    // 直接下载 .md
    const blob = new Blob([mdText], { type: 'text/markdown;charset=utf-8' });
    triggerDownload(blob, filename);
    return;
  }

  // 打包 ZIP
  const fflate = (typeof window !== 'undefined' && window.fflate) ? window.fflate : fflateStatic;

  const entries = {};

  // conversation.md
  entries['conversation.md'] = fflate.strToU8(mdText);

  // images/
  for (const { zipPath, base64Data } of imageFiles) {
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    entries[zipPath] = bytes;
  }

  // knowledge/
  for (const { zipPath, content } of knowledgeFiles) {
    entries[zipPath] = fflate.strToU8(content);
  }

  await new Promise((resolve, reject) => {
    fflate.zip(entries, { level: 1 }, (err, data) => {
      if (err) { reject(err); return; }
      const blob = new Blob([data], { type: 'application/zip' });
      triggerDownload(blob, filename);
      resolve();
    });
  });
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  (document.body || document.documentElement).appendChild(a);
  a.click();
  // 延迟清理，确保浏览器已接收到下载请求（Firefox 需要更长时间）
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 500);
}
