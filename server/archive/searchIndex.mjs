function normalizeText(value) {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

function flattenContent(contentBlocks = []) {
  return contentBlocks
    .filter(block => block && typeof block === 'object')
    .map(block => {
      if (typeof block.text === 'string') {
        return block.text;
      }

      if (typeof block.value === 'string') {
        return block.value;
      }

      return '';
    })
    .filter(Boolean)
    .join('\n');
}

export function buildConversationIndex(conversationRecord, tags = [], contextRecord = null) {
  const messageTexts = conversationRecord.messages
    .map(message => message.text || flattenContent(message.content))
    .filter(Boolean);

  const contextTexts = [];
  if (contextRecord?.project) {
    contextTexts.push(
      contextRecord.project.name || '',
      contextRecord.project.description || '',
      contextRecord.project.instructions || ''
    );

    for (const file of contextRecord.project.knowledgeFiles || []) {
      contextTexts.push(file.name || '', file.summary || '', file.content || '');
    }
  }

  for (const memory of contextRecord?.memories?.saved || []) {
    contextTexts.push(memory.title || '', memory.content || '');
  }

  for (const memory of contextRecord?.memories?.global || []) {
    contextTexts.push(memory.title || '', memory.content || '');
  }

  for (const memory of contextRecord?.memories?.project || []) {
    contextTexts.push(memory.title || '', memory.content || '');
  }

  const tagTexts = tags.map(tag => tag.tag);
  const title = conversationRecord.conversation.title || '';

  return {
    conversationId: conversationRecord.conversation.id,
    title,
    searchText: normalizeText([
      title,
      ...messageTexts,
      ...contextTexts,
      ...tagTexts
    ].join('\n')),
    previewSource: messageTexts.join('\n')
  };
}

export function searchConversationIndex(indexEntries, query, { favoriteOnly = false, favoriteSet = new Set() } = {}) {
  const normalizedQuery = normalizeText(query).trim();
  if (!normalizedQuery) {
    return [];
  }

  const results = [];
  for (const entry of indexEntries) {
    if (favoriteOnly && !favoriteSet.has(entry.conversationId)) {
      continue;
    }

    const firstIndex = entry.searchText.indexOf(normalizedQuery);
    if (firstIndex === -1) {
      continue;
    }

    const count = entry.searchText.split(normalizedQuery).length - 1;
    results.push({
      conversationId: entry.conversationId,
      score: count * 10 + Math.max(0, 50 - firstIndex),
      excerpt: buildExcerpt(entry.previewSource, normalizedQuery)
    });
  }

  return results.sort((a, b) => b.score - a.score);
}

export function buildExcerpt(text, query, radius = 90) {
  const normalized = normalizeText(text);
  const index = normalized.indexOf(query);
  if (index === -1) {
    return text.slice(0, radius * 2).trim();
  }

  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + query.length + radius);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < text.length ? '...' : '';
  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}
