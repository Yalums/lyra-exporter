// utils/i18n.js
// i18n 工具函数 - 用于非 React 组件

import enTranslations from '../langs/en.json';
import zhTranslations from '../langs/zh.json';
import jaTranslations from '../langs/ja.json';

const translations = {
  en: enTranslations,
  zh: zhTranslations,
  ja: jaTranslations
};

/**
 * 获取当前语言
 */
export function getCurrentLanguage() {
  try {
    return localStorage.getItem('lyra_exporter_language') || 'en';
  } catch {
    return 'en';
  }
}

/**
 * 获取嵌套对象的值
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * 参数插值
 */
function interpolate(text, params = {}) {
  if (!text || typeof text !== 'string') return text;
  
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return params[key] !== undefined ? params[key] : match;
  });
}

/**
 * 翻译函数 - 用于非 React 组件
 * @param {string} key - 翻译键
 * @param {object} params - 插值参数
 * @returns {string} 翻译后的文本
 */
export function t(key, params = {}) {
  const language = getCurrentLanguage();
  const languagePack = translations[language] || translations.en;
  
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
