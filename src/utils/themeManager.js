// utils/themeManager.js
// 主题管理工具

import StorageManager from './data/storageManager';

/**
 * 主题管理工具
 */
export const ThemeUtils = {
  /**
   * 获取当前主题
   */
  getCurrentTheme() {
    return StorageManager.get('app-theme', 'dark');
  },

  /**
   * 应用主题
   */
  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    StorageManager.set('app-theme', theme);
    if (window.updatePWAThemeColor) {
      setTimeout(() => {
        window.updatePWAThemeColor();
      }, 50);
    }
  },

  /**
   * 切换主题 (dark → light → eink → dark)
   */
  toggleTheme() {
    const currentTheme = this.getCurrentTheme();
    const themeOrder = ['dark', 'light', 'eink'];
    const currentIndex = themeOrder.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    const newTheme = themeOrder[nextIndex];
    this.applyTheme(newTheme);
    return newTheme;
  },

  /**
   * 获取所有可用主题
   */
  getAvailableThemes() {
    return ['dark', 'light', 'eink'];
  }
};
