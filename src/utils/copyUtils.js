// utils/copyUtils.js

/**
 * 格式化消息内容用于复制
 */
export const formatMessageForCopy = (message, options = {}) => {
  const {
    includeThinking = false,
    includeArtifacts = false,
    includeMetadata = true
  } = options;
  
  const parts = [];
  
  // 添加元数据
  if (includeMetadata) {
    parts.push(`【${message.sender_label}】`);
    if (message.timestamp) {
      parts.push(`时间: ${message.timestamp}`);
    }
    parts.push('---');
  }
  
  // 添加主要内容
  if (message.display_text) {
    parts.push(message.display_text);
  }
  
  // 添加思考过程
  if (includeThinking && message.thinking) {
    parts.push('');
    parts.push('💭 思考过程:');
    parts.push('```');
    parts.push(message.thinking);
    parts.push('```');
  }
  
  // 添加Artifacts
  if (includeArtifacts && message.artifacts && message.artifacts.length > 0) {
    parts.push('');
    parts.push('🔧 Artifacts:');
    
    message.artifacts.forEach(artifact => {
      parts.push('');
      parts.push(`### ${artifact.title || '无标题'} (${artifact.type || '未知类型'})`);
      
      if (artifact.content) {
        const language = artifact.language || '';
        parts.push(`\`\`\`${language}`);
        parts.push(artifact.content);
        parts.push('```');
      }
    });
  }
  
  return parts.join('\n');
};

/**
 * 复制文本到剪贴板
 */
export const copyToClipboard = async (text) => {
  try {
    // 尝试使用现代剪贴板API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // 降级方案：使用传统的execCommand
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      return true;
    } finally {
      document.body.removeChild(textArea);
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

/**
 * 复制消息并显示反馈
 */
export const copyMessage = async (message, options = {}) => {
  const formattedText = formatMessageForCopy(message, options);
  const success = await copyToClipboard(formattedText);
  
  if (success) {
    // 显示临时提示
    showCopyNotification('已复制到剪贴板');
  } else {
    showCopyNotification('复制失败，请重试', 'error');
  }
  
  return success;
};

/**
 * 显示复制通知
 */
const showCopyNotification = (message, type = 'success') => {
  // 移除已存在的通知
  const existingNotification = document.querySelector('.copy-notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  // 创建新通知
  const notification = document.createElement('div');
  notification.className = `copy-notification ${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 8px 16px;
    background: ${type === 'success' ? '#4CAF50' : '#f44336'};
    color: white;
    border-radius: 4px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    z-index: 10000;
    animation: slideDown 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  
  // 3秒后自动移除
  setTimeout(() => {
    notification.style.animation = 'slideUp 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
};

// 添加动画样式
if (!document.querySelector('#copy-notification-styles')) {
  const style = document.createElement('style');
  style.id = 'copy-notification-styles';
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

export default {
  formatMessageForCopy,
  copyToClipboard,
  copyMessage
};
