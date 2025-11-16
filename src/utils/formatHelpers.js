// utils/formatHelpers.js
// 共享的格式化辅助函数

/**
 * XML 转义函数
 */
export function escapeXml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 格式化附件为 XML 结构
 */
export function formatAttachments(attachments, options = {}) {
  if (!attachments || attachments.length === 0) {
    return '';
  }

  const lines = ['<attachments>'];

  attachments.forEach((att, index) => {
    lines.push(`<attachment index="${index + 1}">`);
    lines.push(`<file_name>${escapeXml(att.file_name || '未知文件')}</file_name>`);
    lines.push(`<file_size>${att.file_size || 0}</file_size>`);

    if (att.created_at) {
      lines.push(`<created_at>${escapeXml(att.created_at)}</created_at>`);
    }

    if (att.extracted_content) {
      lines.push('<attachment_content>');

      // 根据选项决定是否显示完整内容
      if (options.includeAttachments !== false) {
        lines.push(att.extracted_content);
      } else {
        const preview = att.extracted_content.substring(0, 200);
        const previewText = preview.length < att.extracted_content.length ?
          `${preview}...` : preview;
        lines.push(previewText);
      }

      lines.push('</attachment_content>');
    }

    lines.push('</attachment>');

    if (index < attachments.length - 1) {
      lines.push('');
    }
  });

  lines.push('</attachments>', '');
  return lines.join('\n');
}

/**
 * 统一的 <details> 包装器
 */
export function wrapWithDetails(summary, content) {
  const lines = [
    '<details>',
    `<summary>${summary}</summary>`,
    ''
  ];

  if (Array.isArray(content)) {
    lines.push(...content);
  } else {
    lines.push(content);
  }

  lines.push('</details>', '');
  return lines.join('\n');
}

/**
 * 格式化思考过程
 * @param {string} thinking - 思考内容
 * @param {string} format - 格式类型：'codeblock' | 'xml' | 'emoji'
 * @param {string} thinkingLabel - 思考标签（用于 emoji 格式）
 * @returns {string} 格式化后的思考内容
 */
export function formatThinking(thinking, format = 'codeblock', thinkingLabel = '💭 Thinking Process:') {
  switch (format) {
    case 'codeblock':
      return ['``` thinking', thinking, '```', ''].join('\n');
    case 'xml':
      return ['<anthropic_thinking>', thinking, '</anthropic_thinking>', ''].join('\n');
    case 'emoji':
    default:
      return [thinkingLabel, '```', thinking, '```', ''].join('\n');
  }
}

/**
 * 格式化 Artifact
 * @param {Object} artifact - Artifact 对象
 * @param {Function} gt - 翻译函数
 * @returns {string} 格式化后的 Artifact
 */
export function formatArtifact(artifact, gt) {
  const content = [
    `${gt('format.typeLabel')} \`${artifact.type || gt('format.unknown')}\``,
    ''
  ];

  if (artifact.command === 'create' && artifact.content) {
    if (artifact.language) {
      content.push(`${gt('format.language')} \`${artifact.language}\``);
    }
    content.push('', `${gt('format.content')}`);
    content.push(`\`\`\`${artifact.language || ''}`);
    content.push(artifact.content);
    content.push('```');
  }

  return wrapWithDetails(
    `${gt('format.artifact')} ${artifact.title || gt('format.noTitle')}`,
    content
  );
}

/**
 * 格式化工具使用
 * @param {Object} tool - 工具对象
 * @param {Function} gt - 翻译函数
 * @returns {string} 格式化后的工具信息
 */
export function formatTool(tool, gt) {
  const content = [];

  if (tool.query) {
    content.push(`${gt('format.searchQuery')} \`${tool.query}\``, '');
  }

  if (tool.result?.content && tool.name === 'web_search') {
    content.push(`${gt('format.searchResults')}`, '');
    tool.result.content.slice(0, 5).forEach((item, i) => {
      content.push(`${i + 1}. [${item.title || gt('format.noTitle')}](${item.url || '#'})`);
    });
  }

  return wrapWithDetails(`${gt('format.tool')} ${tool.name}`, content);
}

/**
 * 格式化引用
 * @param {Array} citations - 引用数组
 * @param {Function} gt - 翻译函数
 * @returns {string} 格式化后的引用表格
 */
export function formatCitations(citations, gt) {
  const content = [
    '| 标题 | 来源 |',
    '| --- | --- |'
  ];

  citations.forEach(citation => {
    const title = citation.title || gt('format.unknownSource');
    const url = citation.url || '#';
    const source = url.includes('/') ? url.split('/')[2] : gt('format.unknownWebsite');
    content.push(`| [${title}](${url}) | ${source} |`);
  });

  return wrapWithDetails(gt('format.citations'), content);
}

/**
 * 获取分支标记
 * @param {Object} msg - 消息对象
 * @returns {string} 分支标记
 */
export function getBranchMarker(msg) {
  if (msg.is_branch_point) return ' 🔀';
  if (msg.branch_level > 0) return ` ↳${msg.branch_level}`;
  return '';
}

/**
 * 获取发送者标签
 * @param {Object} msg - 消息对象
 * @param {Object} config - 配置对象
 * @returns {string} 发送者标签
 */
export function getSenderLabel(msg, config = {}) {
  const isHuman = msg.sender === 'human' || msg.sender_label === '人类' || msg.sender_label === 'Human';

  // 检查 senderFormat 配置
  const senderFormat = config.senderFormat || 'default';

  // 如果是 default 模式，强制使用 User/AI
  if (senderFormat === 'default') {
    return isHuman ? 'User' : 'AI';
  }

  // 如果是 human-assistant 模式，使用 Human/Assistant
  if (senderFormat === 'human-assistant') {
    return isHuman ? 'Human' : 'Assistant';
  }

  // 如果是 custom 模式，使用配置的标签
  if (senderFormat === 'custom' && config.humanLabel && config.assistantLabel) {
    return isHuman ? config.humanLabel : config.assistantLabel;
  }

  // 默认返回原始标签或 Human/Assistant
  return msg.sender_label || (isHuman ? 'Human' : 'Assistant');
}

/**
 * 转换为 Excel 风格的字母序号
 * @param {number} num - 数字
 * @returns {string} Excel 字母序号（A, B, C, ..., Z, AA, AB, ...）
 */
export function toExcelColumn(num) {
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
 * @param {number} num - 数字（1-3999）
 * @returns {string} 罗马数字
 */
export function toRoman(num) {
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
