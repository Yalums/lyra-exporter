// utils/exportManager.js
// 重构后的导出管理模块

import { DateTimeUtils, StorageUtils } from './commonUtils';
import { generateFileCardUuid, generateConversationCardUuid, parseUuid, generateFileHash } from './uuidManager';
import { extractChatData, detectBranches } from './fileParser';
import { MarkManager } from './markManager';
import { SortManager } from './sortManager';

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

/**
 * Markdown生成器类
 */
export class MarkdownGenerator {
  constructor(config = {}) {
    this.config = { ...ExportConfig.DEFAULT, ...config };
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

    const lines = [
      '---',
      `title: ${processedData.meta_info?.title || '对话记录'}`,
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
    const lines = [
      `# ${meta_info.title || '对话记录'}`,
      `*创建时间: ${meta_info.created_at || '未知'}*`,
      `*导出时间: ${DateTimeUtils.formatDateTime(new Date())}*`
    ];

    // 如果有筛选条件，添加说明
    const hasFiltering = this.config.excludeDeleted || this.config.includeCompleted || this.config.includeImportant;
    if (hasFiltering) {
      const filterDesc = this.getFilterDescription();
      if (filterDesc) {
        lines.push(`*筛选条件: ${filterDesc}*`);
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
      return '*没有符合条件的消息*\n';
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
      return `\n*根据筛选条件，从 ${originalCount} 条消息中导出了 ${filteredMessages.length} 条消息*`;
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

  // 思考过程（前置）- 仅对非人类消息，且格式为 codeblock 或 xml
  const thinkingFormat = this.config.thinkingFormat || 'codeblock';
  if (msg.thinking && this.config.includeThinking && msg.sender !== 'human' && 
      (thinkingFormat === 'codeblock' || thinkingFormat === 'xml')) {
    lines.push(this.formatThinking(msg.thinking));
  }

  // 正文
  if (msg.display_text) {
    lines.push(msg.display_text, '');
    }

    // 附件（仅对人类消息，且配置开启时）
    if (msg.attachments?.length > 0 && this.config.includeAttachments && msg.sender === 'human') {
      lines.push(this.formatAttachments(msg.attachments));
    }

    // 思考过程（后置）- 仅对非人类消息，且格式为 emoji
    if (msg.thinking && this.config.includeThinking && msg.sender !== 'human' && 
        thinkingFormat === 'emoji') {
      lines.push(this.formatThinking(msg.thinking));
    }

    // Artifacts（仅对非人类消息）
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
    
    switch (format) {
      case 'codeblock':
        // 代码块格式（思考前置）
        return [
          '```thinking',
          thinking,
          '```',
          ''
        ].join('\n');
      
      case 'xml':
        // XML标签格式（思考前置）
        return [
          '<anthropic_thinking>',
          thinking,
          '</anthropic_thinking>',
          ''
        ].join('\n');
      
      case 'emoji':
      default:
        // Emoji格式（内容后置）
        return [
          '💭 思考过程:',
          '```',
          thinking,
          '```',
          ''
        ].join('\n');
    }
  }

  /**
   * 格式化附件
   */
  formatAttachments(attachments) {
    const lines = [
      '<details>',
      '<summary>📎 附加文件</summary>',
      ''
    ];
    
    attachments.forEach(att => {
      const sizeStr = this.formatFileSize(att.file_size);
      lines.push(`- **${att.file_name}** (${sizeStr})`);
      if (att.file_type) {
        lines.push(`  - 类型: ${att.file_type}`);
      }
      if (att.extracted_content) {
        const preview = att.extracted_content.substring(0, 200);
        const previewText = preview.length < att.extracted_content.length ? 
          `${preview}...` : preview;
        lines.push(`  - 内容预览: ${previewText}`);
      }
    });
    
    lines.push('', '</details>', '');
    return lines.join('\n');
  }

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 格式化Artifact
   */
  formatArtifact(artifact) {
    const lines = [
      '<details>',
      `<summary>🔧 Artifact: ${artifact.title || '无标题'}</summary>`,
      '',
      `**类型**: \`${artifact.type || '未知'}\``,
      ''
    ];

    if (artifact.command === 'create' && artifact.content) {
      if (artifact.language) {
        lines.push(`**语言**: \`${artifact.language}\``);
      }
      lines.push('', '**内容**:');
      lines.push(`\`\`\`${artifact.language || ''}`);
      lines.push(artifact.content);
      lines.push('```');
    }

    lines.push('</details>', '');
    return lines.join('\n');
  }

  /**
   * 格式化工具使用
   */
  formatTool(tool) {
    const lines = [
      '<details>',
      `<summary>🔍 工具: ${tool.name}</summary>`,
      ''
    ];

    if (tool.query) {
      lines.push(`**搜索查询**: \`${tool.query}\``, '');
    }

    if (tool.result?.content && tool.name === 'web_search') {
      lines.push('**搜索结果**:', '');
      tool.result.content.slice(0, 5).forEach((item, i) => {
        lines.push(`${i + 1}. [${item.title || '无标题'}](${item.url || '#'})`);
      });
    }

    lines.push('</details>', '');
    return lines.join('\n');
  }

  /**
   * 格式化引用
   */
  formatCitations(citations) {
    const lines = [
      '<details>',
      '<summary>📎 引用来源</summary>',
      '',
      '| 标题 | 来源 |',
      '| --- | --- |'
    ];

    citations.forEach(citation => {
      const title = citation.title || '未知来源';
      const url = citation.url || '#';
      const source = url.includes('/') ? url.split('/')[2] : '未知网站';
      lines.push(`| [${title}](${url}) | ${source} |`);
    });

    lines.push('</details>', '');
    return lines.join('\n');
  }

  /**
   * 获取分支标记
   */
  getBranchMarker(msg) {
    if (msg.is_branch_point) return ' 🔀';
    if (msg.branch_level > 0) return ` ↳${msg.branch_level}`;
    return '';
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
        title += `${this.toExcelColumn(index)}. `;
      } else if (numberFormat === 'roman') {
        title += `${this.toRoman(index)}. `;
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
    const isHuman = msg.sender === 'human' || msg.sender_label === '人类' || msg.sender_label === 'Human';
    
    if (this.config.humanLabel && this.config.assistantLabel) {
      return isHuman ? this.config.humanLabel : this.config.assistantLabel;
    }
    
    return msg.sender_label || (isHuman ? '人类' : 'Claude');
  }
  
  /**
   * 转换为Excel风格的字母序号
   */
  toExcelColumn(num) {
    let result = '';
    while (num > 0) {
      num--; // 调整为0基础
      result = String.fromCharCode(65 + (num % 26)) + result;
      num = Math.floor(num / 26);
    }
    return result;
  }
  
  /**
   * 转换为罗马数字
   */
  toRoman(num) {
    if (num <= 0 || num >= 4000) return num.toString(); // 罗马数字限制
    
    const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
    const symbols = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
    let result = '';
    
    for (let i = 0; i < values.length; i++) {
      while (num >= values[i]) {
        result += symbols[i];
        num -= values[i];
      }
    }
    
    return result;
  }

  /**
   * 获取筛选描述
   */
  getFilterDescription() {
    const filters = [];
    
    if (this.config.excludeDeleted) {
      filters.push('排除已删除');
    }
    
    if (this.config.includeCompleted && this.config.includeImportant) {
      filters.push('仅已完成且重要的消息');
    } else if (this.config.includeCompleted) {
      filters.push('仅已完成的消息');
    } else if (this.config.includeImportant) {
      filters.push('仅重要的消息');
    }
    
    return filters.join('，');
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
      alert('保存文件失败，请重试');
      return false;
    }
  }

  /**
   * 导出单个文件
   */
  static async exportSingleFile(data, config = {}) {
    const generator = new MarkdownGenerator(config);
    const markdown = generator.generate(data);
    const fileName = this.generateFileName(data, 'single');
    
    return this.saveTextFile(markdown, fileName);
  }

  /**
   * 导出多个文件
   */
  static async exportMultipleFiles(dataList, config = {}) {
    const sections = dataList.map((data, index) => {
      // 对于多文件导出，每个文件都需要单独处理marks
      // 这里暂时使用空的marks，因为多文件导出的marks处理比较复杂
      const fileConfig = {
        ...config,
        marks: { completed: new Set(), important: new Set(), deleted: new Set() }
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
  static generateFileName(data, type = 'single') {
    const date = DateTimeUtils.getCurrentDate();
    
    if (type === 'single' && data?.meta_info?.title) {
      const title = data.meta_info.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
      return `${title}_${date}.md`;
    }
    
    return `export_${date}.md`;
  }
}

/**
 * 处理导出操作（从App.js移入以简化主文件）
 * @param {Object} params - 导出参数
 * @returns {Promise<boolean>} 成功与否
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
  currentFileIndex
}) {
  try {
    const exportFormatConfig = StorageUtils.getLocalStorage('export-config', {
      includeNumbering: true,
      numberingFormat: 'numeric',
      senderFormat: 'default',
      humanLabel: '人类',
      assistantLabel: 'Claude',
      includeHeaderPrefix: true,
      headerLevel: 2
    });
    
    let dataToExport = [];
    
    switch (exportOptions.scope) {
      case 'current':
        if (processedData) {
          const messagesToExport = sortManagerRef?.current?.hasCustomSort() ? 
            sortedMessages : (processedData.chat_history || []);
          
          dataToExport = [{
            ...processedData,
            chat_history: messagesToExport
          }];
        }
        break;
      
      case 'currentBranch':
        if (processedData && currentBranchState && !currentBranchState.showAllBranches) {
          let branchMessages = processedData.chat_history || [];
          
          if (currentBranchState.currentBranchIndexes && currentBranchState.currentBranchIndexes.size > 0) {
            branchMessages = branchMessages.filter(msg => {
              if (!msg.is_branch_point) return true;
              const branchIndex = currentBranchState.currentBranchIndexes.get(msg.uuid);
              if (branchIndex !== undefined) {
                return msg.branch_id === branchIndex || msg.branch_id === null;
              }
              return true;
            });
          }
          
          const messagesToExport = sortManagerRef?.current?.hasCustomSort() ? 
            sortManagerRef.current.getSortedMessages().filter(msg => 
              branchMessages.some(bm => bm.uuid === msg.uuid)
            ) : branchMessages;
          
          dataToExport = [{
            ...processedData,
            chat_history: messagesToExport
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
              const text = await file.text();
              const jsonData = JSON.parse(text);
              let data = extractChatData(jsonData, file.name);
              data = detectBranches(data);
              
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
                      title: conversation.name || '未命名对话'
                    },
                    chat_history: sortedMsgs,
                    views: {
                      conversationList: [conversation]
                    }
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
            const text = await file.text();
            const jsonData = JSON.parse(text);
            let data = extractChatData(jsonData, file.name);
            data = detectBranches(data);
            
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
      alert('没有可导出的数据');
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
        }
      }
    });
    
    return success;
  } catch (error) {
    console.error('导出失败:', error);
    alert('导出失败：' + error.message);
    return false;
  }
}

/**
 * 主导出函数
 */
export async function exportData(options) {
  const {
    scope = 'current',
    data = null,
    dataList = [],
    config = {}
  } = options;

  try {
    switch (scope) {
      case 'current':
        if (!data) throw new Error('没有可导出的数据');
        return FileExporter.exportSingleFile(data, config);
        
      case 'multiple':
        if (dataList.length === 0) throw new Error('没有可导出的数据');
        return FileExporter.exportMultipleFiles(dataList, config);
        
      default:
        throw new Error(`未知的导出范围: ${scope}`);
    }
  } catch (error) {
    console.error('导出失败:', error);
    alert(`导出失败: ${error.message}`);
    return false;
  }
}