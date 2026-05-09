import { strToU8, strFromU8, unzipSync } from 'fflate';
import { extractChatData, parseJSONL } from '../../utils/fileParser';

const PROJECTS_METADATA_PATTERN = /^(?:projects\/)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_projects\.json$/i;

function isProjectsMetaFile(name) {
  return PROJECTS_METADATA_PATTERN.test(name);
}

function inferFolderProject(filename) {
  const slashIndex = filename.lastIndexOf('/');
  if (slashIndex <= 0) return null;

  const folderName = filename.slice(0, slashIndex).split('/').pop();
  return folderName ? { uuid: `folder:${folderName}`, name: folderName } : null;
}

function sanitizeFileName(value) {
  return Array.from(value || '')
    .filter((char) => {
      const code = char.charCodeAt(0);
      return !['<', '>', ':', '"', '/', '\\', '|', '?', '*'].includes(char) && code >= 0x20;
    })
    .join('');
}

function sanitizeZipCardFileName(card) {
  return `${sanitizeFileName(card.name || card.uuid)}.json`;
}

export function createConversationCardFromZipEntry(filename, rawText, byteLength) {
  const isJsonl = filename.endsWith('.jsonl');
  const jsonData = isJsonl ? parseJSONL(rawText) : JSON.parse(rawText);
  const parsed = extractChatData(jsonData, filename);
  const meta = parsed.meta_info || {};
  const baseName = filename.replace(/\.(json|jsonl)$/, '').split('/').pop();

  return {
    type: 'conversation',
    uuid: meta.uuid || jsonData.uuid || filename,
    name: meta.title || jsonData.name || baseName,
    format: parsed.format || 'claude',
    created_at: meta.created_at || jsonData.created_at || null,
    updated_at: meta.updated_at || jsonData.updated_at || null,
    project: meta.project || jsonData.project || inferFolderProject(filename),
    project_uuid: meta.project_uuid || jsonData.project_uuid || null,
    organization_id: meta.organization_id || null,
    platform: parsed.platform || 'claude',
    messageCount: parsed.chat_history?.length || 0,
    size: byteLength,
    _zipData: rawText,
  };
}

export function parseZipArchiveEntries(entries) {
  const cards = [];
  let renames = null;
  let exportContext = null;
  let organizationId = null;

  Object.entries(entries).forEach(([filename, data]) => {
    const isJson = filename.endsWith('.json');
    const isJsonl = filename.endsWith('.jsonl');

    if ((!isJson && !isJsonl) || isProjectsMetaFile(filename) || filename === '_renames.json') {
      return;
    }

    try {
      cards.push(createConversationCardFromZipEntry(filename, strFromU8(data), data.length));
    } catch (error) {
      console.warn('[ZipImport] 跳过无法解析的文件:', filename, error);
    }
  });

  if (entries['_renames.json']) {
    try {
      renames = JSON.parse(strFromU8(entries['_renames.json']));
    } catch (error) {
      console.warn('[ZipImport] _renames.json 解析失败:', error);
    }
  }

  const projectsEntry = Object.entries(entries).find(([name]) => isProjectsMetaFile(name));
  if (projectsEntry) {
    try {
      const projectsData = JSON.parse(strFromU8(projectsEntry[1]));
      if (projectsData.projects || projectsData.global_memory || projectsData.user_instructions) {
        exportContext = {
          projectInfo: projectsData.projects || [],
          userMemory: {
            preferences: projectsData.user_instructions || '',
            memories: projectsData.global_memory?.memory || '',
          },
        };
      }
      organizationId = projectsData.organization_id || null;
    } catch (error) {
      console.warn('[ZipImport] projects.json 解析失败:', error);
    }
  }

  return { cards, renames, exportContext, organizationId };
}

export async function importConversationsFromZipFile(file) {
  const arrayBuffer = typeof file.arrayBuffer === 'function'
    ? await file.arrayBuffer()
    : await new Response(file).arrayBuffer();
  const entries = unzipSync(new Uint8Array(arrayBuffer));
  const parsed = parseZipArchiveEntries(entries);

  return {
    ...parsed,
    zipFiles: parsed.cards.map((card) => new File(
      [card._zipData],
      sanitizeZipCardFileName(card),
      { type: 'application/json', lastModified: Date.now() }
    )),
  };
}

export function createBrowseAllCards(conversations, userId = null, platform = 'claude') {
  return (conversations || []).map((conversation) => ({
    type: 'conversation',
    uuid: conversation.uuid,
    name: conversation.name || conversation.uuid,
    format: platform,
    created_at: conversation.created_at || null,
    updated_at: conversation.updated_at || null,
    project: conversation.project || null,
    project_uuid: conversation.project_uuid || null,
    organization_id: userId,
    platform,
  }));
}

export async function syncZipConversationCards({ browseAllCards, context, fetchJson }) {
  const listUrl = `${context.baseUrl}/api/organizations/${context.userId}/chat_conversations`;
  const remoteConversations = await fetchJson(listUrl);
  const localMap = new Map(browseAllCards.map((card) => [card.uuid, card]));

  const toUpdate = remoteConversations.filter((remote) => {
    const local = localMap.get(remote.uuid);
    if (!local) return true;
    if (!local.updated_at || !remote.updated_at) return true;
    return new Date(remote.updated_at) > new Date(local.updated_at);
  });

  const updatedCards = new Map();
  const batchSize = 25;

  for (let index = 0; index < toUpdate.length; index += batchSize) {
    const batch = toUpdate.slice(index, index + batchSize);
    await Promise.allSettled(batch.map(async (conversation) => {
      const detailUrl = `${context.baseUrl}/api/organizations/${context.userId}/chat_conversations/${conversation.uuid}`;
      const data = await fetchJson(detailUrl);
      if (conversation.project_uuid) data.project_uuid = conversation.project_uuid;
      if (conversation.project) data.project = conversation.project;

      const jsonText = JSON.stringify(data, null, 2);
      const parsed = extractChatData(data, conversation.name || conversation.uuid);
      const meta = parsed.meta_info || {};

      updatedCards.set(conversation.uuid, {
        type: 'conversation',
        uuid: conversation.uuid,
        name: meta.title || data.name || conversation.name || conversation.uuid,
        format: parsed.format || 'claude',
        created_at: meta.created_at || data.created_at || conversation.created_at || null,
        updated_at: meta.updated_at || data.updated_at || conversation.updated_at || null,
        project: meta.project || data.project || conversation.project || null,
        project_uuid: meta.project_uuid || data.project_uuid || conversation.project_uuid || null,
        organization_id: context.userId,
        platform: parsed.platform || 'claude',
        messageCount: parsed.chat_history?.length || 0,
        size: strToU8(jsonText).length,
        _zipData: jsonText,
      });
    }));

    if (index + batchSize < toUpdate.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return { updatedCards, localMap, remoteConversations };
}
