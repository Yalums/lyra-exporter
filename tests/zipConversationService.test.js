import { strToU8, zipSync } from 'fflate';
import claudeFixture from './fixtures/claude-conversation.json';
import { importConversationsFromZipFile } from '../src/services/zip/zipConversationService';
import { createBinaryFile } from './helpers/fileFactories';

describe('zip import workflow', () => {
  test('imports cards, renames, export context, and searchable files from a zip archive', async () => {
    const entries = {
      'exports/sprint.json': strToU8(JSON.stringify(claudeFixture)),
      '_renames.json': strToU8(JSON.stringify({ 'claude-conv-001': 'Renamed sprint chat' })),
      'projects/123e4567-e89b-12d3-a456-426614174000_projects.json': strToU8(JSON.stringify({
        organization_id: 'org-123',
        projects: [{ uuid: 'project-456', name: 'Loominary Sprint' }],
        global_memory: { memory: 'Remember export rules' },
        user_instructions: 'Prefer concise summaries',
      })),
    };
    const archive = zipSync(entries);
    const zipFile = createBinaryFile('loominary-export.zip', archive, 'application/zip');

    const result = await importConversationsFromZipFile(zipFile);

    expect(result.cards).toHaveLength(1);
    expect(result.cards[0]).toMatchObject({
      uuid: 'claude-conv-001',
      name: 'Sprint Planning Notes',
      messageCount: 2,
    });
    expect(result.renames).toEqual({ 'claude-conv-001': 'Renamed sprint chat' });
    expect(result.organizationId).toBe('org-123');
    expect(result.exportContext.userMemory).toEqual({
      preferences: 'Prefer concise summaries',
      memories: 'Remember export rules',
    });
    expect(result.zipFiles[0].name).toBe('Sprint Planning Notes.json');
  });
});
