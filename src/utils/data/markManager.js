// utils/data/markManager.js
// 标记系统管理（完成、重要、删除）

const MARK_TYPES = {
  COMPLETED: 'completed',
  IMPORTANT: 'important',
  DELETED: 'deleted'
};

export class MarkManager {
  constructor(fileUuid) {
    this.fileUuid = fileUuid;
    this.marks = this.loadMarks();
  }

  /**
   * 从localStorage加载标记数据
   */
  loadMarks() {
    if (!this.fileUuid) {
      return {
        [MARK_TYPES.COMPLETED]: new Set(),
        [MARK_TYPES.IMPORTANT]: new Set(),
        [MARK_TYPES.DELETED]: new Set()
      };
    }

    const storageKey = `marks_${this.fileUuid}`;
    const savedData = localStorage.getItem(storageKey);
    
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        return {
          [MARK_TYPES.COMPLETED]: new Set(parsed.completed || []),
          [MARK_TYPES.IMPORTANT]: new Set(parsed.important || []),
          [MARK_TYPES.DELETED]: new Set(parsed.deleted || [])
        };
      } catch (error) {
        console.error('Failed to load marks:', error);
      }
    }

    return {
      [MARK_TYPES.COMPLETED]: new Set(),
      [MARK_TYPES.IMPORTANT]: new Set(),
      [MARK_TYPES.DELETED]: new Set()
    };
  }

  /**
   * 保存标记数据到localStorage
   */
  saveMarks() {
    if (!this.fileUuid) return;
    
    const storageKey = `marks_${this.fileUuid}`;
    const dataToSave = {
      completed: Array.from(this.marks[MARK_TYPES.COMPLETED]),
      important: Array.from(this.marks[MARK_TYPES.IMPORTANT]),
      deleted: Array.from(this.marks[MARK_TYPES.DELETED])
    };
    
    localStorage.setItem(storageKey, JSON.stringify(dataToSave));
  }

  /**
   * 切换标记
   */
  toggleMark(messageIndex, markType) {
    if (this.marks[markType].has(messageIndex)) {
      this.marks[markType].delete(messageIndex);
    } else {
      this.marks[markType].add(messageIndex);
    }
    this.saveMarks();
    return this.marks;
  }

  /**
   * 批量标记
   */
  batchMark(messageIndexes, markType, isMarked) {
    messageIndexes.forEach(index => {
      if (isMarked) {
        this.marks[markType].add(index);
      } else {
        this.marks[markType].delete(index);
      }
    });
    this.saveMarks();
    return this.marks;
  }

  /**
   * 清除所有标记
   */
  clearAllMarks() {
    this.marks = {
      [MARK_TYPES.COMPLETED]: new Set(),
      [MARK_TYPES.IMPORTANT]: new Set(),
      [MARK_TYPES.DELETED]: new Set()
    };
    this.saveMarks();
    return this.marks;
  }

  /**
   * 清除特定类型的标记
   */
  clearMarksByType(markType) {
    this.marks[markType] = new Set();
    this.saveMarks();
    return this.marks;
  }

  /**
   * 检查是否已标记
   */
  isMarked(messageIndex, markType) {
    return this.marks[markType]?.has(messageIndex) || false;
  }

  /**
   * 获取标记统计
   */
  getStats() {
    return {
      completed: this.marks[MARK_TYPES.COMPLETED].size,
      important: this.marks[MARK_TYPES.IMPORTANT].size,
      deleted: this.marks[MARK_TYPES.DELETED].size,
      total: this.marks[MARK_TYPES.COMPLETED].size + 
             this.marks[MARK_TYPES.IMPORTANT].size + 
             this.marks[MARK_TYPES.DELETED].size
    };
  }

  /**
   * 获取当前标记状态
   */
  getMarks() {
    return this.marks;
  }
}

/**
 * 获取文件的标记数据（静态方法）
 */
export const getFileMarks = (fileUuid) => {
  const manager = new MarkManager(fileUuid);
  return manager.getMarks();
};

/**
 * 获取所有文件的标记统计
 */
export const getAllMarksStats = (files, processedData, currentFileIndex, generateFileCardUuid, generateConversationCardUuid) => {
  const stats = {
    completed: 0,
    important: 0,
    deleted: 0,
    total: 0
  };
  
  // 统计普通文件标记
  files.forEach((file, index) => {
    const fileUuid = generateFileCardUuid(index, file);
    const marks = getFileMarks(fileUuid);
    
    stats.completed += marks.completed.size;
    stats.important += marks.important.size;
    stats.deleted += marks.deleted.size;
  });
  
  // 统计对话标记（claude_full_export格式）
  if (currentFileIndex !== null && processedData?.format === 'claude_full_export') {
    const conversations = processedData.views?.conversationList || [];
    
    conversations.forEach(conv => {
      const convUuid = generateConversationCardUuid(currentFileIndex, conv.uuid, files[currentFileIndex]);
      const marks = getFileMarks(convUuid);
      
      stats.completed += marks.completed.size;
      stats.important += marks.important.size;
      stats.deleted += marks.deleted.size;
    });
  }
  
  stats.total = stats.completed + stats.important + stats.deleted;
  return stats;
};
