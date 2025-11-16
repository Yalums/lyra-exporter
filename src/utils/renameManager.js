// utils/renameManager.js
// 对话和文件重命名管理器

import { StorageUtils } from '../App';

/**
 * 重命名管理器类
 * 用于管理对话和文件的自定义名称
 */
export class RenameManager {
  constructor() {
    this.renames = this.loadRenames();
  }

  /**
   * 从localStorage加载所有重命名
   */
  loadRenames() {
    return StorageUtils.getLocalStorage('conversation_renames', {});
  }

  /**
   * 保存重命名到localStorage
   */
  saveRenames() {
    StorageUtils.setLocalStorage('conversation_renames', this.renames);
  }

  /**
   * 设置重命名
   * @param {string} uuid - 对话或文件的UUID
   * @param {string} newName - 新名称
   */
  setRename(uuid, newName) {
    if (!uuid || !newName) return;
    
    // 如果新名称为空或只有空格,删除重命名
    const trimmedName = newName.trim();
    if (!trimmedName) {
      delete this.renames[uuid];
    } else {
      this.renames[uuid] = trimmedName;
    }
    
    this.saveRenames();
  }

  /**
   * 获取重命名后的名称
   * @param {string} uuid - 对话或文件的UUID
   * @param {string} originalName - 原始名称(作为fallback)
   * @returns {string} 重命名后的名称或原始名称
   */
  getRename(uuid, originalName = '') {
    return this.renames[uuid] || originalName;
  }

  /**
   * 检查是否有重命名
   * @param {string} uuid - 对话或文件的UUID
   * @returns {boolean}
   */
  hasRename(uuid) {
    return uuid in this.renames;
  }

  /**
   * 删除重命名
   * @param {string} uuid - 对话或文件的UUID
   */
  removeRename(uuid) {
    if (uuid in this.renames) {
      delete this.renames[uuid];
      this.saveRenames();
    }
  }

  /**
   * 清除所有重命名
   */
  clearAllRenames() {
    this.renames = {};
    this.saveRenames();
  }

  /**
   * 获取所有重命名
   */
  getAllRenames() {
    return { ...this.renames };
  }

  /**
   * 获取重命名统计
   */
  getStats() {
    return {
      total: Object.keys(this.renames).length
    };
  }
}

// 创建全局单例实例
let globalRenameManager = null;

/**
 * 获取全局重命名管理器实例
 */
export function getRenameManager() {
  if (!globalRenameManager) {
    globalRenameManager = new RenameManager();
  }
  return globalRenameManager;
}

export default RenameManager;
