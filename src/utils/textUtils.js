/**
 * TextUtils - 文本处理工具
 *
 * 解决问题：
 * - searchManager 和 globalSearchManager 都实现了文本高亮
 * - 摘录生成逻辑重复
 * - 缺少统一的文本处理工具
 *
 * 使用示例：
 * import { highlightText, getExcerpt } from './utils/textUtils';
 *
 * const highlighted = highlightText(text, 'search query');
 * const excerpt = getExcerpt(longText, 'query', 150);
 */

/**
 * 高亮搜索关键词
 * @param {string} text - 原始文本
 * @param {string} query - 搜索关键词
 * @returns {string} 包含 <mark> 标签的 HTML 字符串
 */
export function highlightText(text, query) {
  if (!text || !query) {
    return text;
  }

  // 转义正则特殊字符
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');

  return text.replace(regex, '<mark>$1</mark>');
}

/**
 * 提取包含关键词的文本摘录
 * @param {string} text - 完整文本
 * @param {string} query - 搜索关键词
 * @param {number} contextLength - 关键词前后保留的字符数
 * @returns {string} 摘录文本（包含省略号）
 */
export function getExcerpt(text, query, contextLength = 100) {
  if (!text || !query) {
    return text || '';
  }

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) {
    // 没有找到关键词，返回开头部分
    const maxLength = contextLength * 2;
    return text.substring(0, maxLength) +
           (text.length > maxLength ? '...' : '');
  }

  // 计算摘录范围
  const start = Math.max(0, index - contextLength);
  const end = Math.min(text.length, index + query.length + contextLength);

  let excerpt = text.substring(start, end);

  // 添加省略号
  if (start > 0) {
    excerpt = '...' + excerpt;
  }
  if (end < text.length) {
    excerpt = excerpt + '...';
  }

  return excerpt;
}

/**
 * 截断文本并添加省略号
 * @param {string} text - 原始文本
 * @param {number} maxLength - 最大长度
 * @returns {string} 截断后的文本
 */
export function truncate(text, maxLength = 100) {
  if (!text || text.length <= maxLength) {
    return text || '';
  }

  return text.substring(0, maxLength) + '...';
}

/**
 * 去除 Markdown 格式，返回纯文本
 * @param {string} text - Markdown 文本
 * @returns {string} 纯文本
 */
export function stripMarkdown(text) {
  if (!text) {
    return '';
  }

  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')          // 粗体
    .replace(/\*([^*]+)\*/g, '$1')              // 斜体
    .replace(/~~([^~]+)~~/g, '$1')              // 删除线
    .replace(/`([^`]+)`/g, '$1')                // 内联代码
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')    // 链接
    .replace(/^#+\s+/gm, '')                    // 标题
    .trim();
}

/**
 * 统计字数（支持中日韩字符）
 * @param {string} text - 文本
 * @returns {number} 字数
 */
export function countWords(text) {
  if (!text) {
    return 0;
  }

  // 分别统计 CJK 字符和西文单词
  const cjkChars = text.match(/[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff]/g) || [];
  const westernWords = text
    .replace(/[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff]/g, ' ')
    .match(/\b\w+\b/g) || [];

  return cjkChars.length + westernWords.length;
}

/**
 * 清理搜索输入（去除多余空格）
 * @param {string} input - 用户输入
 * @returns {string} 清理后的输入
 */
export function sanitizeSearchInput(input) {
  if (!input) {
    return '';
  }

  return input.trim().replace(/\s+/g, ' ');
}

/**
 * 转义 HTML 特殊字符
 * @param {string} text - 原始文本
 * @returns {string} 转义后的文本
 */
export function escapeHtml(text) {
  if (!text) {
    return '';
  }

  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  return text.replace(/[&<>"']/g, char => map[char]);
}

// 默认导出
export default {
  highlightText,
  getExcerpt,
  truncate,
  stripMarkdown,
  countWords,
  sanitizeSearchInput,
  escapeHtml
};
