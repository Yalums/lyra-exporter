import claudeFixture from './fixtures/claude-conversation.json';
import StorageManager from '../src/utils/data/storageManager';
import { processImportFile } from '../src/services/import/fileImportService';
import {
  exportConversationAsMarkdown,
  exportConversationAsPdf,
} from '../src/services/export/exportOrchestrator';
import { createTextFile } from './helpers/fileFactories';

jest.mock('../src/utils/markdownExporter', () => ({
  prepareMarkdownExport: jest.fn(() => ({ filename: 'conversation.md' })),
  downloadMarkdownExport: jest.fn(() => Promise.resolve()),
}));

jest.mock('../src/utils/export/pdfExportManager', () => ({
  pdfExportManager: {
    exportToPDF: jest.fn(() => Promise.resolve(true)),
  },
}));

const { prepareMarkdownExport, downloadMarkdownExport } = jest.requireMock('../src/utils/markdownExporter');
const { pdfExportManager } = jest.requireMock('../src/utils/export/pdfExportManager');

describe('export orchestration', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('builds markdown exports from stored config and current branch messages', async () => {
    StorageManager.set('export-config', { includeThinking: true });
    const file = createTextFile('sprint-planning.json', JSON.stringify(claudeFixture));
    const { processedData } = await processImportFile(file);
    const currentBranchMessages = [processedData.chat_history[0]];

    await exportConversationAsMarkdown({
      processedData,
      baseName: 'Sprint Planning Notes',
      currentFileUuid: processedData.meta_info.uuid,
      pendingExportContext: { userMemory: { memories: 'remember this' } },
      exportOptions: { scope: 'currentBranch' },
      timelineDisplayMessages: currentBranchMessages,
      markManagerRef: { current: null },
      isExtension: false,
    });

    expect(prepareMarkdownExport).toHaveBeenCalledWith(
      processedData,
      'Sprint Planning Notes',
      expect.objectContaining({
        includeThinking: true,
        conversationUuid: 'claude-conv-001',
      }),
      { userMemory: { memories: 'remember this' } },
      { scope: 'currentBranch' },
      currentBranchMessages,
      { current: null }
    );
    expect(downloadMarkdownExport).toHaveBeenCalledWith({ filename: 'conversation.md' });
  });

  test('routes PDF export through the PDF manager with branch-scoped messages', async () => {
    const file = createTextFile('sprint-planning.json', JSON.stringify(claudeFixture));
    const { processedData } = await processImportFile(file);
    const currentBranchMessages = [processedData.chat_history[0]];
    const onProgress = jest.fn();

    await exportConversationAsPdf({
      processedData,
      exportOptions: {
        scope: 'currentBranch',
        includeThinking: false,
        includeArtifacts: true,
        includeTimestamps: false,
        includeTools: false,
      },
      timelineDisplayMessages: currentBranchMessages,
      onProgress,
    });

    expect(pdfExportManager.exportToPDF).toHaveBeenCalledWith(
      currentBranchMessages,
      expect.objectContaining({
        name: 'Sprint Planning Notes',
        platform: 'claude',
      }),
      expect.objectContaining({
        includeTools: false,
        includeArtifacts: true,
      }),
      onProgress
    );
  });
});
