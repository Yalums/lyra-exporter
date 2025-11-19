// index.js
// fileParser 主入口 - 格式检测、路由、公共API

// 导入所有解析器
import { extractClaudeData, detectClaudeBranches } from './claudeParser.js';
import { extractChatGPTData, detectChatGPTBranches } from './chatgptParser.js';
import { extractGeminiData, extractJSONLData, detectOtherBranches } from './otherParsers.js';

// 导入工具函数
import {
  DateTimeUtils,
  PlatformUtils,
  FileUtils,
  TextUtils,
  parseJSONL,
  parseTimestamp,
  getImageDisplayData,
  formatFileSize
} from './helpers.js';

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
  // 添加数据验证
  if (!jsonData || (typeof jsonData !== 'object' && !Array.isArray(jsonData))) {
    throw new Error('[Parser] 无效的输入数据：数据必须是对象或数组');
  }

  const format = detectFileFormat(jsonData);

  if (format === 'unknown') {
    throw new Error('[Parser] 无法识别文件格式。支持的格式：Claude, ChatGPT, Gemini, NotebookLM, JSONL');
  }

  try {
    switch (format) {
      case 'claude':
        return extractClaudeData(jsonData);
      case 'gemini_notebooklm':
        return extractGeminiData(jsonData, fileName);
      case 'jsonl_chat':
        return extractJSONLData(jsonData, fileName);
      case 'chatgpt':
        return extractChatGPTData(jsonData, fileName);
      default:
        throw new Error(`[Parser] 不支持的文件格式: ${format}`);
    }
  } catch (error) {
    throw new Error(`[Parser] ${format} 格式解析失败: ${error.message}`);
  }
};

// ==================== 统一的分支检测入口 ====================
export const detectBranches = (processedData) => {
  if (!processedData?.chat_history) {
    return processedData;
  }

  switch (processedData.format) {
    case 'claude':
      return detectClaudeBranches(processedData);
    case 'chatgpt':
      return detectChatGPTBranches(processedData);
    case 'jsonl_chat':
    case 'gemini_notebooklm':
      return detectOtherBranches(processedData);
    default:
      return processedData;
  }
};

// ==================== 导出工具函数 ====================
export {
  // 工具模块
  DateTimeUtils,
  PlatformUtils,
  FileUtils,
  TextUtils,

  // 解析函数
  parseJSONL,
  parseTimestamp,

  // 图片显示
  getImageDisplayData,

  // 文件大小格式化
  formatFileSize
};

// 导出所有 helpers 中的工具（供外部使用）
export * from './helpers.js';
