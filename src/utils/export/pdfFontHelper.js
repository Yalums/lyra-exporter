// utils/export/pdfFontHelper.js
// PDF中文字体支持 - 使用 ARUDJingxihei (阿如汉字黑体) 字体家族
//
// 当前实现：
// - 使用 public/fonts/ARUDJingxihei-Regular.ttf (正常字重)
// - 使用 public/fonts/ARUDJingxihei-Bold.ttf (粗体字重)
// - 使用 public/fonts/ARUDJingxihei-Light.ttf (细体字重)
// - 支持多字重变体，可正确渲染粗体标题和强调文本
// - 包含完整的验证流程（Content-Type、TTF魔数、cmap表）

/**
 * 验证字体是否包含必要的 Unicode cmap
 * @param {ArrayBuffer} arrayBuffer - 字体文件内容
 * @returns {boolean} - 是否包含 cmap
 */
function hasUnicodeCmap(arrayBuffer) {
  try {
    const dataView = new DataView(arrayBuffer);
    
    // TTF 文件以特定的魔数开头
    const version = dataView.getUint32(0, false);
    // 0x00010000 或 'true' 或 'typ1' 或 'OTTO'
    if (version !== 0x00010000 && version !== 0x74727565) {
      console.warn('[PDF字体] 可能不是标准TTF格式');
    }
    
    // 简单检查: 查找 'cmap' 表
    const buffer = new Uint8Array(arrayBuffer);
    const cmapSignature = [0x63, 0x6d, 0x61, 0x70]; // 'cmap'
    
    for (let i = 0; i < Math.min(buffer.length - 4, 1000); i++) {
      if (buffer[i] === cmapSignature[0] &&
          buffer[i+1] === cmapSignature[1] &&
          buffer[i+2] === cmapSignature[2] &&
          buffer[i+3] === cmapSignature[3]) {
        console.log('[PDF字体] 找到 cmap 表');
        return true;
      }
    }
    
    console.warn('[PDF字体] 未找到 cmap 表特征');
    return false;
  } catch (error) {
    console.error('[PDF字体] cmap 检查失败:', error);
    return false;
  }
}

/**
 * 从项目资源加载字体文件并添加到PDF
 * @param {jsPDF} pdf - jsPDF实例
 * @param {string} fontPath - 字体文件路径 (相对于public目录)
 * @param {string} fontName - 字体名称
 * @param {string} fontStyle - 字体样式 (normal, bold, light 等)
 * @returns {Promise<boolean>} - 是否成功加载字体
 */
async function loadFontFromProject(pdf, fontPath, fontName = 'CustomFont', fontStyle = 'normal') {
  try {
    console.log(`[PDF字体] 正在加载字体: ${fontPath}`);

    // 使用新的缓存系统加载字体数据
    const { arrayBuffer, base64 } = await loadFontData(fontPath);

    // 验证字体是否包含 cmap 表（仅在首次下载时警告）
    if (!FontCache.has(fontPath)) {
      const hasCmap = hasUnicodeCmap(arrayBuffer);
      if (!hasCmap) {
        console.warn(`[PDF字体] 警告: 字体可能缺少 Unicode cmap 表`);
      }
    }

    // 添加字体到jsPDF
    const fileName = fontPath.split('/').pop();

    try {
      pdf.addFileToVFS(fileName, base64);
      pdf.addFont(fileName, fontName, fontStyle);
      console.log(`[PDF字体] ✓ 字体注册成功: ${fontName}-${fontStyle}`);
      return true;
    } catch (addFontError) {
      console.error(`[PDF字体] addFont 失败:`, addFontError.message);
      console.error(`[PDF字体] 这通常意味着字体不兼容 jsPDF`);
      return false;
    }
  } catch (error) {
    console.error('[PDF字体] 字体加载失败:', error);
    return false;
  }
}

/**
 * 为PDF添加中文字体支持（多字重版本）
 * 尝试加载项目中的中文字体，支持 Regular、Light、Bold 三个字重
 *
 * @param {jsPDF} pdf - jsPDF实例
 * @returns {Promise<{success: boolean, fontName: string, availableWeights: string[]}>} - 加载结果和字体名称
 */
