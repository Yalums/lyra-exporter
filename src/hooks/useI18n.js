/**
 * useI18n Hook - 国际化核心Hook
 * 
 * 用法示例：
 * const { t, currentLanguage, changeLanguage, availableLanguages } = useI18n();
 * 
 * // 简单翻译
 * t('welcomePage.title')
 * 
 * // 带参数插值
 * t('welcomePage.greeting', { name: 'Laumss' })
 * 
 * // 切换语言
 * changeLanguage('en')
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  SUPPORTED_LANGUAGES, 
  DEFAULT_LANGUAGE,
  getSavedLanguage,
  saveLanguage,
  loadLanguagePack,
  getNestedValue,
  interpolate
} from '../index.js';

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
        // 设置为空对象，让组件可以正常渲染
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
      return true; // 已经是当前语言
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
  const t = useCallback((key, params = {}) => {
    if (!key) {
      console.warn('Translation key is required');
      return '';
    }

    // 获取翻译文本
    const translation = getNestedValue(translations, key);
    
    if (translation === null || translation === undefined) {
      // 开发模式下显示警告
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Translation missing for key: ${key}`);
      }
      
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
    t,
    
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
