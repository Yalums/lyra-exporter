import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// =============================================================================
// i18n 国际化系统核心配置
// =============================================================================

/**
 * i18n 国际化系统核心配置
 * 
 * 功能特性：
 * - 轻量级实现，无重度依赖
 * - 支持嵌套键和参数插值
 * - 动态语言切换和懒加载
 * - localStorage 持久化
 * - 优雅的降级处理
 */

// 支持的语言列表（UI 显示用）
// 注意：中文只显示一个选项，但内部会根据浏览器语言自动选择简繁体
export const SUPPORTED_LANGUAGES = {
  zh: {
    code: 'zh',
    name: 'Mandarin',
    nativeName: '华语',
    flag: '🇸🇬'
  },
  en: {
    code: 'en', 
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸'
  },
  ja: {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    flag: '🇯🇵'
  },
  ko: {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    flag: '🇰🇷'
  }
};

// 默认语言
export const DEFAULT_LANGUAGE = 'en';

// localStorage 键名
export const STORAGE_KEY = 'lyra_exporter_language';

/**
 * 检测中文简繁体变体
 * @returns {string} 'zh' 或 'zh_'
 */
export const detectChineseVariant = () => {
  try {
    const browserLang = navigator.language || navigator.userLanguage || '';
    const lowerLang = browserLang.toLowerCase();
    
    // 检测繁体中文
    if (lowerLang.includes('tw') ||    // 台湾
        lowerLang.includes('hk') ||    // 香港
        lowerLang.includes('mo') ||    // 澳门
        lowerLang.includes('hant')) {  // 繁体标记
      return 'zh_';
    }
    
    // 默认使用简体中文
    return 'zh';
  } catch (error) {
    console.warn('Failed to detect Chinese variant:', error);
    return 'zh'; // 默认简体
  }
};

/**
 * 检测浏览器语言
 * 自动识别中文简繁体（zh-CN, zh-TW, zh-HK）
 * @returns {string} 检测到的语言代码
 */
export const detectBrowserLanguage = () => {
  try {
    // 获取浏览器语言设置
    const browserLang = navigator.language || navigator.userLanguage || '';
    const lowerLang = browserLang.toLowerCase();
    
    // 精确匹配
    if (SUPPORTED_LANGUAGES[browserLang]) {
      return browserLang;
    }
    
    // 处理中文 - 统一返回 'zh'，具体简繁体由 detectChineseVariant 决定
    if (lowerLang.startsWith('zh')) {
      return 'zh';
    }
    
    // 匹配语言前缀（例如 en-US -> en, ja-JP -> ja）
    const langPrefix = browserLang.split('-')[0];
    if (SUPPORTED_LANGUAGES[langPrefix]) {
      return langPrefix;
    }
    
    // 如果都没匹配到，返回默认语言
    return DEFAULT_LANGUAGE;
  } catch (error) {
    console.warn('Failed to detect browser language:', error);
    return DEFAULT_LANGUAGE;
  }
};


/**
 * 获取嵌套对象的值
 * @param {Object} obj - 目标对象
 * @param {string} path - 路径字符串，如 'welcomePage.title'
 * @param {*} defaultValue - 默认值
 * @returns {*} 找到的值或默认值
 */
export const getNestedValue = (obj, path, defaultValue = null) => {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return defaultValue;
    }
  }
  
  return current;
};

/**
 * 参数插值处理
 * @param {string} text - 模板文本
 * @param {Object} params - 参数对象
 * @returns {string} 处理后的文本
 */
export const interpolate = (text, params = {}) => {
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return key in params ? params[key] : match;
  });
};

/**
 * 动态加载语言包
 * @param {string} languageCode - 语言代码
 * @returns {Promise<Object>} 语言包对象
 */
export const loadLanguagePack = async (languageCode) => {
  try {
    // 如果是中文，根据浏览器设置自动选择简繁体
    let actualLanguageCode = languageCode;
    if (languageCode === 'zh') {
      actualLanguageCode = detectChineseVariant();
    }
    
    // 动态导入语言文件
    const module = await import(`./langs/${actualLanguageCode}.json`);
    return module.default || module;
  } catch (error) {
    console.warn(`Failed to load language pack for ${languageCode}:`, error);
    
    // 如果是中文繁体加载失败，尝试简体
    if (languageCode === 'zh') {
      try {
        const fallbackModule = await import(`./langs/zh.json`);
        return fallbackModule.default || fallbackModule;
      } catch (fallbackError) {
        console.error('Failed to load Chinese fallback:', fallbackError);
      }
    }
    
    // 如果是英语加载失败，返回空对象
    if (languageCode === 'en') {
      return {};
    }
    
    // 其他语言加载失败，尝试加载默认语言
    try {
      const fallbackModule = await import(`./langs/${DEFAULT_LANGUAGE}.json`);
      return fallbackModule.default || fallbackModule;
    } catch (fallbackError) {
      console.error('Failed to load fallback language pack:', fallbackError);
      return {};
    }
  }
};

/**
 * 获取保存的语言设置
 * 优先级：localStorage > 浏览器检测 > 默认语言
 * @returns {string} 语言代码
 */
export const getSavedLanguage = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED_LANGUAGES[saved]) {
      return saved;
    }
  } catch (error) {
    console.warn('Failed to read language from localStorage:', error);
  }
  
  // 如果没有保存的设置，使用浏览器检测
  return detectBrowserLanguage();
};

/**
 * 保存语言设置
 * @param {string} languageCode - 语言代码
 */
export const saveLanguage = (languageCode) => {
  try {
    localStorage.setItem(STORAGE_KEY, languageCode);
  } catch (error) {
    console.warn('Failed to save language to localStorage:', error);
  }
};

// =============================================================================
// React 应用启动
// =============================================================================

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);