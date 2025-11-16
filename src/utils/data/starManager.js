// utils/data/starManager.js
// 星标系统管理（仅用于claude_full_export格式）

const STAR_STORAGE_PREFIX = 'starred_conversations_';
const STAR_STORAGE_VERSION = 'v1';

export class StarManager {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.starredConversations = this.loadStars();
  }

  /**
   * 从localStorage加载星标数据
   */
  loadStars() {
    if (!this.enabled) return new Map();

    try {
      const storageKey = `${STAR_STORAGE_PREFIX}${STAR_STORAGE_VERSION}`;
      const savedData = localStorage.getItem(storageKey);
      
      if (savedData) {
        const parsed = JSON.parse(savedData);
        const starMap = new Map(Object.entries(parsed));
        console.log(`[StarSystem] 加载了 ${starMap.size} 个星标设置`);
        return starMap;
      }
    } catch (error) {
      console.error('[StarSystem] 加载星标数据失败:', error);
    }
    
    return new Map();
  }

  /**
   * 保存星标数据到localStorage
   */
  saveToStorage() {
    if (!this.enabled) return;

    try {
      const storageKey = `${STAR_STORAGE_PREFIX}${STAR_STORAGE_VERSION}`;
      const dataToSave = Object.fromEntries(this.starredConversations);
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
      console.log(`[StarSystem] 保存了 ${this.starredConversations.size} 个星标设置`);
    } catch (error) {
      console.error('[StarSystem] 保存星标数据失败:', error);
    }
  }

  /**
   * 切换星标状态
   */
  toggleStar(conversationUuid, nativeIsStarred = false) {
    if (!this.enabled) return new Map(this.starredConversations);

    const currentStarred = this.isStarred(conversationUuid, nativeIsStarred);
    
    if (currentStarred) {
      // 当前是星标状态，需要取消星标
      if (nativeIsStarred) {
        // 原生是星标，我们需要记录为false来覆盖
        this.starredConversations.set(conversationUuid, false);
      } else {
        // 原生不是星标，我们之前设置为true，现在删除这个设置
        this.starredConversations.delete(conversationUuid);
      }
    } else {
      // 当前不是星标状态，需要添加星标
      if (!nativeIsStarred) {
        // 原生不是星标，我们需要记录为true
        this.starredConversations.set(conversationUuid, true);
      } else {
        // 原生是星标但被我们覆盖为false，现在删除这个覆盖
        this.starredConversations.delete(conversationUuid);
      }
    }
    
    this.saveToStorage();
    // 返回新的Map实例，这样React能检测到变化
    return new Map(this.starredConversations);
  }

  /**
   * 检查对话是否被星标（考虑手动覆盖）
   */
  isStarred(conversationUuid, nativeIsStarred = false) {
    if (!this.enabled) return nativeIsStarred;

    // 如果有手动设置，使用手动设置的值
    if (this.starredConversations.has(conversationUuid)) {
      return this.starredConversations.get(conversationUuid);
    }
    
    // 否则使用原生值
    return nativeIsStarred;
  }

  /**
   * 清除所有手动星标设置（恢复到原生状态）
   */
  clearAllStars() {
    if (!this.enabled) return new Map(this.starredConversations);

    this.starredConversations.clear();
    const storageKey = `${STAR_STORAGE_PREFIX}${STAR_STORAGE_VERSION}`;
    localStorage.removeItem(storageKey);
    console.log('[StarSystem] 已清除所有手动星标设置');
    
    // 返回新的Map实例，这样React能检测到变化
    return new Map(this.starredConversations);
  }

  /**
   * 获取星标统计
   */
  getStarStats(conversations) {
    if (!this.enabled) return { totalStarred: 0, manuallyStarred: 0, manuallyUnstarred: 0 };

    let totalStarred = 0;
    let manuallyStarred = 0;
    let manuallyUnstarred = 0;

    conversations.forEach(conv => {
      const nativeIsStarred = conv.is_starred || false;
      const actualIsStarred = this.isStarred(conv.uuid, nativeIsStarred);
      
      if (actualIsStarred) {
        totalStarred++;
      }
      
      // 统计手动更改
      if (this.starredConversations.has(conv.uuid)) {
        const manualValue = this.starredConversations.get(conv.uuid);
        if (manualValue && !nativeIsStarred) {
          manuallyStarred++;
        } else if (!manualValue && nativeIsStarred) {
          manuallyUnstarred++;
        }
      }
    });

    return {
      totalStarred,
      manuallyStarred,
      manuallyUnstarred
    };
  }

  /**
   * 导出星标数据（用于备份）
   */
  exportStarData() {
    if (!this.enabled) return null;

    return {
      version: STAR_STORAGE_VERSION,
      timestamp: new Date().toISOString(),
      data: Object.fromEntries(this.starredConversations)
    };
  }

  /**
   * 导入星标数据（用于恢复）
   */
  importStarData(data) {
    if (!this.enabled) return false;

    try {
      if (data && data.version === STAR_STORAGE_VERSION && data.data) {
        this.starredConversations = new Map(Object.entries(data.data));
        this.saveToStorage();
        console.log(`[StarSystem] 导入了 ${this.starredConversations.size} 个星标设置`);
        return true;
      }
    } catch (error) {
      console.error('[StarSystem] 导入星标数据失败:', error);
    }
    return false;
  }

  /**
   * 获取当前星标Map
   */
  getStarredConversations() {
    return this.starredConversations;
  }
}