import chatgptFixture from './fixtures/chatgpt-conversation.json';
import { processImportFile } from '../src/services/import/fileImportService';
import { createTextFile } from './helpers/fileFactories';

describe('file import parsing', () => {
  test('parses provider exports into processed data and metadata', async () => {
    const file = createTextFile('search-branch.json', JSON.stringify(chatgptFixture));

    const { processedData, metadata } = await processImportFile(file);

    expect(processedData.format).toBe('chatgpt');
    expect(processedData.meta_info.title).toBe('Search branch fixture');
    expect(processedData.chat_history).toHaveLength(3);
    expect(processedData.chat_history[0].is_branch_point).toBe(true);
    expect(metadata).toMatchObject({
      format: 'chatgpt',
      title: 'Search branch fixture',
      messageCount: 3,
    });
  });
});
