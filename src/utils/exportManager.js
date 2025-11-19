// utils/exportManager.js
import { StorageUtils } from '../App';
import { DateTimeUtils, FileUtils } from './fileParser';
import { generateFileCardUuid, generateConversationCardUuid, parseUuid, generateFileHash } from './data/uuidManager';
import { extractChatData, detectBranches } from './fileParser';
import { MarkManager } from './data/markManager';
import { SortManager } from './data/sortManager';
import { getRenameManager } from './renameManager';
import {
  escapeXml,
  formatAttachments as formatAttachmentsHelper,
  wrapWithDetails,
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

/**
 * 导出配置
 */
export const ExportConfig = {
  DEFAULT: {
    includeThinking: true,
    includeTools: true,
    includeArtifacts: true,
    includeCitations: true,
    includeAttachments: true,
    includeTimestamps: false,
    exportObsidianMetadata: false,
    exportMarkedOnly: false,
    excludeDeleted: true,
    includeCompleted: false,
    includeImportant: false,
    obsidianProperties: [],
    obsidianTags: []
  }
};

// 辅助函数：获取翻译文本
const gt = (key) => t(`exportManager.${key}`);

/**
 * Markdown生成器类
 */
export class MarkdownGenerator {
  constructor(config = {}) {
    this.config = { ...ExportConfig.DEFAULT, ...config };
    this.renameManager = getRenameManager();
  }

  /**
   * 生成完整的Markdown文档
   */
  generate(processedData) {
    const sections = [
      this.generateMetadata(processedData),
      this.generateHeader(processedData),
      this.generateMessages(processedData),
      this.generateFooter(processedData)
    ];

    return sections.filter(Boolean).join('\n');
  }

  /**
   * 生成YAML前置元数据
   */
  generateMetadata(processedData) {
    if (!this.config.exportObsidianMetadata) return '';

    const uuid = this.config.conversationUuid || processedData.meta_info?.uuid;
    const originalTitle = processedData.meta_info?.title || gt('metadata.defaultTitle');
    const title = uuid ? this.renameManager.getRename(uuid, originalTitle) : originalTitle;

    const lines = [
      '---',
      `title: ${title}`,
      `date: ${DateTimeUtils.getCurrentDate()}`,
      `export_time: ${DateTimeUtils.formatDateTime(new Date())}`
    ];

    // 添加自定义属性
    if (this.config.obsidianProperties?.length > 0) {
      this.config.obsidianProperties.forEach(prop => {
        if (prop.value.includes(',')) {
          const values = prop.value.split(',').map(v => v.trim());
          lines.push(`${prop.name}:`);
          values.forEach(v => lines.push(`  - ${v}`));
        } else {
          lines.push(`${prop.name}: ${prop.value}`);
        }
      });
    }

    // 添加标签
    if (this.config.obsidianTags?.length > 0) {
      lines.push('tags:');
      this.config.obsidianTags.forEach(tag => lines.push(`  - ${tag}`));
    }

    lines.push('---', '');
    return lines.join('\n');
  }

  /**
   * 生成文档头部
   */
  generateHeader(processedData) {
    const { meta_info = {} } = processedData;
    const uuid = this.config.conversationUuid || meta_info.uuid;
    const originalTitle = meta_info.title || gt('metadata.defaultTitle');
    const title = uuid ? this.renameManager.getRename(uuid, originalTitle) : originalTitle;

    const lines = [
      `# ${title}`,
      `*${gt('metadata.created')}: ${meta_info.created_at || gt('metadata.unknown')}*`,
      `*${gt('metadata.exportTime')}: ${DateTimeUtils.formatDateTime(new Date())}*`
    ];

    const hasFiltering = this.config.excludeDeleted || this.config.includeCompleted || this.config.includeImportant;
    if (hasFiltering) {
      const filterDesc = this.getFilterDescription();
      if (filterDesc) {
        lines.push(`*${gt('metadata.filterCondition')}: ${filterDesc}*`);
      }
    }

    lines.push('', '---', '');
    return lines.join('\n');
  }

  /**
   * 生成消息内容
   */
  generateMessages(processedData) {
    const { chat_history = [] } = processedData;
    const filteredMessages = this.filterMessages(chat_history);

    if (filteredMessages.length === 0) {
      return gt('messages.noMatchingMessages') + '\n';
    }

    return filteredMessages
      .map((msg, index) => this.formatMessage(msg, index + 1))
      .join('\n---\n\n');
  }

  /**
   * 生成文档尾部
   */
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

  /**
   * 过滤消息
   */
  filterMessages(messages) {
    let filtered = [...messages];
    
    // 获取标记数据
    const marks = this.config.marks || { completed: new Set(), important: new Set(), deleted: new Set() };

    // 排除已删除的消息
    if (this.config.excludeDeleted) {
      filtered = filtered.filter(msg => !marks.deleted.has(msg.index));
    }

    // 仅包含已完成的消息
    if (this.config.includeCompleted && !this.config.includeImportant) {
      filtered = filtered.filter(msg => marks.completed.has(msg.index));
    }
    
    // 仅包含重要的消息
    if (this.config.includeImportant && !this.config.includeCompleted) {
      filtered = filtered.filter(msg => marks.important.has(msg.index));
    }
    
    // 同时包含已完成和重要的消息
    if (this.config.includeCompleted && this.config.includeImportant) {
      filtered = filtered.filter(msg => 
        marks.completed.has(msg.index) && marks.important.has(msg.index)
      );
    }

    return filtered;
  }



  /**
  * 格式化单条消息
  */
  formatMessage(msg, index) {
  const lines = [];

  // 标题 - 使用配置的格式
  const branchMarker = this.getBranchMarker(msg);
  const title = this.formatMessageTitle(msg, index, branchMarker);
    lines.push(title);

  // 时间戳
  if (this.config.includeTimestamps && msg.timestamp) {
    lines.push(`*${msg.timestamp}*`);
    }

    lines.push('');

  // 思考过程(前置) - 仅对非人类消息,且格式为 codeblock 或 xml
  const thinkingFormat = this.config.thinkingFormat || 'codeblock';
  if (msg.thinking && this.config.includeThinking && msg.sender !== 'human' && 
      (thinkingFormat === 'codeblock' || thinkingFormat === 'xml')) {
    lines.push(this.formatThinking(msg.thinking));
  }

  // 正文
  if (msg.display_text) {
    lines.push(msg.display_text, '');
    }

    // 附件(仅对人类消息,且配置开启时)
    if (msg.attachments?.length > 0 && this.config.includeAttachments && msg.sender === 'human') {
      lines.push(this.formatAttachments(msg.attachments));
    }

    // 思考过程(后置) - 仅对非人类消息,且格式为 emoji
    if (msg.thinking && this.config.includeThinking && msg.sender !== 'human' && 
        thinkingFormat === 'emoji') {
      lines.push(this.formatThinking(msg.thinking));
    }

    // Artifacts(仅对非人类消息)
    if (msg.artifacts?.length > 0 && this.config.includeArtifacts && msg.sender !== 'human') {
      msg.artifacts.forEach(artifact => {
        lines.push(this.formatArtifact(artifact));
      });
    }

    // 工具使用
    if (msg.tools?.length > 0 && this.config.includeTools) {
      msg.tools.forEach(tool => {
        lines.push(this.formatTool(tool));
      });
    }

    // 引用
    if (msg.citations?.length > 0 && this.config.includeCitations) {
      lines.push(this.formatCitations(msg.citations));
    }

    return lines.join('\n');
  }

  /**
   * 格式化思考过程
   */
  formatThinking(thinking) {
    const format = this.config.thinkingFormat || 'codeblock';
    return formatThinkingHelper(thinking, format, gt('format.thinkingLabel'));
  }

  /**
   * 格式化附件 - 使用共享辅助函数
   */
  formatAttachments(attachments) {
    return formatAttachmentsHelper(attachments, this.config);
  }


  /**
   * 格式化Artifact
   */
  formatArtifact(artifact) {
    return formatArtifactHelper(artifact, gt);
  }

  /**
   * 格式化工具使用
   */
  formatTool(tool) {
    return formatToolHelper(tool, gt);
  }

  /**
   * 格式化引用
   */
  formatCitations(citations) {
    return formatCitationsHelper(citations, gt);
  }

  /**
   * 获取分支标记
   */
  getBranchMarker(msg) {
    return getBranchMarkerHelper(msg);
  }

  /**
   * 格式化消息标题
   */
  formatMessageTitle(msg, index, branchMarker) {
    let title = '';
    
    // 标题前缀 (#)
    if (this.config.includeHeaderPrefix) {
      title += '#'.repeat(this.config.headerLevel || 2) + ' ';
    }
    
    // 序号
    if (this.config.includeNumbering) {
      const numberFormat = this.config.numberingFormat || 'numeric';
      if (numberFormat === 'numeric') {
        title += `${index}. `;
      } else if (numberFormat === 'letter') {
        title += `${toExcelColumn(index)}. `;
      } else if (numberFormat === 'roman') {
        title += `${toRoman(index)}. `;
      }
    }
    
    // 发送者标签
    const senderLabel = this.getSenderLabel(msg);
    title += senderLabel + branchMarker;
    
    return title;
  }
  
  /**
   * 获取发送者标签
   */
  getSenderLabel(msg) {
    return getSenderLabelHelper(msg, this.config);
  }
  

  /**
   * 获取筛选描述
   */
  getFilterDescription() {
    const filters = [];

    if (this.config.excludeDeleted) {
      filters.push(gt('filters.excludeDeleted'));
    }

    if (this.config.includeCompleted && this.config.includeImportant) {
      filters.push(gt('filters.completedAndImportant'));
    } else if (this.config.includeCompleted) {
      filters.push(gt('filters.onlyCompleted'));
    } else if (this.config.includeImportant) {
      filters.push(gt('filters.onlyImportant'));
    }

    return filters.join(',');
  }
}

/**
 * 文件导出器类
 */
export class FileExporter {
  /**
   * 保存文本到文件
   */
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
      alert(gt('errors.saveFileFailed'));
      return false;
    }
  }

  /**
   * 导出单个文件
   */
  static async exportSingleFile(data, config = {}) {
    const generator = new MarkdownGenerator(config);
    const markdown = generator.generate(data);
    const conversationUuid = config.conversationUuid || data._exportConfig?.conversationUuid;
    const fileName = this.generateFileName(data, 'single', conversationUuid);

    return this.saveTextFile(markdown, fileName);
  }

  /**
   * 导出多个文件
   */
  static async exportMultipleFiles(dataList, config = {}) {
    const sections = dataList.map((data) => {
      const fileConfig = {
        ...config,
        marks: { completed: new Set(), important: new Set(), deleted: new Set() },
        conversationUuid: data._exportConfig?.conversationUuid
      };

      const generator = new MarkdownGenerator(fileConfig);
      return generator.generate(data);
    });

    const combined = sections.join('\n\n---\n---\n\n');
    const fileName = this.generateFileName(null, 'multiple');

    return this.saveTextFile(combined, fileName);
  }

  /**
   * 生成文件名
   */
  static generateFileName(data, type = 'single', conversationUuid = null) {
    const date = DateTimeUtils.getCurrentDate();
    const renameManager = getRenameManager();

    if (type === 'single' && data) {
      const uuid = conversationUuid || data._exportConfig?.conversationUuid || data.meta_info?.uuid;
      const originalTitle = data.meta_info?.title || 'conversation';
      const title = uuid ? renameManager.getRename(uuid, originalTitle) : originalTitle;
      const cleanTitle = title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
      return `${cleanTitle}_${date}.md`;
    }

    return `export_${date}.md`;
  }
}

