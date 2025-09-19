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

// 支持的语言列表
export const SUPPORTED_LANGUAGES = {
  zh: {
    code: 'zh',
    name: '中文',
    nativeName: '中文',
    flag: '🇨🇳'
  },
  en: {
    code: 'en', 
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸'
  }
};

// 默认语言
export const DEFAULT_LANGUAGE = 'zh';

// localStorage 键名
export const STORAGE_KEY = 'lyra_exporter_language';

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
    // 动态导入语言文件
    const module = await import(`./langs/${languageCode}.json`);
    return module.default || module;
  } catch (error) {
    console.warn(`Failed to load language pack for ${languageCode}:`, error);
    
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
  
  return DEFAULT_LANGUAGE;
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