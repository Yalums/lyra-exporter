import React, { useState, useEffect } from 'react';

// 平台图标映射 - 使用多个备选源和base64后备
const PLATFORM_ICONS = {
  claude: {
    // 修复后的Claude base64图标（橙色圆圈内带白色C形状）
    base64: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHNoYXBlLXJlbmRlcmluZz0iZ2VvbWV0cmljUHJlY2lzaW9uIiB0ZXh0LXJlbmRlcmluZz0iZ2VvbWV0cmljUHJlY2lzaW9uIiBpbWFnZS1yZW5kZXJpbmc9Im9wdGltaXplUXVhbGl0eSIgZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIHZpZXdCb3g9IjAgMCA1MTIgNTA5LjY0Ij48cGF0aCBmaWxsPSIjRDc3NjU1IiBkPSJNMTE1LjYxMiAwaDI4MC43NzVDNDU5Ljk3NCAwIDUxMiA1Mi4wMjYgNTEyIDExNS42MTJ2Mjc4LjQxNWMwIDYzLjU4Ny01Mi4wMjYgMTE1LjYxMi0xMTUuNjEzIDExNS42MTJIMTE1LjYxMkM1Mi4wMjYgNTA5LjYzOSAwIDQ1Ny42MTQgMCAzOTQuMDI3VjExNS42MTJDMCA1Mi4wMjYgNTIuMDI2IDAgMTE1LjYxMiAweiIvPjxwYXRoIGZpbGw9IiNGQ0YyRUUiIGZpbGwtcnVsZT0ibm9uemVybyIgZD0iTTE0Mi4yNyAzMTYuNjE5bDczLjY1NS00MS4zMjYgMS4yMzgtMy41ODktMS4yMzgtMS45OTYtMy41ODktLjAwMS0xMi4zMS0uNzU5LTQyLjA4NC0xLjEzOC0zNi40OTgtMS41MTYtMzUuMzYxLTEuODk2LTguODk3LTEuODk1LTguMzQtMTAuOTk1Ljg1OS01LjQ4NCA3LjQ4Mi01LjAzIDEwLjcxNy45MzUgMjMuNjgzIDEuNjE3IDM1LjUzNyAyLjQ1MiAyNS43ODIgMS41MTcgMzguMTkzIDMuOTY4aDYuMDY0bC44Ni0yLjQ1MS0yLjA3My0xLjUxNy0xLjYxOC0xLjUxNy0zNi43NzYtMjQuOTIyLTM5LjgxLTI2LjMzOC0yMC44NTItMTUuMTY2LTExLjI3My03LjY4My01LjY4Ny03LjIwNC0yLjQ1MS0xNS43MjEgMTAuMjM3LTExLjI3MyAxMy43NS45MzUgMy41MTMuOTM2IDEzLjkyOCAxMC43MTYgMjkuNzQ5IDIzLjAyNyAzOC44NDggMjguNjEyIDUuNjg3IDQuNzI3IDIuMjc1LTEuNjE3LjI3OC0xLjEzOC0yLjU1My00LjI3MS0yMS4xMy0zOC4xOTMtMjIuNTQ2LTM4Ljg0OC0xMC4wMzUtMTYuMTAxLTIuNjU0LTkuNjU1Yy0uOTM1LTMuOTY4LTEuNjE3LTcuMzA0LTEuNjE3LTExLjM3NGwxMS42NTItMTUuODIzIDYuNDQ1LTIuMDczIDE1LjU0NSAyLjA3MyA2LjU0NyA1LjY4NyA5LjY1NSAyMi4wOTIgMTUuNjQ2IDM0Ljc4IDI0LjI2NSA0Ny4yOTEgNy4xMDMgMTQuMDI4IDMuNzkxIDEyLjk5MiAxLjQxNiAzLjk2OCAyLjQ0OS0uMDAxdi0yLjI3NWwxLjk5Ny0yNi42NDEgMy42OS0zMi43MDcgMy41ODktNDIuMDg0IDEuMjM5LTExLjg1NCA1Ljg2My0xNC4yMDYgMTEuNjUyLTcuNjgzIDkuMDk5IDQuMzQ4IDcuNDgyIDEwLjcxNi0xLjAzNiA2LjkyNi00LjQ0OSAyOC45MTUtOC43MiA0NS4yOTQtNS42ODcgMzAuMzMxaDMuMzEzbDMuNzkyLTMuNzkxIDE1LjM0Mi0yMC4zNzIgMjUuNzgyLTMyLjIyNyAxMS4zNzQtMTIuNzg5IDEzLjI3LTE0LjEyOSA4LjUxNy02LjcyNCAxNi4xLS4wMDEgMTEuODU0IDE3LjYxNy01LjMwNyAxOC4xOTktMTYuNTgxIDIxLjAyOS0xMy43NSAxNy44MTktMTkuNzE2IDI2LjU0LTEyLjMwOSAyMS4yMzEgMS4xMzggMS42OTQgMi45MzItLjI3OCA0NC41MzYtOS40NzkgMjQuMDYyLTQuMzQ3IDI4LjcxNC00LjkyOCAxMi45OTIgNi4wNjYgMS40MTYgNi4xNjctNS4xMDYgMTIuNjEzLTMwLjcxIDcuNTgzLTM2LjAxOCA3LjIwNC01My42MzYgMTIuNjg5LS42NTcuNDguNzU4LjkzNSAyNC4xNjQgMi4yNzUgMTAuMzM3LjU1NmgyNS4zMDFsNDcuMTE0IDMuNTE0IDEyLjMwOSA4LjEzOSA3LjM4MSA5Ljk1OS0xLjIzOCA3LjU4My0xOC45NTcgOS42NTUtMjUuNTc5LTYuMDY2LTU5LjcwMi0xNC4yMDUtMjAuNDc0LTUuMTA2LTIuODMtLjAwMXYxLjY5NGwxNy4wNjEgMTYuNjgyIDMxLjI2NiAyOC4yMzMgMzkuMTUyIDM2LjM5NyAxLjk5NyA4Ljk5OS01LjAzIDcuMTAyLTUuMzA3LS43NTgtMzQuNDAxLTI1Ljg4My0xMy4yNy0xMS42NTEtMzAuMDUzLTI1LjMwMi0xLjk5Ni0uMDAxdjIuNjU0bDYuOTI2IDEwLjEzNiAzNi41NzQgNTQuOTc1IDEuODk1IDE2Ljg1OS0yLjY1MyA1LjQ4NS05LjQ3OSAzLjMxMS0xMC40MTQtMS44OTUtMjEuNDA4LTMwLjA1NC0yMi4wOTItMzMuODQ0LTE3LjgxOS0zMC4zMzEtMi4xNzMgMS4yMzgtMTAuNTE1IDExMy4yNjEtNC45MjkgNS43ODgtMTEuMzc0IDQuMzQ4LTkuNDc4LTcuMjA0LTUuMDMtMTEuNjUyIDUuMDMtMjMuMDI3IDYuMDY2LTMwLjA1MiA0LjkyOC0yMy44ODYgNC40NDktMjkuNjc0IDIuNjU0LTkuODU4LS4xNzctLjY1Ny0yLjE3My4yNzgtMjIuMzcgMzAuNzEtMzQuMDIxIDQ1Ljk3Ny0yNi45MTkgMjguODE1LTYuNDQ1IDIuNTUzLTExLjE3My01Ljc4OSAxLjAzNy0xMC4zMzcgNi4yNDMtOS4yIDM3LjI1Ny00Ny4zOTIgMjIuNDctMjkuMzcxIDE0LjUwOC0xNi45NjEtLjEwMS0yLjQ1MWgtLjg1OWwtOTguOTU0IDY0LjI1MS0xNy42MTggMi4yNzUtNy41ODMtNy4xMDMuOTM2LTExLjY1MiAzLjU4OS0zLjc5MSAyOS43NDktMjAuNDc0LS4xMDEuMTAyLjAyNC4xMDF6Ii8+PC9zdmc+',
    sources: [] // 添加空的sources数组，避免undefined错误
  },
  gemini: {
    sources: [
      'https://ssl.gstatic.com/lamda/images/gemini_android_icon_24dp_9b8cf66e9d9eaacae59aa96df9e0f63b2c8bd50b.png',
      'https://www.gstatic.com/lamda/images/gemini_sparkle_red_4ed1cbfcbc6c9e84c31b987da73fc4168aec8445.svg',
      'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://www.google.com/s2/favicons?sz=32&domain=gemini.google.com')
    ],
    base64: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiMxQTczRTgiLz4KPHN2ZyB4PSI2IiB5PSI2IiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0xMCAyTDEyLjA5IDcuMjZMMTggOEwxMi4wOSA4Ljc0TDEwIDE0TDcuOTEgOC43NEwyIDhMNy45MSA3LjI2TDEwIDJaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTAgMTBMMTEuMDkgMTIuMjZMMTQgMTNMMTEuMDkgMTMuNzRMMTAgMTZMOC45MSAxMy43NEw2IDEzTDguOTEgMTIuMjZMMTAgMTBaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4KPC9zdmc+'
  },
  notebooklm: {
    sources: [
      'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://www.google.com/s2/favicons?sz=32&domain=notebooklm.google')
    ],
    base64: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiMxQTczRTgiLz4KPHN2ZyB4PSI2IiB5PSI2IiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0xMCAyTDEyLjA5IDcuMjZMMTggOEwxMi4wOSA4Ljc0TDEwIDE0TDcuOTEgOC43NEwyIDhMNy45MSA3LjI2TDEwIDJaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTAgMTBMMTEuMDkgMTIuMjZMMTQgMTNMMTEuMDkgMTMuNzRMMTAgMTZMOC45MSAxMy43NEw2IDEzTDguOTEgMTIuMjZMMTAgMTBaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4KPC9zdmc+'
  }
};

