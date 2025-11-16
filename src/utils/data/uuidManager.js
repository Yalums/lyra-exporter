// utils/data/uuidManager.js
// 统一管理UUID生成和解析逻辑

/**
 * 生成文件的唯一标识符（基于文件内容特征）
 */
export const generateFileHash = (file) => {
  if (!file) return '';
  const str = `${file.name}_${file.size}_${file.lastModified}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

/**
 * 生成文件卡片的UUID
 */
export const generateFileCardUuid = (fileIndex, file) => {
  if (!file) return `file-${fileIndex}`;
  const fileHash = generateFileHash(file);
  return `file-${fileHash}`;
};

/**
 * 生成对话卡片的UUID
 */
export const generateConversationCardUuid = (fileIndex, conversationUuid, file) => {
  if (!file) return `${fileIndex}-${conversationUuid}`;
  const fileHash = generateFileHash(file);
  return `${fileHash}-${conversationUuid}`;
};

/**
 * 解析UUID获取文件索引和对话UUID
 */
export const parseUuid = (uuid) => {
  if (!uuid) return { fileHash: null, conversationUuid: null };
  
  if (uuid.startsWith('file-')) {
    return { fileHash: uuid.replace('file-', ''), conversationUuid: null };
  } else {
    const parts = uuid.split('-');
    if (parts.length >= 2) {
      const fileHash = parts[0];
      const conversationUuid = parts.slice(1).join('-');
      return { fileHash, conversationUuid };
    }
  }
  
  return { fileHash: null, conversationUuid: null };
};

/**
 * 获取当前文件的UUID
 */
export const getCurrentFileUuid = (viewMode, selectedFileIndex, selectedConversationUuid, processedData, files) => {
  if (viewMode === 'timeline' && selectedFileIndex !== null && files && files[selectedFileIndex]) {
    const file = files[selectedFileIndex];
    const fileHash = generateFileHash(file);
    
    if (selectedConversationUuid && processedData?.format === 'claude_full_export') {
      return `${fileHash}-${selectedConversationUuid}`;
    } else {
      return `file-${fileHash}`;
    }
  }
  
  return null;
};
