/**
 * StorageManager - 统一的 localStorage 操作工具
 *
 * 解决问题：
 * - markManager, starManager, sortManager 等都重复实现 localStorage 包装
 * - 分散在 12+ 文件中的 50+ localStorage 调用
 * - 不一致的错误处理
 *
 * 使用示例：
 * import StorageManager from './utils/storageManager';
 *
 * // 基础操作
 * StorageManager.set('theme', 'dark');
 * const theme = StorageManager.get('theme', 'light');
 *
 * // 专用方法
 * const marks = StorageManager.getMarks(fileUuid);
 * StorageManager.setMarks(fileUuid, newMarks);
 */

const STORAGE_PREFIX = 'lyra_';

class StorageManager {
  /**
   * 从 localStorage 读取数据
   * @template T
   * @param {string} key - 存储键（自动添加 lyra_ 前缀）
   * @param {T} defaultValue - 默认值
   * @returns {T} 存储的值或默认值
   */
  static get(key, defaultValue = null) {
    try {
      const fullKey = STORAGE_PREFIX + key;
      const item = localStorage.getItem(fullKey);

      if (item === null) {
        return defaultValue;
      }

      // 尝试解析 JSON，失败则返回字符串
      try {
        return JSON.parse(item);
      } catch {
        return item;
      }
    } catch (error) {
      console.warn(`[StorageManager] Failed to get "${key}":`, error);
      return defaultValue;
    }
  }

  /**
   * 写入数据到 localStorage
   * @param {string} key - 存储键
   * @param {any} value - 要存储的值（自动 JSON 序列化）
   * @returns {boolean} 是否成功
   */
  static set(key, value) {
    try {
      const fullKey = STORAGE_PREFIX + key;
      const stringValue = typeof value === 'string'
        ? value
        : JSON.stringify(value);

      localStorage.setItem(fullKey, stringValue);
      return true;
    } catch (error) {
      console.error(`[StorageManager] Failed to set "${key}":`, error);

      // 检查是否超出配额
      if (error.name === 'QuotaExceededError') {
        console.error('[StorageManager] localStorage quota exceeded');
        console.error(`Current size: ${this.getSize()} bytes`);
      }

      return false;
    }
  }

  /**
   * 删除存储项
   * @param {string} key - 存储键
   * @returns {boolean} 是否成功
   */
  static remove(key) {
    try {
      const fullKey = STORAGE_PREFIX + key;
      localStorage.removeItem(fullKey);
      return true;
    } catch (error) {
      console.warn(`[StorageManager] Failed to remove "${key}":`, error);
      return false;
    }
  }

  /**
   * 清空所有 lyra_ 前缀的存储项
   * @returns {boolean} 是否成功
   */
  static clearAll() {
    try {
      const keys = Object.keys(localStorage)
        .filter(k => k.startsWith(STORAGE_PREFIX));

      keys.forEach(k => localStorage.removeItem(k));
      console.log(`[StorageManager] Cleared ${keys.length} items`);
      return true;
    } catch (error) {
      console.error('[StorageManager] Failed to clear all:', error);
      return false;
    }
  }

  /**
   * 获取存储占用大小（估算）
   * @returns {number} 字节数
   */
  static getSize() {
    try {
      let total = 0;
      for (let key in localStorage) {
        if (key.startsWith(STORAGE_PREFIX)) {
          total += localStorage[key].length + key.length;
        }
      }
      return total;
    } catch {
      return 0;
    }
  }

  /**
   * 获取所有存储键（不带前缀）
   * @returns {string[]} 键名列表
   */
  static getAllKeys() {
    try {
      return Object.keys(localStorage)
        .filter(k => k.startsWith(STORAGE_PREFIX))
        .map(k => k.substring(STORAGE_PREFIX.length));
    } catch {
      return [];
    }
  }

  /**
   * 专用方法：获取标记数据
   * @param {string} fileUuid - 文件 UUID
   * @returns {Object} 标记数据 { completed: Set, important: Set, deleted: Set }
   */
  static getMarks(fileUuid) {
    const key = `marks_${fileUuid}`;
    const data = this.get(key, {});

    // 转换为 Set 结构
    return {
      completed: new Set(data.completed || []),
      important: new Set(data.important || []),
      deleted: new Set(data.deleted || [])
    };
  }

  /**
   * 专用方法：保存标记数据
   * @param {string} fileUuid - 文件 UUID
   * @param {Object} marks - 标记数据
   */
  static setMarks(fileUuid, marks) {
    const key = `marks_${fileUuid}`;

    // 转换 Set 为数组以便序列化
    const data = {
      completed: Array.from(marks.completed || []),
      important: Array.from(marks.important || []),
      deleted: Array.from(marks.deleted || [])
    };

    return this.set(key, data);
  }

  /**
   * 专用方法：获取星标列表
   * @param {string} fileUuid - 文件 UUID
   * @returns {Array} 星标的对话 UUID 列表
   */
  static getStars(fileUuid) {
    const key = `stars_${fileUuid}`;
    return this.get(key, []);
  }

  /**
   * 专用方法：保存星标列表
   * @param {string} fileUuid - 文件 UUID
   * @param {Array} stars - 星标列表
   */
  static setStars(fileUuid, stars) {
    const key = `stars_${fileUuid}`;
    return this.set(key, stars);
  }

  /**
   * 专用方法：获取配置
   * @param {string} configKey - 配置键
   * @param {Object} defaultValue - 默认配置
   * @returns {Object} 配置对象
   */
  static getConfig(configKey, defaultValue = {}) {
    return this.get(configKey, defaultValue);
  }

  /**
   * 专用方法：保存配置
   * @param {string} configKey - 配置键
   * @param {Object} config - 配置对象
   */
  static setConfig(configKey, config) {
    return this.set(configKey, config);
  }
}

export default StorageManager;
