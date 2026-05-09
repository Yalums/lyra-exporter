export const ARCHIVE_SCHEMA_VERSION = 'loominary.archive/v1';
export const CONVERSATION_SCHEMA_VERSION = 'loominary.conversation/v1';
export const CONTEXT_SCHEMA_VERSION = 'loominary.context/v1';
export const ANNOTATIONS_SCHEMA_VERSION = 'loominary.annotations/v1';

export function validateManifest(manifest) {
  if (!manifest || typeof manifest !== 'object') {
    throw new Error('Archive manifest must be an object.');
  }

  if (manifest.schemaVersion !== ARCHIVE_SCHEMA_VERSION) {
    throw new Error(`Unsupported archive schema version: ${manifest.schemaVersion || 'missing'}`);
  }

  if (!manifest.archiveId || typeof manifest.archiveId !== 'string') {
    throw new Error('Archive manifest is missing archiveId.');
  }

  if (!manifest.layout || typeof manifest.layout !== 'object') {
    throw new Error('Archive manifest is missing layout.');
  }

  return manifest;
}

export function validateConversationRecord(record) {
  if (!record || typeof record !== 'object') {
    throw new Error('Conversation record must be an object.');
  }

  if (record.schemaVersion !== CONVERSATION_SCHEMA_VERSION) {
    throw new Error(`Unsupported conversation schema version: ${record.schemaVersion || 'missing'}`);
  }

  if (!record.conversation?.id) {
    throw new Error('Conversation record is missing conversation.id.');
  }

  if (!Array.isArray(record.messages)) {
    throw new Error(`Conversation ${record.conversation.id} is missing messages.`);
  }

  if (!Array.isArray(record.branches)) {
    throw new Error(`Conversation ${record.conversation.id} is missing branches.`);
  }

  return record;
}

export function validateContextRecord(record) {
  if (!record || typeof record !== 'object') {
    throw new Error('Context record must be an object.');
  }

  if (record.schemaVersion !== CONTEXT_SCHEMA_VERSION) {
    throw new Error(`Unsupported context schema version: ${record.schemaVersion || 'missing'}`);
  }

  if (!record.conversationId || typeof record.conversationId !== 'string') {
    throw new Error('Context record is missing conversationId.');
  }

  return record;
}

export function validateAnnotations(record) {
  if (!record || typeof record !== 'object') {
    throw new Error('Annotations record must be an object.');
  }

  if (record.schemaVersion !== ANNOTATIONS_SCHEMA_VERSION) {
    throw new Error(`Unsupported annotations schema version: ${record.schemaVersion || 'missing'}`);
  }

  if (!Array.isArray(record.favorites)) {
    throw new Error('Annotations record is missing favorites.');
  }

  if (!Array.isArray(record.tags)) {
    throw new Error('Annotations record is missing tags.');
  }

  return record;
}
