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
import { useI18n } from '../index.js';

const LanguageSwitcher = ({
  className = '',
  showText = true,
  variant = 'default', // 'default' | 'compact' | 'dropdown'
  position = 'bottom-right', // 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  onLanguageChange = null // 可选的回调函数，在语言切换后执行
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
      // 如果提供了回调函数，则执行
      if (onLanguageChange) {
        onLanguageChange(languageCode);
      }
    }
  };

  // 下拉菜单位置类名
  const getDropdownPositionClass = () => {
    switch (position) {
      case 'bottom-left':
        return 'top-full left-0 mt-2';
      case 'top-right':
        return 'bottom-full right-0 mb-2';
      case 'top-left':
        return 'bottom-full left-0 mb-2';
      case 'bottom-right':
      default:
        return 'top-full right-0 mt-2';
    }
  };

  // 紧凑模式 - 只显示标志和下拉箭头
  if (variant === 'compact') {
    return (
      <div className={`relative inline-block ${className}`} ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isLoading}
          className="language-switcher-compact"
          title={showText ? undefined : `${t('common.currentLanguage', { language: currentLanguageInfo.nativeName })}`}
        >
          <span className="text-base">{currentLanguageInfo.flag}</span>
          {isLoading ? (
            <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin ml-1"></div>
          ) : (
            <svg className="w-3.5 h-3.5 ml-1 transition-transform duration-200" fill="currentColor" viewBox="0 0 20 20" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          )}
        </button>

        {isOpen && (
          <div className="language-dropdown">
            {availableLanguages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className={`language-option ${currentLanguage === language.code ? 'active' : ''}`}
              >
                <span className="text-base mr-2">{language.flag}</span>
                <span className="text-sm font-medium">{language.nativeName}</span>
                {currentLanguage === language.code && (
                  <svg className="w-3.5 h-3.5 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
        
        <style jsx>{`
          .language-switcher-compact {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px;
            border-radius: var(--radius-md);
            background: transparent;
            color: var(--text-primary);
            transition: all var(--transition-normal);
            cursor: pointer;
            border: none;
            outline: none;
          }
          
          .language-switcher-compact:hover {
            background: var(--bg-tertiary);
            transform: scale(1.05);
          }
          
          .language-switcher-compact:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          
          .language-dropdown {
            position: absolute;
            top: calc(100% + 8px);
            right: 0;
            min-width: 160px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-primary);
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-md);
            z-index: 50;
            max-height: 320px;
            overflow-y: auto;
            animation: slideDown 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            scrollbar-width: thin;
            scrollbar-color: var(--border-primary) transparent;
          }
          
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .language-option {
            width: 100%;
            display: flex;
            align-items: center;
            padding: 10px 14px;
            text-align: left;
            transition: all var(--transition-fast);
            border: none;
            cursor: pointer;
            background: transparent;
            color: var(--text-primary);
          }
          
          .language-option:first-child {
            border-radius: var(--radius-md) var(--radius-md) 0 0;
          }
          
          .language-option:last-child {
            border-radius: 0 0 var(--radius-md) var(--radius-md);
          }
          
          .language-option:hover {
            background: var(--bg-tertiary);
          }
          
          .language-option.active {
            background: var(--bg-tertiary);
            color: var(--accent-primary);
          }
        `}</style>
      </div>
    );
  }

  // 默认模式 - 完整的语言切换器
  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-primary)',
          background: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          transition: 'all var(--transition-fast)',
          boxShadow: 'var(--shadow-sm)',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--bg-tertiary)';
          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--bg-secondary)';
          e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
        }}
      >
        <Globe className="w-4 h-4 mr-2" style={{ color: 'var(--text-tertiary)' }} />
        <span className="text-lg mr-1">{currentLanguageInfo.flag}</span>
        {showText && (
          <span style={{ fontSize: '14px', fontWeight: 500, marginRight: '8px', color: 'var(--text-secondary)' }}>
            {currentLanguageInfo.nativeName}
          </span>
        )}
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" style={{ color: 'var(--text-tertiary)' }}>
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div 
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '192px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 50,
            maxHeight: '320px',
            overflowY: 'auto',
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--border-primary) transparent'
          }}
        >
          <div style={{ padding: '4px 0' }}>
            {availableLanguages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 16px',
                  textAlign: 'left',
                  background: currentLanguage === language.code ? 'var(--bg-tertiary)' : 'transparent',
                  color: currentLanguage === language.code ? 'var(--accent-primary)' : 'var(--text-primary)',
                  fontWeight: currentLanguage === language.code ? 500 : 400,
                  transition: 'all var(--transition-fast)',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  if (currentLanguage !== language.code) {
                    e.currentTarget.style.background = 'var(--bg-tertiary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentLanguage !== language.code) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <span className="text-lg mr-3">{language.flag}</span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{language.nativeName}</div>
                  {language.name !== language.nativeName && (
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{language.name}</div>
                  )}
                </div>
                {currentLanguage === language.code && (
                  <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20" style={{ color: 'var(--accent-primary)' }}>
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