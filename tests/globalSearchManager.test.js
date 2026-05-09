import claudeFixture from './fixtures/claude-conversation.json';
import { GlobalSearchManager } from '../src/utils/globalSearchManager';
import { processImportFile } from '../src/services/import/fileImportService';
import { createTextFile } from './helpers/fileFactories';

describe('global search indexing', () => {
  test('indexes imported files and searches renamed conversations by content', async () => {
    const file = createTextFile('sprint-planning.json', JSON.stringify(claudeFixture), 'application/json', 2);
    const { processedData } = await processImportFile(file);
    const manager = new GlobalSearchManager();

    await manager.buildGlobalIndex([file], processedData, 0, {
      'claude-conv-001': 'Renamed sprint chat',
    });

    const search = manager.search('vector database');

    expect(search.stats.total).toBe(1);
    expect(search.results[0].conversationName).toBe('Renamed sprint chat');
    expect(search.results[0].message.content).toContain('vector database fallback');
  });
});
