// utils/commonUtils.js
// 通用工具函数模块 - 国际化支持版本

/**
 * 获取当前语言设置
 * @returns {string} 语言代码
 */
const getCurrentLocale = () => {
  try {
    const saved = localStorage.getItem('lyra_exporter_language') || 'en';
    // 处理中文简繁体
    if (saved === 'zh') {
      const browserLang = navigator.language || navigator.userLanguage || '';
      const lowerLang = browserLang.toLowerCase();
      if (lowerLang.includes('tw') || lowerLang.includes('hk') || 
          lowerLang.includes('mo') || lowerLang.includes('hant')) {
        return 'zh-TW';
      }
      return 'zh-CN';
    }
    return saved;
  } catch {
    return 'en';
  }
};

/**
 * 日期时间格式化工具
 */
export const DateTimeUtils = {
  // 格式化日期
  formatDate(dateStr) {
    if (!dateStr) {
      // 根据语言返回不同的默认值
      const locale = getCurrentLocale();
      return locale.startsWith('zh') ? '未知时间' : 'Unknown time';
    }
    
    try {
      const date = new Date(dateStr);
      const locale = getCurrentLocale();
      
      return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  },

  // 格式化时间
  formatTime(timestamp) {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      const locale = getCurrentLocale();
      
      return date.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return timestamp;
    }
  },

  // 格式化日期时间
  formatDateTime(timestamp) {
    if (!timestamp) {
      const locale = getCurrentLocale();
      return locale.startsWith('zh') ? '未知时间' : 'Unknown time';
    }
    
    try {
      const date = new Date(timestamp);
      const locale = getCurrentLocale();
      
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

  // 获取当前日期字符串
  getCurrentDate() {
    return new Date().toISOString().split('T')[0];
  },

  // 获取ISO日期格式
  toISODate(dateStr) {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toISOString().split('T')[0];
    } catch {
      return '';
    }
  }
};

/**
 * 平台和模型相关工具
 */
export const PlatformUtils = {
  // 获取模型显示名称
  getModelDisplay(model) {
    if (!model || model === '未知模型') return 'Claude Sonnet';
    
    const modelMap = {
      'opus-4': 'Claude Opus 4',
      'opus4': 'Claude Opus 4',
      'claude-3-opus': 'Claude Opus 3',
      'opus-3': 'Claude Opus 3',
      'opus3': 'Claude Opus 3',
      'sonnet-4': 'Claude Sonnet 4',
      'sonnet4': 'Claude Sonnet 4',
      'haiku': 'Claude Haiku'
    };

    for (const [key, value] of Object.entries(modelMap)) {
      if (model.includes(key)) return value;
    }
    
    return model;
  },

  // 获取平台名称
  getPlatformName(platform) {
    const platformMap = {
      'gemini': 'Gemini',
      'notebooklm': 'NotebookLM',
      'aistudio': 'Google AI Studio',
      'claude': 'Claude',
      'jsonl_chat': 'SillyTavern'
    };
    
    return platformMap[platform?.toLowerCase()] || 'Claude';
  },

  // 获取平台类名
  getPlatformClass(platform) {
    const classMap = {
      'gemini': 'platform-gemini',
      'google ai studio': 'platform-gemini',
      'aistudio': 'platform-gemini',
      'notebooklm': 'platform-notebooklm',
      'jsonl_chat': 'platform-jsonl'
    };
    
    return classMap[platform?.toLowerCase()] || 'platform-claude';
  },

  // 从平台获取格式
  getFormatFromPlatform(platform) {
    const formatMap = {
      'gemini': 'gemini_notebooklm',
      'google ai studio': 'gemini_notebooklm',
      'aistudio': 'gemini_notebooklm',
      'notebooklm': 'gemini_notebooklm'
    };
    
    return formatMap[platform?.toLowerCase()] || 'claude';
  }
};

/**
 * 文件操作工具
 */
export const FileUtils = {
  // 格式化文件大小
  formatFileSize(size) {
    if (!size) return '';
    if (size < 1024) return `${size}B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
    return `${(size / (1024 * 1024)).toFixed(1)}MB`;
  },

  // 获取文件类型文本（需要配合 i18n）
  getFileTypeText(format, platform, model) {
    const locale = getCurrentLocale();
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
      default:
        return isChinese ? '未知格式' : 'Unknown Format';
    }
  }
};

/**
 * 文本处理工具
 */
export const TextUtils = {
  // 过滤图片引用
  filterImageReferences(text) {
    if (!text) return '';
    return text
      .replace(/\[(?:图片|附件|图像|image|attachment)\d*\s*[:：]\s*[^\]]+\]/gi, '')
      .replace(/\[(?:图片|附件|图像|image|attachment)\d+\]/gi, '')
      .replace(/\[图片[1-5]\]/gi, '')
      .trim();
  },

  // 获取文本预览
  getPreview(text, maxLength = 200) {
    if (!text) return '';
    const filteredText = this.filterImageReferences(text);
    if (filteredText.length <= maxLength) return filteredText;
    return filteredText.substring(0, maxLength) + '...';
  },

  // 搜索文本高亮
  highlightSearchText(text, query) {
    if (!query || !text) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }
};

/**
 * 存储工具
 */
export const StorageUtils = {
  // 安全获取localStorage数据
  getLocalStorage(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Failed to get ${key} from localStorage:`, error);
      return defaultValue;
    }
  },

  // 安全设置localStorage数据
  setLocalStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Failed to set ${key} in localStorage:`, error);
      return false;
    }
  },

  // 获取文件标记
  getFileMarks(fileUuid) {
    const marks = {
      completed: new Set(),
      important: new Set(),
      deleted: new Set()
    };
    
    const data = this.getLocalStorage(`marks_${fileUuid}`, {});
    marks.completed = new Set(data.completed || []);
    marks.important = new Set(data.important || []);
    marks.deleted = new Set(data.deleted || []);
    
    return marks;
  },

  // 保存文件标记
  saveFileMarks(fileUuid, marks) {
    const data = {
      completed: Array.from(marks.completed || []),
      important: Array.from(marks.important || []),
      deleted: Array.from(marks.deleted || [])
    };
    
    return this.setLocalStorage(`marks_${fileUuid}`, data);
  }
};

/**
 * 主题管理工具
 */
export const ThemeUtils = {
  // 获取当前主题
  getCurrentTheme() {
    return StorageUtils.getLocalStorage('app-theme', 'dark');
  },

  // 应用主题
  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    StorageUtils.setLocalStorage('app-theme', theme);
    
    // 更新PWA主题色
    if (window.updatePWAThemeColor) {
      setTimeout(() => {
        window.updatePWAThemeColor();
      }, 50);
    }
  },

  // 切换主题
  toggleTheme() {
    const currentTheme = this.getCurrentTheme();
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(newTheme);
    return newTheme;
  }
};

/**
 * 验证工具
 */
export const ValidationUtils = {
  // 验证消息来源
  isAllowedOrigin(origin) {
    const allowedOrigins = [
      'https://claude.ai',
      'https://pro.easychat.top',
      'https://gemini.google.com',
      'https://notebooklm.google.com',
      'https://aistudio.google.com',
      'http://localhost:3789',
      'https://yalums.github.io'
    ];
    
    return allowedOrigins.some(allowed => origin === allowed) ||
           origin.includes('localhost') || 
           origin.includes('127.0.0.1');
  }
};