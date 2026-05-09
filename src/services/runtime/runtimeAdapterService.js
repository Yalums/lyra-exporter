import StorageManager from '../../utils/data/storageManager.js';
import { setResolvedLang } from '../../index.js';
import { createBrowseAllCards } from '../zip/zipConversationService';

export function applyRuntimeAppearance({ lang, theme }) {
  if (lang) {
    setResolvedLang(lang);
  }

  if (theme) {
    document.documentElement.setAttribute('data-theme', theme);
    StorageManager.set('app-theme', theme);
  }
}

export function createRuntimeFilesFromPayload(payload) {
  if (payload.files && Array.isArray(payload.files)) {
    return payload.files.map(({ content, filename }) => {
      const blob = new Blob([typeof content === 'string' ? content : JSON.stringify(content)], { type: 'application/jsonl' });
      return new File([blob], filename, { type: 'application/jsonl', lastModified: Date.now() });
    });
  }

  const jsonData = typeof payload.content === 'string' ? payload.content : JSON.stringify(payload.content);
  const blob = new Blob([jsonData], { type: 'application/json' });
  const file = new File([blob], payload.filename, { type: 'application/json', lastModified: Date.now() });

  return { file, jsonData };
}

export function persistSingleFileSession(filename, content) {
  try {
    StorageManager.set('singlefile_session', { content, filename });
  } catch (_) {}
}

export function persistExtensionSession(filename, content) {
  try {
    sessionStorage.setItem('loominary_session_data', JSON.stringify({ content, filename }));
  } catch (_) {}
}

export function restoreExtensionSession() {
  const sessionRaw = sessionStorage.getItem('loominary_session_data');
  return sessionRaw ? JSON.parse(sessionRaw) : null;
}

export function buildBrowseAllRuntimeState(pendingData) {
  return {
    cards: createBrowseAllCards(pendingData.conversations || [], pendingData.userId || null),
    context: { userId: pendingData.userId, baseUrl: pendingData.baseUrl },
  };
}
