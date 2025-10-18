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
  static formatThinking(thinking, format = 'codeblock', thinkingLabel = '💭 Thinking Process:') {
    switch (format) {
      case 'codeblock':
        // 代码块格式（思考前置）
        return [
          '``` thinking',
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
          thinkingLabel,
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
    
    // 从 options 中获取翻译文本
    const i18n = options.i18n || {
      timeLabel: 'Time',
      thinkingLabel: '💭 Thinking Process:',
      artifactsLabel: '🔧 Artifacts:',
      attachmentsLabel: '📎 Attachments:',
      noTitle: 'No title',
      unknownType: 'Unknown type',
      content: 'Content'
    };
    
    const parts = [];
    
    // 添加元数据
    if (config.includeMetadata) {
      parts.push(
        `【${message.sender_label}】`,
        message.timestamp ? `${i18n.timeLabel}: ${message.timestamp}` : null,
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
    
    // 添加附件（在主内容之后）
    if (config.includeAttachments && message.attachments?.length > 0) {
      const attachmentsText = this.formatAttachments(message.attachments);
      if (attachmentsText) {
        parts.push('', attachmentsText);
      }
    }
    
    // 思考过程（后置）- 格式为 emoji
    if (config.includeThinking && message.thinking && thinkingFormat === 'emoji') {
      const thinkingText = this.formatThinking(message.thinking, thinkingFormat, i18n.thinkingLabel);
      parts.push('', thinkingText);
    }
    
    // 添加Artifacts
    if (config.includeArtifacts && message.artifacts?.length > 0) {
      parts.push('', i18n.artifactsLabel);
      
      message.artifacts.forEach(artifact => {
        parts.push(
          '',
          `### ${artifact.title || i18n.noTitle} (${artifact.type || i18n.unknownType})`
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

  /**
   * 格式化文件大小
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 格式化附件 - XML 结构化格式
   */
  static formatAttachments(attachments) {
    if (!attachments || attachments.length === 0) {
      return '';
    }
    
    const lines = ['<attachments>'];
    
    attachments.forEach((att, index) => {
      // 开始标签，包含索引和文件类型
      lines.push(`<attachment index="${index + 1}">`);
      
      // 文件名
      lines.push(`<file_name>${this.escapeXml(att.file_name || '未知文件')}</file_name>`);
      
      // 文件大小
      lines.push(`<file_size>${att.file_size || 0}</file_size>`);
      
      // 创建时间（如果有）
      if (att.created_at) {
        lines.push(`<created_at>${this.escapeXml(att.created_at)}</created_at>`);
      }
      
      // 文件内容
      if (att.extracted_content) {
        lines.push('<attachment_content>');
        lines.push(att.extracted_content);
        lines.push('</attachment_content>');
      }
      
      // 结束标签
      lines.push('</attachment>');
      
      // 附件之间添加空行（除了最后一个）
      if (index < attachments.length - 1) {
        lines.push('');
      }
    });
    
    lines.push('</attachments>');
    return lines.join('\n');
  }

  /**
   * XML 转义函数
   */
  static escapeXml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
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
    // 从 options 中获取翻译消息
    const messages = options.messages || {
      success: 'Copied to clipboard',
      error: 'Copy failed, please try again',
      generalError: 'Copy failed'
    };
    
    const formattedText = MessageFormatter.format(message, options);
    const success = await ClipboardManager.copy(formattedText);
    
    if (success) {
      NotificationManager.show(messages.success);
    } else {
      NotificationManager.show(messages.error, 'error');
    }
    
    return success;
  } catch (error) {
    console.error('Copy message error:', error);
    const messages = options.messages || { generalError: 'Copy failed' };
    NotificationManager.show(messages.generalError, 'error');
    return false;
  }
}

/**
 * 批量复制功能
 */
export async function copyMessages(messages, options = {}) {
  try {
    // 从 options 中获取翻译消息和格式化函数
    const i18nMessages = options.messages || {
      success: (count) => `Copied ${count} messages`,
      error: 'Copy failed, please try again',
      generalError: 'Copy failed'
    };
    
    const texts = messages.map(msg => MessageFormatter.format(msg, options));
    const combinedText = texts.join('\n\n---\n\n');
    const success = await ClipboardManager.copy(combinedText);
    
    if (success) {
      const successMessage = typeof i18nMessages.success === 'function' 
        ? i18nMessages.success(messages.length)
        : i18nMessages.success;
      NotificationManager.show(successMessage);
    } else {
      NotificationManager.show(i18nMessages.error, 'error');
    }
    
    return success;
  } catch (error) {
    console.error('Copy messages error:', error);
    const i18nMessages = options.messages || { generalError: 'Copy failed' };
    NotificationManager.show(i18nMessages.generalError, 'error');
    return false;
  }
}
