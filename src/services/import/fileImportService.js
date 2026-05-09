import StorageManager from '../../utils/data/storageManager.js';
import { detectBranches, extractChatData, parseJSONL, extractMergedJSONLData } from '../../utils/fileParser';

export const IMPORTABLE_FILE_EXTENSIONS = ['.json', '.jsonl'];
const JSON_MIME_TYPES = new Set(['application/json', 'application/jsonl']);

export function isImportableFile(file) {
  if (!file?.name) return false;
  return IMPORTABLE_FILE_EXTENSIONS.some(ext => file.name.endsWith(ext)) || JSON_MIME_TYPES.has(file.type);
}

export async function parseImportFile(file) {
  const text = typeof file.text === 'function'
    ? await file.text()
    : await new Response(file).text();
  const isJSONL = file.name.endsWith('.jsonl') || (text.includes('\n{') && !text.trim().startsWith('['));
  return isJSONL ? parseJSONL(text) : JSON.parse(text);
}

export function buildFileMetadata(processedData, fileName, overrides = {}) {
  return {
    format: processedData.format,
    platform: processedData.platform || processedData.format,
    messageCount: processedData.chat_history?.length || 0,
    conversationCount: 1,
    title: processedData.meta_info?.title || fileName,
    model: processedData.meta_info?.model || '',
    created_at: processedData.meta_info?.created_at,
    updated_at: processedData.meta_info?.updated_at,
    project: processedData.meta_info?.project || null,
    project_uuid: processedData.meta_info?.project_uuid || null,
    organization_id: processedData.meta_info?.organization_id || null,
    is_starred: processedData.meta_info?.is_starred || false,
    ...overrides,
  };
}

export async function processImportFile(file) {
  const parsedData = await parseImportFile(file);
  const extractedData = extractChatData(parsedData, file.name);
  const processedData = detectBranches(extractedData);

  return {
    parsedData,
    processedData,
    metadata: buildFileMetadata(processedData, file.name),
  };
}

export async function extractMetadataBatch(files, onProgress = null, batchSize = 20) {
  const metadata = {};
  let completed = 0;

  for (let index = 0; index < files.length; index += batchSize) {
    const batch = files.slice(index, index + batchSize);
    const results = await Promise.all(batch.map(async (file) => {
      try {
        const { metadata: fileMetadata } = await processImportFile(file);
        return [file.name, fileMetadata];
      } catch (error) {
        console.warn(`提取元数据失败 ${file.name}:`, error);
        return [file.name, { format: 'unknown', messageCount: 0, title: file.name }];
      }
    }));

    results.forEach(([name, fileMetadata]) => {
      metadata[name] = fileMetadata;
    });

    completed += batch.length;
    onProgress?.({ current: completed, total: files.length });
  }

  return metadata;
}

export function applyPendingProjectConfig(files, metadata) {
  const pendingConfig = StorageManager.get('pending_project_config');
  if (!pendingConfig?.files) {
    return { files, metadata };
  }

  const configMap = {};
  pendingConfig.files.forEach((file) => {
    configMap[file.name] = file;
  });

  const nextMetadata = { ...metadata };
  Object.keys(nextMetadata).forEach((name) => {
    if (configMap[name]?.metadata) {
      nextMetadata[name] = { ...nextMetadata[name], ...configMap[name].metadata };
    }
  });

  const nextFiles = [...files].sort((left, right) => {
    const leftIndex = configMap[left.name]?.index ?? Infinity;
    const rightIndex = configMap[right.name]?.index ?? Infinity;
    return leftIndex - rightIndex;
  });

  StorageManager.remove('pending_project_config');
  return { files: nextFiles, metadata: nextMetadata };
}

export function createMergedVirtualFile(mergedData) {
  const mergedFileName = `[合并] ${mergedData.meta_info?.title || '对话'}`;
  const virtualFile = new File(
    [JSON.stringify(mergedData.raw_data)],
    mergedFileName,
    { type: 'application/json' }
  );

  virtualFile._mergedProcessedData = detectBranches(mergedData);

  return {
    file: virtualFile,
    metadata: buildFileMetadata(mergedData, mergedFileName, {
      isMerged: true,
      mergeInfo: mergedData.meta_info?.merge_info,
    }),
  };
}

export function buildMergedConversation(group) {
  const mergedData = extractMergedJSONLData(group);
  return {
    mergedData,
    ...createMergedVirtualFile(mergedData),
  };
}
