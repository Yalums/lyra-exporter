import { groupFilesByConversation } from '../src/services/import/conversationGroupingService';

describe('branch reconstruction grouping', () => {
  test('groups main and branch JSONL files together', () => {
    const filesData = [
      {
        fileName: 'conversation.jsonl',
        data: [
          { chat_metadata: { integrity: 'abc123', chat_id_hash: 'hash-1' } },
          { mes: 'Hello', name: 'User', is_user: true },
        ],
      },
      {
        fileName: 'conversation_branch.jsonl',
        data: [
          { chat_metadata: { integrity: 'abc123', main_chat: 'conversation', chat_id_hash: 'hash-1' } },
          { mes: 'Hello', name: 'User', is_user: true },
        ],
      },
    ];

    const grouped = groupFilesByConversation(filesData);

    expect(grouped).toHaveLength(1);
    expect(grouped[0].map((entry) => entry.fileName)).toEqual([
      'conversation.jsonl',
      'conversation_branch.jsonl',
    ]);
  });
});
