import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// 导入语言包
import enTranslations from './langs/en.json';
import zhTranslations from './langs/zh.json';
import jaTranslations from './langs/ja.json';

const staticTranslations = {
  en: enTranslations,
  zh: zhTranslations,
  ja: jaTranslations
};

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
// i18n 工具函数和 Hook（从 utils/i18n.js 合并）
// =============================================================================

/**
 * 获取当前语言
 */
export function getCurrentLanguage() {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'en';
  } catch {
    return 'en';
  }
}

/**
 * 翻译函数 - 用于非 React 组件
 * @param {string} key - 翻译键
 * @param {object} params - 插值参数
 * @returns {string} 翻译后的文本
 */
export function t(key, params = {}) {
  const language = getCurrentLanguage();
  const languagePack = staticTranslations[language] || staticTranslations.en;

  const translation = getNestedValue(languagePack, key);

  if (translation === null || translation === undefined) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Translation missing for key: ${key}`);
    }
    const fallback = key.split('.').pop();
    return interpolate(fallback, params);
  }

  if (typeof translation === 'string') {
    return interpolate(translation, params);
  }

  return translation;
}

/**
 * useI18n Hook - 国际化核心Hook
 *
 * 用法示例：
 * const { t, currentLanguage, changeLanguage, availableLanguages } = useI18n();
 */
export const useI18n = () => {
  const [currentLanguage, setCurrentLanguage] = useState(DEFAULT_LANGUAGE);
  const [translations, setTranslations] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // 初始化语言设置
  useEffect(() => {
    const initializeLanguage = async () => {
      setIsLoading(true);

      const savedLanguage = getSavedLanguage();
      setCurrentLanguage(savedLanguage);

      try {
        const languagePack = await loadLanguagePack(savedLanguage);
        setTranslations(languagePack);
      } catch (error) {
        console.error('Failed to load initial language pack:', error);
        setTranslations({});
      }

      setIsLoading(false);
      setIsReady(true);
    };

    initializeLanguage();
  }, []);

  // 切换语言函数
  const changeLanguage = useCallback(async (languageCode) => {
    if (!SUPPORTED_LANGUAGES[languageCode]) {
      console.warn(`Unsupported language: ${languageCode}`);
      return false;
    }

    if (languageCode === currentLanguage) {
      return true;
    }

    setIsLoading(true);

    try {
      const languagePack = await loadLanguagePack(languageCode);
      setTranslations(languagePack);
      setCurrentLanguage(languageCode);
      saveLanguage(languageCode);
      return true;
    } catch (error) {
      console.error(`Failed to change language to ${languageCode}:`, error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [currentLanguage]);

  // 翻译函数
  const tHook = useCallback((key, params = {}) => {
    if (!key) {
      console.warn('Translation key is required');
      return '';
    }

    // 获取翻译文本
    const translation = getNestedValue(translations, key);

    if (translation === null || translation === undefined) {
      // 返回键的最后一部分作为fallback
      const fallback = key.split('.').pop();
      return interpolate(fallback, params);
    }

    // 如果翻译存在，进行参数插值
    if (typeof translation === 'string') {
      return interpolate(translation, params);
    }

    // 如果翻译不是字符串，返回原始值
    return translation;
  }, [translations]);

  // 检查是否存在翻译
  const hasTranslation = useCallback((key) => {
    return getNestedValue(translations, key) !== null;
  }, [translations]);

  // 获取当前语言信息
  const currentLanguageInfo = useMemo(() => {
    return SUPPORTED_LANGUAGES[currentLanguage] || SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE];
  }, [currentLanguage]);

  // 可用语言列表
  const availableLanguages = useMemo(() => {
    return Object.values(SUPPORTED_LANGUAGES);
  }, []);

  return {
    // 核心函数
    t: tHook,

    // 语言状态
    currentLanguage,
    currentLanguageInfo,
    availableLanguages,

    // 语言切换
    changeLanguage,

    // 状态标志
    isLoading,
    isReady,

    // 工具函数
    hasTranslation
  };
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