export async function addChineseFontSupport(pdf) {
  console.log('[PDF字体] 开始加载 ARUDJingxihei 字体家族...');

  // 定义字体配置 - 使用阿如汉字黑体
  const fontConfigs = [
    {
      path: '/lyra-exporter/fonts/ARUDJingxihei-Regular.ttf',
      name: 'ARUDJingxihei',
      style: 'normal',
      weight: 400,
      description: 'Regular (正常)'
    },
    {
      path: '/lyra-exporter/fonts/ARUDJingxihei-Bold.ttf',
      name: 'ARUDJingxihei',
      style: 'bold',
      weight: 700,
      description: 'Bold (粗体)'
    },
    {
      path: '/lyra-exporter/fonts/ARUDJingxihei-Light.ttf',
      name: 'ARUDJingxihei',
      style: 'light',
      weight: 300,
      description: 'Light (细体)'
    },
  ];

  let loadedCount = 0;
  let fontName = 'helvetica';
  const availableWeights = [];

  for (const config of fontConfigs) {
    try {
      const success = await loadFontFromProject(
        pdf,
        config.path,
        config.name,
        config.style  // 传入样式参数
      );
      if (success) {
        loadedCount++;
        fontName = config.name;
        availableWeights.push(config.style);
        console.log(`[PDF字体] ✓ 加载成功: ${config.name}-${config.style} (${config.description})`);
      }
    } catch (error) {
      console.warn(`[PDF字体] ✗ 跳过: ${config.path} - ${error.message}`);
    }
  }

  if (loadedCount === 0) {
    console.warn('[PDF字体] ✗ 未能加载任何 ARUDJingxihei 字体');
    console.warn('[PDF字体] 将使用 helvetica 默认字体 (中文可能显示为方块)');
    pdf.setFont('helvetica');
    return { success: false, fontName: 'helvetica', availableWeights: [] };
  }

  console.log(`[PDF字体] ✓ 成功加载 ${loadedCount} 个字体变体: ${availableWeights.join(', ')}`);

  // 设置默认字体为 normal
  try {
    pdf.setFont(fontName, 'normal');
  } catch (error) {
    console.warn('[PDF字体] ⚠ 设置默认字体失败，使用第一个可用字重');
    pdf.setFont(fontName, availableWeights[0] || 'normal');
  }

  return { success: true, fontName, availableWeights };
}

// ==================== 字体预加载系统 ====================

/**
 * 字体加载状态
 */
const FontLoadingState = {
  isLoading: false,
  isLoaded: false,
  error: null
};

/**
 * 字体缓存（存储在内存中，避免重复下载）
 * 结构：{ [fontPath]: { arrayBuffer, base64, timestamp } }
 */
const FontCache = new Map();

/**
 * 从缓存或网络加载字体文件
 * @param {string} fontPath - 字体路径
 * @returns {Promise<{arrayBuffer: ArrayBuffer, base64: string}>} - 字体数据
 */
async function loadFontData(fontPath) {
  // 1. 检查内存缓存
  if (FontCache.has(fontPath)) {
    const cached = FontCache.get(fontPath);
    console.log(`[PDF字体] ✓ 使用内存缓存: ${fontPath}`);
    return { arrayBuffer: cached.arrayBuffer, base64: cached.base64 };
  }

  // 2. 检查 IndexedDB 缓存
  try {
    const dbCache = await loadFromIndexedDB(fontPath);
    if (dbCache) {
      console.log(`[PDF字体] ✓ 使用 IndexedDB 缓存: ${fontPath}`);
      // 同步到内存缓存
      FontCache.set(fontPath, {
        arrayBuffer: dbCache.arrayBuffer,
        base64: dbCache.base64,
        timestamp: Date.now()
      });
      return dbCache;
    }
  } catch (error) {
    console.warn(`[PDF字体] IndexedDB 读取失败: ${error.message}`);
  }

  // 3. 从网络下载
  console.log(`[PDF字体] 从网络下载: ${fontPath}`);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

  try {
    // 使用浏览器缓存，移除 cacheBuster
    const response = await fetch(fontPath, {
      signal: controller.signal,
      cache: 'force-cache', // 利用浏览器缓存
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      throw new Error('返回了HTML而不是字体文件');
    }

    const arrayBuffer = await response.arrayBuffer();
    const fileSizeMB = (arrayBuffer.byteLength / 1024 / 1024).toFixed(2);
    console.log(`[PDF字体] 下载完成: ${fileSizeMB} MB`);

    // 验证TTF魔数
    const dataView = new DataView(arrayBuffer);
    const magic = dataView.getUint32(0, false);
    if (magic !== 0x00010000 && magic !== 0x74727565) {
      throw new Error(`无效的TTF文件，魔数: 0x${magic.toString(16)}`);
    }

    // 检查文件大小
    if (arrayBuffer.byteLength < 500 * 1024) {
      throw new Error(`字体文件异常小 (${fileSizeMB} MB)`);
    }

    // 转换为 base64
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode.apply(null, chunk);
    }
    const base64 = btoa(binary);

    const fontData = { arrayBuffer, base64 };

    // 4. 缓存到内存
    FontCache.set(fontPath, {
      arrayBuffer,
      base64,
      timestamp: Date.now()
    });

    // 5. 缓存到 IndexedDB（异步，不阻塞）
    saveToIndexedDB(fontPath, fontData).catch(err => {
      console.warn(`[PDF字体] IndexedDB 保存失败: ${err.message}`);
    });

    return fontData;
  } catch (fetchError) {
    clearTimeout(timeoutId);
    if (fetchError.name === 'AbortError') {
      throw new Error('下载超时');
    }
    throw fetchError;
  }
}

/**
 * 从 IndexedDB 加载字体
 * @param {string} fontPath - 字体路径
 * @returns {Promise<{arrayBuffer: ArrayBuffer, base64: string} | null>}
 */
