// utils/exportManager.js
// 重构后的导出管理模块

import { DateTimeUtils, StorageUtils } from './commonUtils';
import { generateFileCardUuid } from './uuidManager';

/**
 * 导出配置
 */
export const ExportConfig = {
  DEFAULT: {
    includeThinking: true,
    includeTools: true,
    includeArtifacts: true,
    includeCitations: true,
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

  // 正文
  if (msg.display_text) {
    lines.push(msg.display_text, '');
    }

    // 思考过程
    if (msg.thinking && this.config.includeThinking) {
      lines.push(this.formatThinking(msg.thinking));
    }

    // Artifacts
    if (msg.artifacts?.length > 0 && this.config.includeArtifacts) {
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
    return [
      '<details>',
      '<summary>💭 思考过程</summary>',
      '',
      '```',
      thinking,
      '```',
      '</details>',
      ''
    ].join('\n');
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
