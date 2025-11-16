// utils/themeManager.js
// 主题管理工具

import { StorageUtils } from '../App';

/**
 * 主题管理工具
 */
export const ThemeUtils = {
  /**
   * 获取当前主题
   */
  getCurrentTheme() {
    return StorageUtils.getLocalStorage('app-theme', 'dark');
  },

  /**
   * 应用主题
   */
  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    StorageUtils.setLocalStorage('app-theme', theme);
    if (window.updatePWAThemeColor) {
      setTimeout(() => {
        window.updatePWAThemeColor();
      }, 50);
    }
  },

  /**
   * 切换主题
   */
  toggleTheme() {
    const currentTheme = this.getCurrentTheme();
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(newTheme);
    return newTheme;
  }
};