/**
 * 辅助函数：处理单个文件
 */
async function processFileForExport(file, fileIndex) {
  const text = await file.text();
  const jsonData = JSON.parse(text);
  let data = extractChatData(jsonData, file.name);
  data = detectBranches(data);
  return data;
}

/**
 * 根据导出选项筛选消息
 */
function filterMessagesByOptions(messages, exportOptions, markManagerRef) {
  return messages.filter(msg => {
    const marks = markManagerRef?.current ? {
      completed: markManagerRef.current.isMarked(msg.index, 'completed'),
      important: markManagerRef.current.isMarked(msg.index, 'important'),
      deleted: markManagerRef.current.isMarked(msg.index, 'deleted')
    } : {
      completed: false,
      important: false,
      deleted: false
    };

    // 排除已删除
    if (exportOptions.excludeDeleted && marks.deleted) {
      return false;
    }

    // 仅已完成
    if (exportOptions.includeCompleted && !marks.completed) {
      return false;
    }

    // 仅重点
    if (exportOptions.includeImportant && !marks.important) {
      return false;
    }

    // 已完成且重点（同时满足两个条件）
    if (exportOptions.includeCompleted && exportOptions.includeImportant) {
      if (!marks.completed || !marks.important) {
        return false;
      }
    }

    return true;
  });
}

