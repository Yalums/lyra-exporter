// data/dataProcessor.js
// 数据处理器 - 处理对话、文件卡片、时间线消息等数据

import { generateFileCardUuid } from './uuidManager';
import { getRenameManager } from '../renameManager';

/**
 * 数据处理辅助类
 */
export class DataProcessor {
  /**
   * 生成原始对话列表
   * 注意：claude_full_export格式已废弃，此方法保留以兼容旧数据
   */
  static getRawConversations(viewMode, processedData, currentFileIndex, files) {
    // claude_full_export已废弃，返回空数组
    return [];
  }

  /**
   * 生成文件卡片数据
   */
  static getFileCards(viewMode, processedData, files, currentFileIndex, fileMetadata, t) {
    if (!t || typeof t !== 'function') {
      console.error('getFileCards: t is not a function', t);
      t = (key) => key;
    }

    if (viewMode !== 'conversations') {
      return [];
    }

    const renameManager = getRenameManager();

    return files.map((file, fileIndex) => {
      const isCurrentFile = fileIndex === currentFileIndex;
      const fileData = isCurrentFile ? processedData : null;
      const metadata = fileMetadata[file.name] || {};

      const format = fileData?.format || metadata.format || 'unknown';
      const messageCount = fileData?.chat_history?.length || metadata.messageCount || 0;
      const conversationCount = metadata.conversationCount || (fileData ? 1 : 0);

      const model = fileData?.meta_info?.model || metadata.model || (format === 'claude' ? '' : 'Claude');

      const fileUuid = generateFileCardUuid(fileIndex, file);
      const originalName = metadata.title ? metadata.title.replace('.json', '') : file.name.replace('.json', '');
      const displayName = renameManager.getRename(fileUuid, originalName);

      return {
        type: 'file',
        uuid: fileUuid,
        name: displayName,
        originalName: originalName,
        fileName: file.name,
        fileIndex,
        isCurrentFile,
        fileData,
        format,
        model,
        messageCount,
        conversationCount,
        created_at: metadata.created_at || (file.lastModified ? new Date(file.lastModified).toISOString() : null),
        platform: metadata.platform || 'claude',
        summary: format !== 'unknown' ?
          t('fileCard.messageSummary', { count: messageCount }) :
          t('fileCard.clickToLoad'),
        size: file.size
      };
    });
  }

  /**
   * 获取时间线消息
   */
  static getTimelineMessages(viewMode, selectedFileIndex, currentFileIndex, processedData, selectedConversationUuid) {
    if (viewMode !== 'timeline') {
      return [];
    }

    const dataSource = (selectedFileIndex !== null && selectedFileIndex === currentFileIndex)
      ? processedData
      : null;

    if (!dataSource) {
      return [];
    }

    return dataSource.chat_history || [];
  }

  /**
   * 获取当前对话信息
   */
  static getCurrentConversation(params) {
    const { viewMode, selectedFileIndex, selectedConversationUuid, processedData, files, currentFileIndex, fileMetadata, starActions } = params;
    const renameManager = getRenameManager();

    if (viewMode === 'timeline' && selectedFileIndex !== null) {
      const dataSource = selectedFileIndex === currentFileIndex ? processedData : null;

      if (!dataSource) return null;

      const file = files[selectedFileIndex];
      if (file) {
        const metadata = fileMetadata[file.name] || {};
        const isCurrentFile = selectedFileIndex === currentFileIndex;
        const fileData = isCurrentFile ? dataSource : null;
        const fileUuid = generateFileCardUuid(selectedFileIndex, file);
        const originalName = fileData?.meta_info?.title || metadata.title || file.name.replace('.json', '');
        const displayName = renameManager.getRename(fileUuid, originalName);

        return {
          type: 'file',
          uuid: fileUuid,
          name: displayName,
          originalName: originalName,
          fileName: file.name,
          fileIndex: selectedFileIndex,
          isCurrentFile,
          format: fileData?.format || metadata.format || 'unknown',
          model: fileData?.meta_info?.model || metadata.model || '',
          messageCount: fileData?.chat_history?.length || metadata.messageCount || 0,
          created_at: metadata.created_at || (file.lastModified ? new Date(file.lastModified).toISOString() : null),
          platform: metadata.platform || 'claude'
        };
      }
    }
    return null;
  }
}
