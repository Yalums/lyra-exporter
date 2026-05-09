import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import {
  validateAnnotations,
  validateContextRecord,
  validateConversationRecord,
  validateManifest
} from './contract.mjs';
import { buildConversationIndex, searchConversationIndex } from './searchIndex.mjs';

async function readJson(filePath) {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

function ensureDirectoryPath(rootPath, relativeDir) {
  return path.resolve(rootPath, relativeDir);
}

function summarizeConversation(record, { favoriteSet, tagsByConversation }) {
  const tags = tagsByConversation.get(record.conversation.id) || [];
  const favorite = favoriteSet.has(record.conversation.id) || !!record.conversation.favorite;

  return {
    id: record.conversation.id,
    title: record.conversation.title,
    platform: record.conversation.platform,
    createdAt: record.conversation.createdAt,
    updatedAt: record.conversation.updatedAt,
    messageCount: record.messages.length,
    branchCount: record.branches.length,
    favorite,
    tags,
    provider: record.conversation.provider || null
  };
}

function buildBranchTree(conversationRecord) {
  const messageMap = new Map(conversationRecord.messages.map(message => [message.id, message]));
  const childrenByParent = new Map();

  for (const message of conversationRecord.messages) {
    const parentId = message.parentId || null;
    if (!childrenByParent.has(parentId)) {
      childrenByParent.set(parentId, []);
    }
    childrenByParent.get(parentId).push(message.id);
  }

  return {
    conversationId: conversationRecord.conversation.id,
    branches: conversationRecord.branches,
    rootMessageIds: childrenByParent.get(null) || [],
    nodes: conversationRecord.messages.map(message => ({
      id: message.id,
      parentId: message.parentId || null,
      branchId: message.branchId || null,
      role: message.role,
      createdAt: message.createdAt || null,
      childIds: childrenByParent.get(message.id) || [],
      isBranchPoint: (childrenByParent.get(message.id) || []).length > 1,
      preview: message.text || ''
    })),
    missingParents: conversationRecord.messages
      .filter(message => message.parentId && !messageMap.has(message.parentId))
      .map(message => message.id)
  };
}

export class LoomArchive {
  constructor(rootPath, manifest, conversations, contexts, annotations) {
    this.rootPath = rootPath;
    this.manifest = manifest;
    this.conversations = conversations;
    this.contexts = contexts;
    this.annotations = annotations;

    this.favoriteSet = new Set(annotations.favorites);
    this.tagsByConversation = new Map();

    for (const tag of annotations.tags) {
      if (!this.tagsByConversation.has(tag.conversationId)) {
        this.tagsByConversation.set(tag.conversationId, []);
      }
      this.tagsByConversation.get(tag.conversationId).push(tag);
    }

    this.indexEntries = Array.from(conversations.values()).map(record =>
      buildConversationIndex(
        record,
        this.tagsByConversation.get(record.conversation.id) || [],
        contexts.get(record.conversation.id) || null
      )
    );
  }

  listConversations({ limit = 50, cursor = 0, favoriteOnly = false, tag = null } = {}) {
    const summaries = Array.from(this.conversations.values())
      .map(record => summarizeConversation(record, this))
      .filter(summary => {
        if (favoriteOnly && !summary.favorite) {
          return false;
        }

        if (tag && !summary.tags.some(item => item.tag === tag)) {
          return false;
        }

        return true;
      })
      .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

    const start = Number(cursor) || 0;
    const end = start + Number(limit || 50);

    return {
      items: summaries.slice(start, end),
      nextCursor: end < summaries.length ? end : null,
      total: summaries.length
    };
  }

  searchConversations(query, options = {}) {
    const hits = searchConversationIndex(this.indexEntries, query, {
      favoriteOnly: !!options.favoriteOnly,
      favoriteSet: this.favoriteSet
    });

    return hits.map(hit => {
      const record = this.conversations.get(hit.conversationId);
      return {
        ...summarizeConversation(record, this),
        score: hit.score,
        excerpt: hit.excerpt
      };
    });
  }

  getConversation(conversationId) {
    const record = this.conversations.get(conversationId);
    if (!record) {
      return null;
    }

    return {
      ...record,
      favorite: this.favoriteSet.has(conversationId) || !!record.conversation.favorite,
      tags: this.tagsByConversation.get(conversationId) || [],
      contextAvailable: this.contexts.has(conversationId)
    };
  }

  getBranchTree(conversationId) {
    const record = this.conversations.get(conversationId);
    return record ? buildBranchTree(record) : null;
  }

  getContext(conversationId) {
    return this.contexts.get(conversationId) || null;
  }

  getFavorites() {
    return Array.from(this.favoriteSet).map(conversationId => {
      const record = this.conversations.get(conversationId);
      return record ? summarizeConversation(record, this) : { id: conversationId };
    });
  }

  getTags() {
    const byTag = new Map();
    for (const tag of this.annotations.tags) {
      if (!byTag.has(tag.tag)) {
        byTag.set(tag.tag, []);
      }
      byTag.get(tag.tag).push(tag);
    }

    return Array.from(byTag.entries())
      .map(([tag, items]) => ({
        tag,
        usageCount: items.length,
        conversations: Array.from(new Set(items.map(item => item.conversationId)))
      }))
      .sort((a, b) => a.tag.localeCompare(b.tag));
  }
}

export async function loadArchive(rootPath) {
  const manifestPath = path.join(rootPath, 'manifest.json');
  const manifest = validateManifest(await readJson(manifestPath));

  const conversationsDir = ensureDirectoryPath(rootPath, manifest.layout.conversationsDir);
  const contextsDir = ensureDirectoryPath(rootPath, manifest.layout.contextsDir);
  const annotationsPath = path.join(rootPath, manifest.layout.annotationsFile);

  const conversationFiles = (await readdir(conversationsDir))
    .filter(name => name.endsWith('.json'))
    .sort();

  const conversations = new Map();
  for (const name of conversationFiles) {
    const record = validateConversationRecord(await readJson(path.join(conversationsDir, name)));
    conversations.set(record.conversation.id, record);
  }

  const contexts = new Map();
  try {
    const contextFiles = (await readdir(contextsDir))
      .filter(name => name.endsWith('.json'))
      .sort();

    for (const name of contextFiles) {
      const record = validateContextRecord(await readJson(path.join(contextsDir, name)));
      contexts.set(record.conversationId, record);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  const annotations = validateAnnotations(await readJson(annotationsPath));
  return new LoomArchive(rootPath, manifest, conversations, contexts, annotations);
}
