// pdfFontHelper.js
// PDF 字体支持 — 从远端 CDN 按需下载，IndexedDB 缓存，不打包进扩展

/* global chrome */
import { MISANS_FONTS, FALLBACK_FONT } from './fontConfig';

const isExtension = typeof chrome !== 'undefined' && !!chrome?.runtime?.id;

function getFontUrl(localPath) {
  if (isExtension) {
    // 扩展模式：字体在 chrome/app/fonts/，localPath 是 fonts/xxx.ttf，需加 app/ 前缀
    return chrome.runtime.getURL(`app/${localPath}`);
  }
  // React 构建（GitHub Pages / 本地开发）：字体放在 public/fonts/
  const base = process.env.PUBLIC_URL || '';
  return `${base}/${localPath}`;
}

// ==================== IndexedDB 缓存 ====================

const DB_NAME = 'LoominaryFontCache';
const DB_VERSION = 2;  // 升版本清除旧的无效缓存
const STORE = 'fonts';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      // 版本升级时清除旧 store（清理无效缓存），再重建
      if (db.objectStoreNames.contains(STORE)) {
        db.deleteObjectStore(STORE);
      }
      db.createObjectStore(STORE, { keyPath: 'cacheKey' });
    };
    req.onsuccess = () => resolve(req.result);
  });
}

async function idbGet(cacheKey) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(cacheKey);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
    tx.oncomplete = () => db.close();
  });
}

async function idbPut(record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).put(record);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => { db.close(); resolve(); };
  });
}

// ==================== 内存缓存 ====================

// { [cacheKey]: { arrayBuffer, base64 } }
const memCache = new Map();

// ==================== 字体下载 + 缓存 ====================

async function loadFont(fontDef) {
  const { cacheKey } = fontDef;

  // 1. 内存缓存
  if (memCache.has(cacheKey)) return memCache.get(cacheKey);

  // 2. IndexedDB 缓存（验证 TTF 魔数，防止读到旧的无效缓存）
  const cached = await idbGet(cacheKey);
  if (cached?.arrayBuffer) {
    const magic = new DataView(cached.arrayBuffer).getUint32(0, false);
    if (magic === 0x00010000 || magic === 0x74727565) {
      memCache.set(cacheKey, { arrayBuffer: cached.arrayBuffer, base64: cached.base64 });
      return memCache.get(cacheKey);
    }
    // 缓存无效，继续重新下载
    console.warn(`[PDF字体] IDB 缓存无效 (${cacheKey})，重新加载`);
  }

  // 3. 加载字体文件（webpack 打包的 asset URL）
  const url = getFontUrl(fontDef.localPath);
  console.log(`[PDF字体] 加载 ${fontDef.label}，URL: ${url}`);
  let res;
  try {
    res = await fetch(url);
  } catch (fetchErr) {
    throw new Error(`fetch 失败 (${url}): ${fetchErr.message}`);
  }
  console.log(`[PDF字体] fetch 状态: ${res.status} ${res.statusText}, type: ${res.type}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);

  const arrayBuffer = await res.arrayBuffer();
  console.log(`[PDF字体] ${fontDef.label} 下载完成: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)} MB`);

  // base64 编码
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const CHUNK = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + CHUNK, bytes.length)));
  }
  const base64 = btoa(binary);

  const data = { arrayBuffer, base64 };
  memCache.set(cacheKey, data);

  // 异步写入 IDB（不阻塞返回）
  idbPut({ cacheKey, arrayBuffer, base64, ts: Date.now() }).catch(console.warn);

  return data;
}

// ==================== 注册字体到 jsPDF ====================

async function registerFont(pdf, fontDef) {
  const { arrayBuffer, base64 } = await loadFont(fontDef);

  // 简单验证 TTF 魔数
  const magic = new DataView(arrayBuffer).getUint32(0, false);
  console.log(`[PDF字体] ${fontDef.label} 魔数: 0x${magic.toString(16).padStart(8,'0')}, 大小: ${(arrayBuffer.byteLength/1024/1024).toFixed(1)} MB`);
  if (magic !== 0x00010000 && magic !== 0x74727565) {
    throw new Error(`${fontDef.label}: 非有效 TTF 文件 (魔数: 0x${magic.toString(16)})`);
  }

  const fileName = fontDef.cacheKey + '.ttf';
  pdf.addFileToVFS(fileName, base64);
  pdf.addFont(fileName, fontDef.jsPDFName, fontDef.jsPDFStyle);
  console.log(`[PDF字体] 已注册: ${fontDef.jsPDFName} ${fontDef.jsPDFStyle}`);
}

// ==================== 公开 API ====================

/**
 * 加载所有 MiSans 字重并注册到 jsPDF 实例。
 * @param {jsPDF} pdf
 * @returns {{ success: boolean, fontName: string, availableWeights: string[] }}
 */
export async function addChineseFontSupport(pdf) {
  const availableWeights = [];
  let fontName = FALLBACK_FONT;

  for (const fontDef of MISANS_FONTS) {
    try {
      await registerFont(pdf, fontDef);
      availableWeights.push(fontDef.jsPDFStyle);
      fontName = fontDef.jsPDFName;
    } catch (err) {
      console.warn(`[PDF字体] 跳过 ${fontDef.label}: ${err.message}`);
    }
  }

  const success = availableWeights.length > 0;
  if (success) {
    pdf.setFont(fontName, 'normal');
  }

  return { success, fontName, availableWeights };
}

/**
 * 预下载并缓存所有字体（可在后台静默调用）。
 */
export async function preloadFonts() {
  for (const fontDef of MISANS_FONTS) {
    try {
      await loadFont(fontDef);
    } catch (err) {
      console.warn(`[PDF字体预加载] ${fontDef.label}: ${err.message}`);
    }
  }
}

/**
 * 清除 IndexedDB 中的字体缓存（用于更新字体版本）。
 */
export async function clearFontCache() {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => { db.close(); memCache.clear(); resolve(); };
  });
}
