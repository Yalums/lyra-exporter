// utils/copyManager.js
// 统一的复制功能管理模块

import { StorageUtils, TextUtils } from './commonUtils.js';

/**
 * 复制配置管理
 */
export class CopyConfigManager {
  static getConfig() {
    // 获取导出配置中的思考格式设置
    const exportConfig = StorageUtils.getLocalStorage('export-config', {});
    
    return StorageUtils.getLocalStorage('copy_options', {
      includeThinking: false,
      includeArtifacts: false,
      includeMetadata: true,
      thinkingFormat: exportConfig.thinkingFormat || 'codeblock'
    });
  }

  static saveConfig(config) {
    return StorageUtils.setLocalStorage('copy_options', config);
  }
}

/**
 * 消息格式化器
 */
export class MessageFormatter {
  /**
   * 格式化思考过程
   */
  static formatThinking(thinking, format = 'codeblock') {
    switch (format) {
      case 'codeblock':
        // 代码块格式（思考前置）
        return [
          '```thinking',
          thinking,
          '```'
        ].join('\n');
      
      case 'xml':
        // XML标签格式（思考前置）
        return [
          '<anthropic_thinking>',
          thinking,
          '</anthropic_thinking>'
        ].join('\n');
      
      case 'emoji':
      default:
        // Emoji格式（内容后置）
        return [
          '💭 思考过程:',
          '```',
          thinking,
          '```'
        ].join('\n');
    }
  }

  static format(message, options = {}) {
    const config = {
      ...CopyConfigManager.getConfig(),
      ...options
    };
    
    const parts = [];
    
    // 添加元数据
    if (config.includeMetadata) {
      parts.push(
        `【${message.sender_label}】`,
        message.timestamp ? `时间: ${message.timestamp}` : null,
        '---'
      );
    }
    
    // 思考过程（前置）- 格式为 codeblock 或 xml
    const thinkingFormat = config.thinkingFormat || 'codeblock';
    if (config.includeThinking && message.thinking && 
        (thinkingFormat === 'codeblock' || thinkingFormat === 'xml')) {
      const thinkingText = this.formatThinking(message.thinking, thinkingFormat);
      parts.push('', thinkingText);
    }
    
    // 添加主要内容
    if (message.display_text) {
      parts.push(message.display_text);
    }
    
    // 思考过程（后置）- 格式为 emoji
    if (config.includeThinking && message.thinking && thinkingFormat === 'emoji') {
      const thinkingText = this.formatThinking(message.thinking, thinkingFormat);
      parts.push('', thinkingText);
    }
    
    // 添加Artifacts
    if (config.includeArtifacts && message.artifacts?.length > 0) {
      parts.push('', '🔧 Artifacts:');
      
      message.artifacts.forEach(artifact => {
        parts.push(
          '',
          `### ${artifact.title || '无标题'} (${artifact.type || '未知类型'})`
        );
        
        if (artifact.content) {
          const language = artifact.language || '';
          parts.push(
            `\`\`\`${language}`,
            artifact.content,
            '```'
          );
        }
      });
    }
    
    return parts.filter(Boolean).join('\n');
  }
}

/**
 * 剪贴板操作管理
 */
export class ClipboardManager {
  static async copy(text) {
    try {
      // 优先使用现代API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      
      // 降级方案
      return this.copyFallback(text);
    } catch (error) {
      console.error('Copy failed:', error);
      return false;
    }
  }

  static copyFallback(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.cssText = 'position: fixed; left: -999999px; top: -999999px;';
    document.body.appendChild(textarea);
    
    try {
      textarea.focus();
      textarea.select();
      const success = document.execCommand('copy');
      return success;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

/**
 * 通知管理器
 */
export class NotificationManager {
  static show(message, type = 'success', duration = 3000) {
    // 移除已存在的通知
    const existing = document.querySelector('.copy-notification');
    if (existing) existing.remove();
    
    // 创建新通知
    const notification = this.createElement(message, type);
    document.body.appendChild(notification);
    
    // 自动移除
    setTimeout(() => {
      notification.style.animation = 'slideUp 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, duration);
  }

  static createElement(message, type) {
    const notification = document.createElement('div');
    notification.className = `copy-notification ${type}`;
    notification.textContent = message;
    
    const styles = {
      success: '#4CAF50',
      error: '#f44336',
      info: '#2196F3'
    };
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 20px;
      background: ${styles[type] || styles.info};
      color: white;
      border-radius: 4px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      z-index: 10000;
      animation: slideDown 0.3s ease;
      font-size: 14px;
    `;
    
    return notification;
  }

  static initStyles() {
    if (document.querySelector('#notification-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      @keyframes slideDown {
        from { 
          opacity: 0;
          transform: translate(-50%, -20px);
        }
        to {
          opacity: 1;
          transform: translate(-50%, 0);
        }
      }
      @keyframes slideUp {
        from {
          opacity: 1;
          transform: translate(-50%, 0);
        }
        to {
          opacity: 0;
          transform: translate(-50%, -20px);
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// 初始化样式
NotificationManager.initStyles();

/**
 * 主复制功能函数
 */
export async function copyMessage(message, options = {}) {
  try {
    const formattedText = MessageFormatter.format(message, options);
    const success = await ClipboardManager.copy(formattedText);
    
    if (success) {
      NotificationManager.show('已复制到剪贴板');
    } else {
      NotificationManager.show('复制失败，请重试', 'error');
    }
    
    return success;
  } catch (error) {
    console.error('Copy message error:', error);
    NotificationManager.show('复制失败', 'error');
    return false;
  }
}

/**
 * 批量复制功能
 */
export async function copyMessages(messages, options = {}) {
  try {
    const texts = messages.map(msg => MessageFormatter.format(msg, options));
    const combinedText = texts.join('\n\n---\n\n');
    const success = await ClipboardManager.copy(combinedText);
    
    if (success) {
      NotificationManager.show(`已复制 ${messages.length} 条消息`);
    } else {
      NotificationManager.show('复制失败，请重试', 'error');
    }
    
    return success;
  } catch (error) {
    console.error('Copy messages error:', error);
    NotificationManager.show('复制失败', 'error');
    return false;
  }
}