async function loadFromIndexedDB(fontPath) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('LyraFontCache', 1);

    request.onerror = () => reject(request.error);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('fonts')) {
        db.createObjectStore('fonts', { keyPath: 'path' });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      try {
        const transaction = db.transaction(['fonts'], 'readonly');
        const store = transaction.objectStore('fonts');
        const getRequest = store.get(fontPath);

        getRequest.onsuccess = () => {
          const data = getRequest.result;
          if (data && data.arrayBuffer && data.base64) {
            resolve({ arrayBuffer: data.arrayBuffer, base64: data.base64 });
          } else {
            resolve(null);
          }
        };

        getRequest.onerror = () => resolve(null);
      } catch (error) {
        resolve(null);
      } finally {
        db.close();
      }
    };
  });
}

/**
 * 保存字体到 IndexedDB
 * @param {string} fontPath - 字体路径
 * @param {{arrayBuffer: ArrayBuffer, base64: string}} fontData - 字体数据
 * @returns {Promise<void>}
 */
async function saveToIndexedDB(fontPath, fontData) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('LyraFontCache', 1);

    request.onerror = () => reject(request.error);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('fonts')) {
        db.createObjectStore('fonts', { keyPath: 'path' });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      try {
        const transaction = db.transaction(['fonts'], 'readwrite');
        const store = transaction.objectStore('fonts');

        store.put({
          path: fontPath,
          arrayBuffer: fontData.arrayBuffer,
          base64: fontData.base64,
          timestamp: Date.now()
        });

        transaction.oncomplete = () => {
          console.log(`[PDF字体] ✓ 已缓存到 IndexedDB: ${fontPath}`);
          resolve();
        };

        transaction.onerror = () => reject(transaction.error);
      } catch (error) {
        reject(error);
      } finally {
        db.close();
      }
    };
  });
}

/**
 * 检查 IndexedDB 中是否已有所有字体缓存
 * @param {string[]} fontPaths - 字体路径列表
 * @returns {Promise<boolean>} - 是否所有字体都已缓存
 */
async function checkCacheExists(fontPaths) {
  try {
    const checkPromises = fontPaths.map(async (path) => {
      const cached = await loadFromIndexedDB(path);
      return cached !== null;
    });

    const results = await Promise.all(checkPromises);
    return results.every(r => r); // 所有字体都存在才返回 true
  } catch (error) {
    console.warn('[PDF字体] 缓存检查失败:', error.message);
    return false;
  }
}

/**
 * 预加载字体文件到缓存（内存 + IndexedDB）
 * @param {boolean} silent - 是否静默加载（不触发 isLoading 状态）
 * @returns {Promise<boolean>} - 是否成功加载
 */
export async function preloadFont(silent = false) {
  if (FontLoadingState.isLoading || FontLoadingState.isLoaded) {
    return FontLoadingState.isLoaded;
  }

  const fontPaths = [
    '/lyra-exporter/fonts/ARUDJingxihei-Regular.ttf',
    '/lyra-exporter/fonts/ARUDJingxihei-Bold.ttf',
    '/lyra-exporter/fonts/ARUDJingxihei-Light.ttf'
  ];

  // 先检查缓存是否已存在
  const cacheExists = await checkCacheExists(fontPaths);

  if (cacheExists) {
    console.log('[PDF字体预加载] ✓ 检测到本地缓存，静默加载...');
    // 有缓存：静默加载到内存，不显示弹窗
    try {
      const loadPromises = fontPaths.map(path => loadFontData(path));
      await Promise.all(loadPromises);
      FontLoadingState.isLoaded = true;
      console.log('[PDF字体预加载] ✓ 从本地缓存加载完成');
      return true;
    } catch (error) {
      console.warn('[PDF字体预加载] 缓存加载失败，将重新下载:', error.message);
      // 继续走下载流程
    }
  }

  // 无缓存或缓存加载失败：需要下载，显示弹窗
  if (!silent) {
    FontLoadingState.isLoading = true;
  }
  FontLoadingState.error = null;

  try {
    console.log('[PDF字体预加载] 开始下载字体到缓存...');

    const loadPromises = fontPaths.map(async (path) => {
      try {
        await loadFontData(path);
        return true;
      } catch (error) {
        console.warn(`[PDF字体预加载] 加载失败: ${path}`, error.message);
        return false;
      }
    });

    const results = await Promise.all(loadPromises);
    const successCount = results.filter(r => r).length;
    FontLoadingState.isLoaded = successCount > 0;
    FontLoadingState.isLoading = false;

    console.log(`[PDF字体预加载] 完成，成功加载 ${successCount}/${fontPaths.length} 个字体`);

    return FontLoadingState.isLoaded;
  } catch (error) {
    console.error('[PDF字体预加载] 预加载失败:', error);
    FontLoadingState.error = error.message;
    FontLoadingState.isLoading = false;
    FontLoadingState.isLoaded = false;
    return false;
  }
}

/**
 * 获取字体加载状态
 * @returns {object} - 字体加载状态对象
 */
export function getFontStatus() {
  return {
    isLoading: FontLoadingState.isLoading,
    isLoaded: FontLoadingState.isLoaded,
    error: FontLoadingState.error
  };
}
