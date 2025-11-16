// utils/data/sortManager.js
// 消息排序管理 - 修复文件切换时的数据混乱问题

export class SortManager {
  constructor(messages, fileUuid) {
    this.originalMessages = [...messages]; // 深拷贝原始消息，避免引用问题
    this.fileUuid = fileUuid;
    this.customOrder = this.loadCustomOrder();
    this.sortedMessages = this.applySorting([...messages]); // 使用拷贝进行排序
  }

  /**
   * 从localStorage加载自定义排序
   */
  loadCustomOrder() {
    if (!this.fileUuid) return {};
    
    const savedOrder = localStorage.getItem(`message_order_${this.fileUuid}`);
    if (savedOrder) {
      try {
        return JSON.parse(savedOrder);
      } catch (e) {
        console.error('Failed to load message order:', e);
      }
    }
    return {};
  }

  /**
   * 保存排序到localStorage
   */
  saveOrder() {
    if (!this.fileUuid) return;
    localStorage.setItem(`message_order_${this.fileUuid}`, JSON.stringify(this.customOrder));
  }

  /**
   * 应用自定义排序
   */
  applySorting(messages) {
    if (Object.keys(this.customOrder).length === 0) {
      return [...messages]; // 返回拷贝
    }
    
    // 验证自定义排序是否适用于当前消息
    const messageIndexes = new Set(messages.map(m => m.index));
    const orderIndexes = new Set(Object.keys(this.customOrder).map(k => parseInt(k)));
    
    // 如果索引不匹配，说明是不同文件的排序，清除它
    const hasValidOrder = Array.from(orderIndexes).every(idx => messageIndexes.has(idx));
    
    if (!hasValidOrder) {
      console.warn('Invalid custom order detected, resetting...');
      this.customOrder = {};
      this.saveOrder();
      return [...messages];
    }
    
    return [...messages].sort((a, b) => {
      const orderA = this.customOrder[a.index] ?? a.index;
      const orderB = this.customOrder[b.index] ?? b.index;
      return orderA - orderB;
    });
  }

  /**
   * 更新消息列表
   */
  updateMessages(newMessages) {
    // 确保新消息确实属于这个文件
    if (newMessages.length === 0) {
      this.originalMessages = [];
      this.sortedMessages = [];
      return this.sortedMessages;
    }
    
    // 深拷贝新消息
    this.originalMessages = [...newMessages];
    
    // 重新应用排序
    this.sortedMessages = this.applySorting([...newMessages]);
    
    // 验证排序后的消息数量
    if (this.sortedMessages.length !== this.originalMessages.length) {
      console.error('Sort count mismatch, resetting to original');
      this.sortedMessages = [...this.originalMessages];
      this.customOrder = {};
      this.saveOrder();
    }
    
    return this.sortedMessages;
  }

  /**
   * 重置排序
   */
  resetSort() {
    this.customOrder = {};
    this.sortedMessages = [...this.originalMessages];
    if (this.fileUuid) {
      localStorage.removeItem(`message_order_${this.fileUuid}`);
    }
    return this.sortedMessages;
  }

  /**
   * 移动消息
   */
  moveMessage(fromIndex, direction) {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    
    if (toIndex < 0 || toIndex >= this.sortedMessages.length) {
      return this.sortedMessages;
    }

    const newSortedMessages = [...this.sortedMessages];
    const [movedMessage] = newSortedMessages.splice(fromIndex, 1);
    newSortedMessages.splice(toIndex, 0, movedMessage);

    // 创建新的排序映射
    this.customOrder = {};
    newSortedMessages.forEach((msg, idx) => {
      this.customOrder[msg.index] = idx;
    });

    this.sortedMessages = newSortedMessages;
    this.saveOrder();
    return this.sortedMessages;
  }

  /**
   * 启用排序
   */
  enableSort() {
    if (Object.keys(this.customOrder).length === 0 && this.originalMessages.length > 0) {
      this.customOrder = {};
      this.originalMessages.forEach((msg, idx) => {
        this.customOrder[msg.index] = idx;
      });
      this.saveOrder();
    }
    return this.sortedMessages;
  }

  /**
   * 批量排序
   */
  batchSort(sortFunction) {
    const newSortedMessages = [...this.originalMessages].sort(sortFunction);
    
    this.customOrder = {};
    newSortedMessages.forEach((msg, idx) => {
      this.customOrder[msg.index] = idx;
    });
    
    this.sortedMessages = newSortedMessages;
    this.saveOrder();
    return this.sortedMessages;
  }

  /**
   * 获取消息的自定义位置
   */
  getMessagePosition(messageIndex) {
    return this.customOrder[messageIndex] ?? messageIndex;
  }

  /**
   * 是否有自定义排序
   */
  hasCustomSort() {
    return Object.keys(this.customOrder).length > 0;
  }

  /**
   * 获取排序后的消息
   */
  getSortedMessages() {
    // 验证数据完整性
    if (this.sortedMessages.length !== this.originalMessages.length && this.originalMessages.length > 0) {
      console.error('Data integrity issue detected in SortManager');
      this.sortedMessages = [...this.originalMessages];
      this.customOrder = {};
      this.saveOrder();
    }
    return [...this.sortedMessages]; // 总是返回拷贝，避免外部修改
  }

  /**
   * 清理无效的排序数据
   */
  static cleanupInvalidOrders() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('message_order_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          if (!data || typeof data !== 'object') {
            localStorage.removeItem(key);
            console.log(`Removed invalid order: ${key}`);
          }
        } catch {
          localStorage.removeItem(key);
          console.log(`Removed corrupted order: ${key}`);
        }
      }
    });
  }
}