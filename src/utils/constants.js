// utils/constants.js
// 扩展版 - 集中管理所有常量和配置

// ==================== 标记类型 ====================
export const MARK_TYPES = {
  COMPLETED: 'completed',
  IMPORTANT: 'important',
  DELETED: 'deleted'
};

// ==================== 视图模式 ====================
export const VIEW_MODES = {
  CONVERSATIONS: 'conversations',
  TIMELINE: 'timeline'
};

// ==================== 文件格式 ====================
export const FILE_FORMATS = {
  CLAUDE: 'claude',
  CLAUDE_FULL_EXPORT: 'claude_full_export',
  CLAUDE_CONVERSATIONS: 'claude_conversations',
  GEMINI_NOTEBOOKLM: 'gemini_notebooklm',
  UNKNOWN: 'unknown'
};

// ==================== 平台类型 ====================
export const PLATFORMS = {
  CLAUDE: 'claude',
  GEMINI: 'gemini',
  NOTEBOOKLM: 'notebooklm',
  AISTUDIO: 'aistudio'
};

// ==================== 消息发送者 ====================
export const SENDER_TYPES = {
  HUMAN: 'human',
  ASSISTANT: 'assistant',
  SYSTEM: 'system'
};

// ==================== 标签页类型 ====================
export const TAB_TYPES = {
  CONTENT: 'content',
  THINKING: 'thinking',
  ARTIFACTS: 'artifacts',
  JSON: 'json'
};

// ==================== 本地存储键名 ====================
export const STORAGE_KEYS = {
  MARKS_PREFIX: 'marks_',
  STAR_PREFIX: 'star_',
  USER_SETTINGS: 'user_settings',
  THEME: 'app-theme',
  SORT_ORDER: 'sort_order_',
  SCROLL_POSITION: 'scroll_position_',
  LAST_VIEW_MODE: 'last_view_mode',
  EXPORT_OPTIONS: 'export_options'
};

// ==================== 导出配置 ====================
export const DEFAULT_EXPORT_CONFIG = {
  includeThinking: true,
  includeTools: true,
  includeArtifacts: true,
  includeCitations: true,
  includeTimestamps: false,
  exportObsidianMetadata: false,
  exportMarkedOnly: false,
  excludeDeleted: true,
  obsidianProperties: [],
  obsidianTags: []
};

// ==================== 筛选器配置 ====================
export const FILTER_DEFAULTS = {
  name: '',
  dateRange: 'all',
  project: 'all',
  starred: 'all',
  customDateStart: null,
  customDateEnd: null
};

export const DATE_RANGE_OPTIONS = {
  ALL: 'all',
  TODAY: 'today',
  WEEK: 'week',
  MONTH: 'month',
  CUSTOM: 'custom'
};

export const STARRED_FILTER_OPTIONS = {
  ALL: 'all',
  STARRED: 'starred',
  UNSTARRED: 'unstarred'
};

// ==================== 排序选项 ====================
export const SORT_OPTIONS = {
  ORIGINAL: 'original',
  TIME_ASC: 'time_asc',
  TIME_DESC: 'time_desc',
  SENDER: 'sender',
  CUSTOM: 'custom'
};

// ==================== 消息操作 ====================
export const MESSAGE_ACTIONS = {
  MARK: 'mark',
  UNMARK: 'unmark',
  COPY: 'copy',
  EXPORT: 'export',
  DELETE: 'delete'
};