// 版本号用于缓存刷新
const CACHE_VERSION = 'v5'; // 更新版本号强制刷新

// 调试模式
const DEBUG_MODE = false; // 关闭调试以减少控制台输出

// 全局函数：强制清除所有平台图标缓存
window.clearPlatformIconCache = () => {
  let clearedCount = 0;
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.startsWith('platform_icon_')) {
      localStorage.removeItem(key);
      clearedCount++;
    }
  }
  console.log(`%c[PlatformIcon] 强制清理了 ${clearedCount} 个图标缓存`, 'color: #1A73E8; font-weight: bold');
  console.log(`%c[PlatformIcon] 页面将在 2 秒后自动刷新...`, 'color: #4B5563');
  // 延迟刷新以显示消息
  setTimeout(() => {
    window.location.reload();
  }, 2000);
};

// 全局函数：显示当前图标缓存状态
window.showPlatformIconStatus = () => {
  const iconKeys = ['claude', 'gemini', 'notebooklm'];
  const currentVersion = CACHE_VERSION;
  
  console.log(`%c[PlatformIcon] 当前版本: ${currentVersion}`, 'color: #1A73E8; font-weight: bold');
  console.log('%c[PlatformIcon] 缓存状态:', 'color: #1A73E8; font-weight: bold');
  
  iconKeys.forEach(iconKey => {
    const cacheKey = `platform_icon_${iconKey}_${currentVersion}_16`;
    const cached = localStorage.getItem(cacheKey);
    
    let status = '❓ 未缓存';
    let color = '#666';
    
    if (cached === 'use_base64') {
      status = '🎨 使用Base64图标';
      color = '#1A73E8';
    } else if (cached === 'failed') {
      status = '❌ 加载失败';
      color = '#DC2626';
    } else if (cached && cached.startsWith('data:image')) {
      status = '✅ 缓存成功';
      color = '#059669';
    }
    
    console.log(`%c  ${iconKey}: ${status}`, `color: ${color}`);
  });
  
  console.log('%c调试命令:', 'color: #1A73E8; font-weight: bold');
  console.log('%c  clearPlatformIconCache() - 清除所有缓存并刷新', 'color: #666');
  console.log('%c  showPlatformIconStatus() - 显示当前状态', 'color: #666');
};

