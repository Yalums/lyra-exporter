/* global chrome */

import StorageManager from '../../utils/data/storageManager.js';
import { downloadMarkdownExport, prepareMarkdownExport } from '../../utils/markdownExporter';
import { pdfExportManager } from '../../utils/export/pdfExportManager';

export async function resolveExportConfig(isExtension) {
  const chromeApi = typeof chrome !== 'undefined' ? chrome : undefined;

  if (isExtension && chromeApi?.storage?.local) {
    return new Promise((resolve) =>
      chromeApi.storage.local.get(['loominary_export_config'], (result) => resolve(result.loominary_export_config || {}))
    );
  }

  return StorageManager.get('export-config', {});
}

export async function exportConversationAsMarkdown({
  processedData,
  baseName,
  currentFileUuid,
  pendingExportContext,
  exportOptions,
  timelineDisplayMessages,
  markManagerRef,
  isExtension,
}) {
  const exportConfig = await resolveExportConfig(isExtension);
  const exportResult = prepareMarkdownExport(
    processedData,
    baseName,
    { ...exportConfig, conversationUuid: currentFileUuid },
    pendingExportContext,
    exportOptions,
    timelineDisplayMessages,
    markManagerRef
  );

  await downloadMarkdownExport(exportResult);
  return exportResult;
}

export function getMessagesForExport(processedData, exportOptions, timelineDisplayMessages) {
  if (exportOptions.scope !== 'currentBranch') {
    return processedData.chat_history || [];
  }

  if (timelineDisplayMessages.length > 0) {
    return timelineDisplayMessages;
  }

  return processedData.chat_history || [];
}

export async function exportConversationAsPdf({
  processedData,
  exportOptions,
  timelineDisplayMessages,
  onProgress,
}) {
  const messages = getMessagesForExport(processedData, exportOptions, timelineDisplayMessages);
  const meta = {
    name: processedData.meta_info?.title || processedData.meta_info?.name || 'Conversation',
    platform: processedData.meta_info?.platform || 'claude',
    created_at: processedData.meta_info?.created_at || '',
    updated_at: processedData.meta_info?.updated_at || '',
  };

  return pdfExportManager.exportToPDF(messages, meta, {
    includeThinking: exportOptions.includeThinking ?? false,
    includeArtifacts: exportOptions.includeArtifacts ?? true,
    includeTimestamps: exportOptions.includeTimestamps ?? false,
    includeTools: exportOptions.includeTools ?? true,
  }, onProgress);
}

export async function exportPendingMarkdownPayload(pendingData, exportConfig, onError) {
  try {
    const baseFilename = (pendingData.filename || 'conversation').replace(/\.json$/, '');
    const exportResult = prepareMarkdownExport(
      pendingData.content,
      baseFilename,
      exportConfig,
      pendingData.exportContext || null
    );

    await downloadMarkdownExport(exportResult);
    setTimeout(() => {
      try {
        window.close();
      } catch (_) {}
    }, 800);
  } catch (error) {
    console.error('[Loominary] Markdown export failed:', error);
    onError?.(`Markdown export failed: ${error.message}`);
  }
}
