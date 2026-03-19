import React, { useState, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

import enTranslations from './langs/en.json';
import zhTranslations from './langs/zh.json';

const TRANSLATIONS = {
  en: enTranslations,
  zh: zhTranslations,
};

const DEFAULT_LANG = 'en';

// Language is read once from chrome.storage at startup (set there by the userscript)
// setResolvedLang allows the App to switch language after a postMessage payload arrives.
let resolvedLang = DEFAULT_LANG;
let _langListeners = [];
export function setResolvedLang(lang) {
  const next = TRANSLATIONS[lang] ? lang : DEFAULT_LANG;
  if (next === resolvedLang) return;
  resolvedLang = next;
  _langListeners.forEach(fn => fn(next));
}
export function subscribeLang(fn) {
  _langListeners.push(fn);
  return () => { _langListeners = _langListeners.filter(f => f !== fn); };
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((cur, key) => (cur && typeof cur === 'object' ? cur[key] : undefined), obj);
}

function interpolate(text, params = {}) {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => (key in params ? params[key] : match));
}

// Non-React translation function (used by markdownExporter etc.)
export function t(key, params = {}) {
  const pack = TRANSLATIONS[resolvedLang] || TRANSLATIONS[DEFAULT_LANG];
  const val = getNestedValue(pack, key);
  if (val === undefined || val === null) return interpolate(key.split('.').pop(), params);
  if (typeof val === 'string') return interpolate(val, params);
  return val;
}

export const useI18n = () => {
  const [lang, setLang] = useState(() => resolvedLang);
  useEffect(() => subscribeLang(setLang), []);
  const translations = TRANSLATIONS[lang] || TRANSLATIONS[DEFAULT_LANG];

  const tHook = useCallback((key, params = {}) => {
    const val = getNestedValue(translations, key);
    if (val === undefined || val === null) return interpolate(key.split('.').pop(), params);
    if (typeof val === 'string') return interpolate(val, params);
    return val;
  }, [translations]);

  return { t: tHook, currentLanguage: lang };
};

// =============================================================================
// React 应用启动：先读语言再渲染
// =============================================================================

function boot(lang) {
  resolvedLang = TRANSLATIONS[lang] ? lang : DEFAULT_LANG;
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// eslint-disable-next-line no-undef
const chromeApi = typeof chrome !== 'undefined' ? chrome : null;

if (chromeApi && chromeApi.storage && chromeApi.storage.local) {
  chromeApi.storage.local.get('loominary_lang', (result) => {
    boot(result.loominary_lang || DEFAULT_LANG);
  });
} else {
  boot(DEFAULT_LANG);
}