/**
 * 处理导出操作
 */
export async function handleExport({
  exportOptions,
  processedData,
  sortManagerRef,
  sortedMessages,
  markManagerRef,
  currentBranchState,
  operatedFiles,
  files,
  currentFileIndex,
  displayMessages,
  i18n,
  openScreenshotPreview,  // 新增：打开截图预览面板的回调
  currentTheme,            // 新增：当前主题
  conversation             // 新增：当前对话信息
}) {
  try {
    // 检查是否为PDF导出
    if (exportOptions.exportFormat === 'pdf') {
      // PDF导出只支持当前对话或当前分支
      if (exportOptions.scope !== 'current' && exportOptions.scope !== 'currentBranch') {
        alert(gt('errors.pdfOnlySupportsCurrent'));
        return false;
      }

      // 准备要导出的消息
      let messagesToExport = [];
      if (exportOptions.scope === 'current') {
        messagesToExport = sortManagerRef?.current?.hasCustomSort() ?
          sortedMessages : (processedData.chat_history || []);
      } else if (exportOptions.scope === 'currentBranch') {
        const branchMessages = displayMessages || processedData.chat_history || [];
        messagesToExport = sortManagerRef?.current?.hasCustomSort() ?
          sortManagerRef.current.getSortedMessages().filter(msg =>
            branchMessages.some(bm => bm.uuid === msg.uuid)
          ) : branchMessages;
      }

      // 应用筛选条件
      const filteredMessages = filterMessagesByOptions(messagesToExport, exportOptions, markManagerRef);

      if (filteredMessages.length === 0) {
        alert(gt('errors.noMatchingMessages'));
        return false;
      }

      // 动态导入PDF导出管理器
      const { PDFExportManager } = await import('./export/pdfExportManager');
      const pdfManager = new PDFExportManager();

      // 获取最后更新时间
      const getLastUpdatedTime = (messages) => {
        if (!messages || messages.length === 0) return null;
        const lastMsg = messages[messages.length - 1];
        return lastMsg.timestamp || null;
      };

      // 导出PDF
      return pdfManager.exportToPDF(
        filteredMessages,
        {
          name: processedData?.meta_info?.title || 'Conversation',
          platform: processedData?.meta_info?.platform || 'Claude',
          created_at: processedData?.meta_info?.created_at,
          updated_at: getLastUpdatedTime(filteredMessages)
        },
        {
          includeThinking: exportOptions.includeThinking,
          includeArtifacts: exportOptions.includeArtifacts,
          includeTimestamps: exportOptions.includeTimestamps,
          includeTools: exportOptions.includeTools,
          includeCitations: exportOptions.includeCitations
        }
      );
    }

    // 检查是否为截图导出
    if (exportOptions.exportFormat === 'screenshot') {
      // 截图导出只支持当前对话或当前分支
      if (exportOptions.scope !== 'current' && exportOptions.scope !== 'currentBranch') {
        alert(gt('errors.screenshotOnlySupportsCurrent'));
        return false;
      }

      // 准备要导出的消息
      let messagesToExport = [];
      if (exportOptions.scope === 'current') {
        messagesToExport = sortManagerRef?.current?.hasCustomSort() ?
          sortedMessages : (processedData.chat_history || []);
      } else if (exportOptions.scope === 'currentBranch') {
        const branchMessages = displayMessages || processedData.chat_history || [];
        messagesToExport = sortManagerRef?.current?.hasCustomSort() ?
          sortManagerRef.current.getSortedMessages().filter(msg =>
            branchMessages.some(bm => bm.uuid === msg.uuid)
          ) : branchMessages;
      }

      // 应用筛选条件
      const filteredMessages = filterMessagesByOptions(messagesToExport, exportOptions, markManagerRef);

      if (filteredMessages.length === 0) {
        alert(gt('errors.noMatchingMessages'));
        return false;
      }

      // 添加标记信息到消息中
      const messagesWithMarks = filteredMessages.map(msg => ({
        ...msg,
        marks: {
          completed: markManagerRef?.current?.isMarked(msg.index, 'completed'),
          important: markManagerRef?.current?.isMarked(msg.index, 'important'),
          deleted: markManagerRef?.current?.isMarked(msg.index, 'deleted')
        }
      }));

      // 打开截图预览面板
      // 注意：所有截图设置(宽度、高度、质量)现在统一由预览面板管理
      if (openScreenshotPreview) {
        openScreenshotPreview({
          conversation: conversation || {
            name: processedData?.meta_info?.title || 'conversation',
            uuid: processedData?.meta_info?.uuid
          },
          initialMessages: messagesWithMarks,
          exportOptions: {}, // 空对象，使用预览面板的默认设置
          currentTheme: currentTheme || 'light',
          platform: processedData?.meta_info?.platform || 'claude',
          format: processedData?.format || 'claude'
        });
      }

      return true;
    }

    // 原有的 Markdown 导出逻辑
    const exportFormatConfig = StorageUtils.getLocalStorage('export-config', {
      includeNumbering: true,
      numberingFormat: 'numeric',
      senderFormat: 'default',
      humanLabel: 'Human',
      assistantLabel: 'Assistant',
      includeHeaderPrefix: true,
      headerLevel: 2
    });

    let dataToExport = [];
    
    switch (exportOptions.scope) {
      case 'current':
        if (processedData) {
          const messagesToExport = sortManagerRef?.current?.hasCustomSort() ?
            sortedMessages : (processedData.chat_history || []);

          // 内联：获取对话UUID
          let conversationUuid = null;
          if (processedData.format === 'claude_full_export') {
            const uuid = exportOptions.selectedConversationUuid || processedData.meta_info?.uuid;
            if (uuid && files[currentFileIndex]) {
              conversationUuid = generateConversationCardUuid(currentFileIndex, uuid, files[currentFileIndex]);
            }
          } else if (files[currentFileIndex]) {
            conversationUuid = generateFileCardUuid(currentFileIndex, files[currentFileIndex]);
          }

          dataToExport = [{
            ...processedData,
            chat_history: messagesToExport,
            _exportConfig: { conversationUuid }
          }];
        }
        break;
      
      case 'currentBranch':
        if (processedData && processedData.chat_history) {
          let branchMessages = displayMessages || processedData.chat_history || [];

          const messagesToExport = sortManagerRef?.current?.hasCustomSort() ?
            sortManagerRef.current.getSortedMessages().filter(msg =>
              branchMessages.some(bm => bm.uuid === msg.uuid)
            ) : branchMessages;

          // 内联：获取对话UUID
          let conversationUuid = null;
          if (processedData.format === 'claude_full_export') {
            const uuid = processedData.meta_info?.uuid;
            if (uuid && files[currentFileIndex]) {
              conversationUuid = generateConversationCardUuid(currentFileIndex, uuid, files[currentFileIndex]);
            }
          } else if (files[currentFileIndex]) {
            conversationUuid = generateFileCardUuid(currentFileIndex, files[currentFileIndex]);
          }

          dataToExport = [{
            ...processedData,
            chat_history: messagesToExport,
            _exportConfig: { conversationUuid }
          }];
        }
        break;
        
      case 'operated':
        const processedFileIndices = new Set();

        for (const fileUuid of operatedFiles) {
          const parsed = parseUuid(fileUuid);
          let fileIndex = -1;
          let isConversation = false;
          let conversationUuid = null;

          if (parsed.conversationUuid) {
            isConversation = true;
            conversationUuid = parsed.conversationUuid;
            fileIndex = parsed.fileIndex;
          } else {
            fileIndex = files.findIndex((file, index) => {
              const fUuid = generateFileCardUuid(index, file);
              return fUuid === fileUuid || fileUuid.includes(generateFileHash(file));
            });
          }

          if (fileIndex !== -1 && !processedFileIndices.has(fileIndex)) {
            const file = files[fileIndex];
            try {
              const data = await processFileForExport(file, fileIndex);

              if (data.format === 'claude_full_export' && isConversation && conversationUuid) {
                const conversation = data.views?.conversationList?.find(
                  conv => conv.uuid === conversationUuid
                );

                if (conversation) {
                  const conversationMessages = data.chat_history?.filter(
                    msg => msg.conversation_uuid === conversationUuid && !msg.is_conversation_header
                  ) || [];

                  const convUuid = generateConversationCardUuid(fileIndex, conversationUuid, file);
                  const convSortManager = new SortManager(conversationMessages, convUuid);
                  const sortedMsgs = convSortManager.getSortedMessages();

                  dataToExport.push({
                    ...data,
                    meta_info: {
                      ...data.meta_info,
                      title: conversation.name || '未命名对话',
                      uuid: conversationUuid
                    },
                    chat_history: sortedMsgs,
                    views: {
                      conversationList: [conversation]
                    },
                    _exportConfig: { conversationUuid: convUuid }
                  });
                }
              } else {
                const fileSortManager = new SortManager(data.chat_history || [], fileUuid);
                const sortedMsgs = fileSortManager.getSortedMessages();

                dataToExport.push({
                  ...data,
                  chat_history: sortedMsgs
                });

                processedFileIndices.add(fileIndex);
              }
            } catch (err) {
              console.error(`无法处理文件 ${file.name}:`, err);
            }
          }
        }
        break;
        
      case 'all':
        for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
          const file = files[fileIndex];
          try {
            const data = await processFileForExport(file, fileIndex);

            const fileUuid = generateFileCardUuid(fileIndex, file);
            const fileSortManager = new SortManager(data.chat_history || [], fileUuid);
            const sortedMsgs = fileSortManager.getSortedMessages();

            dataToExport.push({
              ...data,
              chat_history: sortedMsgs
            });
          } catch (err) {
            console.error(`无法处理文件 ${file.name}:`, err);
          }
        }
        break;
    }
    
    if (dataToExport.length === 0) {
      alert(gt('errors.noDataToExport'));
      return false;
    }

    const success = await exportData({
      scope: dataToExport.length === 1 ? 'current' : 'multiple',
      data: dataToExport.length === 1 ? dataToExport[0] : null,
      dataList: dataToExport,
      config: {
        ...exportOptions,
        ...exportFormatConfig,
        marks: markManagerRef?.current ? markManagerRef.current.getMarks() : {
          completed: new Set(),
          important: new Set(),
          deleted: new Set()
        },
        conversationUuid: dataToExport.length === 1 ? dataToExport[0]._exportConfig?.conversationUuid : null
      }
    });

    return success;
  } catch (error) {
    console.error('导出失败:', error);
    alert(`${gt('errors.exportFailed')}: ${error.message}`);
    return false;
  }
}

/**
 * 主导出函数
 */
export async function exportData(options) {
  const { scope = 'current', data = null, dataList = [], config = {} } = options;

  try {
    switch (scope) {
      case 'current':
        if (!data) throw new Error(gt('errors.noDataToExport'));
        return FileExporter.exportSingleFile(data, config);

      case 'multiple':
        if (dataList.length === 0) throw new Error(gt('errors.noDataToExport'));
        return FileExporter.exportMultipleFiles(dataList, config);

      default:
        throw new Error(`${gt('errors.unknownScope')} ${scope}`);
    }
  } catch (error) {
    console.error('导出失败:', error);
    alert(`${gt('errors.exportFailed')}: ${error.message}`);
    return false;
  }
}