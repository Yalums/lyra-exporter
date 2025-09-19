// src/i18n/components/LanguageSwitcher.js
/**
 * LanguageSwitcher - 语言切换器组件
 * 
 * 用法：
 * <LanguageSwitcher />
 * 
 * 或带自定义样式：
 * <LanguageSwitcher 
 *   className="custom-class"
 *   showText={false}
 *   variant="compact"
 * />
 */

import React, { useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { useI18n } from '../hooks/useI18n.js';

const LanguageSwitcher = ({
  className = '',
  showText = true,
  variant = 'default', // 'default' | 'compact' | 'dropdown'
  position = 'bottom-right' // 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
}) => {
  const { 
    currentLanguage, 
    currentLanguageInfo, 
    availableLanguages, 
    changeLanguage, 
    isLoading,
    t 
  } = useI18n();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 处理语言切换
  const handleLanguageChange = async (languageCode) => {
    if (languageCode === currentLanguage) {
      setIsOpen(false);
      return;
    }

    const success = await changeLanguage(languageCode);
    if (success) {
      setIsOpen(false);
    }
  };

  // 下拉菜单位置类名
  const getDropdownPositionClass = () => {
    switch (position) {
      case 'bottom-left':
        return 'bottom-full left-0 mb-2';
      case 'top-right':
        return 'top-full right-0 mt-2';
      case 'top-left':
        return 'top-full left-0 mt-2';
      case 'bottom-right':
      default:
        return 'bottom-full right-0 mb-2';
    }
  };

  // 紧凑模式 - 只显示标志和下拉箭头
  if (variant === 'compact') {
    return (
      <div className={`relative inline-block ${className}`} ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isLoading}
          className="flex items-center px-2 py-1 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
          title={showText ? undefined : `${t('common.currentLanguage', { language: currentLanguageInfo.nativeName })}`}
        >
          <span className="text-lg mr-1">{currentLanguageInfo.flag}</span>
          {isLoading ? (
            <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin ml-1"></div>
          ) : (
            <svg className="w-3 h-3 ml-1 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          )}
        </button>

        {isOpen && (
          <div className={`absolute ${getDropdownPositionClass()} w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-50`}>
            {availableLanguages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className={`w-full flex items-center px-3 py-2 text-left hover:bg-gray-50 transition-colors duration-200 first:rounded-t-lg last:rounded-b-lg ${
                  currentLanguage === language.code ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                }`}
              >
                <span className="text-lg mr-2">{language.flag}</span>
                <span className="text-sm">{language.nativeName}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 默认模式 - 完整的语言切换器
  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex items-center px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow-md"
      >
        <Globe className="w-4 h-4 mr-2 text-gray-500" />
        <span className="text-lg mr-1">{currentLanguageInfo.flag}</span>
        {showText && (
          <span className="text-sm font-medium text-gray-700 mr-2">
            {currentLanguageInfo.nativeName}
          </span>
        )}
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className={`absolute ${getDropdownPositionClass()} w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50`}>
          <div className="py-1">
            {availableLanguages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className={`w-full flex items-center px-4 py-2 text-left hover:bg-gray-50 transition-colors duration-200 ${
                  currentLanguage === language.code ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                }`}
              >
                <span className="text-lg mr-3">{language.flag}</span>
                <div>
                  <div className="text-sm font-medium">{language.nativeName}</div>
                  {language.name !== language.nativeName && (
                    <div className="text-xs text-gray-500">{language.name}</div>
                  )}
                </div>
                {currentLanguage === language.code && (
                  <svg className="w-4 h-4 ml-auto text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;