const PlatformIcon = ({ platform, format, size = 16, style = {} }) => {
  const [iconSrc, setIconSrc] = useState(null);
  const [hasError, setHasError] = useState(false);

  // 根据format和platform确定使用哪个图标
  const getIconKey = () => {
    if (format === 'gemini_notebooklm') {
      if (platform === 'notebooklm') return 'notebooklm';
      // 支持多种 Gemini 平台名称
      if (platform === 'gemini' || platform === 'aistudio' || platform === 'google ai studio') {
        return 'gemini';
      }
      return 'gemini'; // 默认为gemini
    }
    return 'claude';
  };

  const iconKey = getIconKey();
  const iconConfig = PLATFORM_ICONS[iconKey];

  useEffect(() => {
    // 改进的缓存key，包含版本号和尺寸
    const cacheKey = `platform_icon_${iconKey}_${CACHE_VERSION}_${size}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (DEBUG_MODE) {
      console.log(`[PlatformIcon] 初始化: platform=${platform}, format=${format}, iconKey=${iconKey}`);
    }
    
    // 检查缓存是否有效
    if (cached && cached !== 'failed' && (cached.startsWith('data:image') || cached === 'use_base64')) {
      if (cached === 'use_base64') {
        // 使用base64图标
        setIconSrc(iconConfig.base64);
        setHasError(false);
        if (DEBUG_MODE) console.log(`[PlatformIcon] 使用缓存base64: ${iconKey}`);
      } else {
        // 使用缓存的图标
        setIconSrc(cached);
        setHasError(false);
        if (DEBUG_MODE) console.log(`[PlatformIcon] 使用缓存图标: ${iconKey}`);
      }
      return;
    }
    
    // 如果缓存显示失败过，直接使用base64图标
    if (cached === 'failed') {
      setIconSrc(iconConfig.base64);
      setHasError(false);
      if (DEBUG_MODE) console.log(`[PlatformIcon] 缓存失败，使用base64: ${iconKey}`);
      return;
    }

    // 清除旧缓存
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`platform_icon_${iconKey}_`) && !key.includes(CACHE_VERSION)) {
        localStorage.removeItem(key);
      }
    }

    // 重置状态
    setIconSrc(null);
    setHasError(false);

    // 尝试加载图标的函数
    const tryLoadIcon = async () => {
      if (DEBUG_MODE) console.log(`[PlatformIcon] 开始尝试加载: ${iconKey}`);
      
      // 如果没有sources或sources为空，直接使用base64
      if (!iconConfig.sources || iconConfig.sources.length === 0) {
        if (DEBUG_MODE) console.log(`[PlatformIcon] 无外部源，直接使用base64: ${iconKey}`);
        setIconSrc(iconConfig.base64);
        setHasError(false);
        localStorage.setItem(cacheKey, 'use_base64');
        return;
      }
      
      // 尝试所有源
      for (let i = 0; i < iconConfig.sources.length; i++) {
        const url = iconConfig.sources[i];
        if (DEBUG_MODE) console.log(`[PlatformIcon] 尝试源 ${i + 1}/${iconConfig.sources.length}: ${url}`);
        
        try {
          const success = await tryLoadFromUrl(url, cacheKey, iconKey);
          if (success) {
            if (DEBUG_MODE) console.log(`[PlatformIcon] 成功加载: ${iconKey} from ${url}`);
            return;
          }
        } catch (error) {
          if (DEBUG_MODE) console.warn(`[PlatformIcon] 源 ${i + 1} 失败:`, error);
          continue;
        }
      }
      
      // 所有源都失败，使用base64图标
      if (DEBUG_MODE) console.log(`[PlatformIcon] 所有源都失败，使用base64: ${iconKey}`);
      setIconSrc(iconConfig.base64);
      setHasError(false);
      localStorage.setItem(cacheKey, 'use_base64');
    };

    tryLoadIcon();
  }, [iconKey, iconConfig, size]);

  // 尝试从单个URL加载图标
  const tryLoadFromUrl = (url, cacheKey, iconKey) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      // 设置超时
      const timeoutId = setTimeout(() => {
        resolve(false);
      }, 3000); // 3秒超时，更快切换到下一个源
      
      img.onload = () => {
        clearTimeout(timeoutId);
        
        // 转换为base64
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        
        try {
          ctx.drawImage(img, 0, 0, 32, 32);
          const dataUrl = canvas.toDataURL('image/png');
          setIconSrc(dataUrl);
          localStorage.setItem(cacheKey, dataUrl);
          setHasError(false);
          resolve(true);
        } catch (error) {
          resolve(false);
        }
      };
      
      img.onerror = () => {
        clearTimeout(timeoutId);
        resolve(false);
      };
      
      img.src = url;
    });
  };

  // 显示fallback或真实图标
  if (!iconSrc || hasError) {
    const fallback = iconConfig.fallback || '✨';
    return (
      <span 
        style={{ 
          fontSize: size,
          lineHeight: 1,
          display: 'inline-block',
          verticalAlign: 'middle',
          ...style 
        }}
      >
        {fallback}
      </span>
    );
  }

  return (
    <img 
      src={iconSrc}
      alt={iconKey}
      style={{ 
        width: size, 
        height: size,
        display: 'inline-block',
        verticalAlign: 'middle',
        borderRadius: '2px', // 轻微圆角
        ...style 
      }}
      onError={() => {
        // 如果显示错误，尝试使用base64后备
        if (iconSrc !== iconConfig.base64) {
          setIconSrc(iconConfig.base64);
        } else {
          // base64也失败了，使用emoji
          setHasError(true);
        }
      }}
    />
  );
};

export default PlatformIcon;