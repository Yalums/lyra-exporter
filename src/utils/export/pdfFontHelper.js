// utils/export/pdfFontHelper.js
// PDF中文字体支持 - 预加载字体方案
//
// 当前实现：
// - 首次进入网站时后台预加载字体
// - 使用 IndexedDB 缓存字体数据
// - 导出 PDF 时检查字体是否就绪
// - 支持多字重变体，可正确渲染粗体标题和强调文本

/**
 * 字体缓存管理器
 * 使用 IndexedDB 存储字体数据
 */
const FontCache = {
  DB_NAME: 'LyraFontCache',
  STORE_NAME: 'fonts',
  DB_VERSION: 1,

  // 字体加载状态
  status: {
    isLoading: false,
    isLoaded: false,
    error: null,
    progress: 0,
  },

  // 缓存的字体数据
  cachedFont: null,

  /**
   * 打开数据库
   */
  async openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  },

  /**
   * 从缓存获取字体
   */
  async getFromCache(fontId) {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.STORE_NAME, 'readonly');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.get(fontId);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });
    } catch (error) {
      console.warn('[字体缓存] 读取缓存失败:', error);
      return null;
    }
  },

  /**
   * 保存字体到缓存
   */
  async saveToCache(fontId, fontData) {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.STORE_NAME, 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.put({
          id: fontId,
          data: fontData,
          timestamp: Date.now()
        });

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(true);
      });
    } catch (error) {
      console.warn('[字体缓存] 保存缓存失败:', error);
      return false;
    }
  },

  /**
   * 检查字体是否已缓存
   */
  async isCached(fontId) {
    const cached = await this.getFromCache(fontId);
    return cached !== null && cached !== undefined;
  }
};

/**
 * CDN 字体配置 - 使用国际 CDN
 */
const CDN_FONT_CONFIG = {
  id: 'NotoSansSC',
  name: 'NotoSansSC',
  style: 'normal',
  // 使用国际 CDN 源
  urls: [
    // Google Fonts CDN (最可靠)
    'https://fonts.gstatic.com/s/notosanssc/v37/k3kCo84MPvpLmixcA63oeAL7Iqp5IZJF9bmaG9_FnYxNbPzS5HE.ttf',
    // jsDelivr (GitHub CDN)
    'https://cdn.jsdelivr.net/gh/AkiTobep/Noto-Sans-SC@main/fonts/NotoSansSC-Regular.otf',
    // Cloudflare CDNJS
    'https://cdnjs.cloudflare.com/ajax/libs/source-han-sans-cn/1.004/SourceHanSansCN-Regular.otf',
  ]
};

/**
 * 预加载字体（在网站首次加载时调用）
 * @returns {Promise<boolean>} - 是否成功
 */
export async function preloadFont() {
  // 如果已经在加载或已加载完成，直接返回
  if (FontCache.status.isLoading) {
    console.log('[字体预加载] 正在加载中...');
    return false;
  }

  if (FontCache.status.isLoaded && FontCache.cachedFont) {
    console.log('[字体预加载] 字体已就绪');
    return true;
  }

  // 检查 IndexedDB 缓存
  try {
    const cached = await FontCache.getFromCache(CDN_FONT_CONFIG.id);
    if (cached && cached.data) {
      console.log('[字体预加载] 从缓存加载字体');
      FontCache.cachedFont = cached.data;
      FontCache.status.isLoaded = true;
      FontCache.status.progress = 100;
      return true;
    }
  } catch (error) {
    console.warn('[字体预加载] 缓存检查失败:', error);
  }

  // 开始从 CDN 下载
  FontCache.status.isLoading = true;
  FontCache.status.progress = 0;
  console.log('[字体预加载] 开始从 CDN 下载字体...');

  for (const url of CDN_FONT_CONFIG.urls) {
    try {
      console.log(`[字体预加载] 尝试: ${url}`);

      const response = await fetch(url, {
        mode: 'cors',
        cache: 'force-cache'
      });

      if (!response.ok) {
        console.warn(`[字体预加载] 请求失败: ${response.status}`);
        continue;
      }

      // 获取文件大小用于进度显示
      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      // 读取数据并跟踪进度
      const reader = response.body.getReader();
      const chunks = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        received += value.length;

        if (total > 0) {
          FontCache.status.progress = Math.round((received / total) * 100);
        }
      }

      // 合并数据
      const arrayBuffer = new Uint8Array(received);
      let position = 0;
      for (const chunk of chunks) {
        arrayBuffer.set(chunk, position);
        position += chunk.length;
      }

      // 验证字体格式
      const dataView = new DataView(arrayBuffer.buffer);
      const magic = dataView.getUint32(0, false);
      const isTTF = magic === 0x00010000 || magic === 0x74727565;
      const isOTF = magic === 0x4F54544F;

      if (!isTTF && !isOTF) {
        console.warn(`[字体预加载] 文件格式不正确`);
        continue;
      }

      // 转换为 base64 并缓存
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < arrayBuffer.length; i += chunkSize) {
        const chunk = arrayBuffer.subarray(i, Math.min(i + chunkSize, arrayBuffer.length));
        binary += String.fromCharCode.apply(null, chunk);
      }
      const base64 = btoa(binary);

      // 保存到缓存
      FontCache.cachedFont = base64;
      FontCache.status.isLoaded = true;
      FontCache.status.isLoading = false;
      FontCache.status.progress = 100;

      await FontCache.saveToCache(CDN_FONT_CONFIG.id, base64);

      const sizeMB = (arrayBuffer.length / 1024 / 1024).toFixed(2);
      console.log(`[字体预加载] ✓ 字体下载成功: ${sizeMB} MB`);
      return true;

    } catch (error) {
      console.warn(`[字体预加载] 下载失败: ${error.message}`);
      continue;
    }
  }

  // 所有 CDN 都失败
  FontCache.status.isLoading = false;
  FontCache.status.error = '所有 CDN 源都无法访问';
  console.error('[字体预加载] ✗ 字体下载失败');
  return false;
}

/**
 * 获取字体加载状态
 * @returns {Object} - 状态信息
 */
export function getFontStatus() {
  return {
    isLoading: FontCache.status.isLoading,
    isLoaded: FontCache.status.isLoaded,
    progress: FontCache.status.progress,
    error: FontCache.status.error,
    fontName: CDN_FONT_CONFIG.name
  };
}

/**
 * 检查字体是否可用于导出
 * @returns {boolean}
 */
export function isFontReady() {
  return FontCache.status.isLoaded && FontCache.cachedFont !== null;
}

/**
 * 系统字体配置 - 按优先级排序
 * 针对不同操作系统的常见中文字体
 */
const SYSTEM_FONTS = {
  // Windows 系统字体
  windows: [
    { name: 'Microsoft YaHei', family: 'Microsoft YaHei, 微软雅黑' },
    { name: 'SimHei', family: 'SimHei, 黑体' },
    { name: 'SimSun', family: 'SimSun, 宋体' },
    { name: 'KaiTi', family: 'KaiTi, 楷体' },
  ],
  // macOS 系统字体
  macos: [
    { name: 'PingFang SC', family: 'PingFang SC, 苹方-简' },
    { name: 'Hiragino Sans GB', family: 'Hiragino Sans GB, 冬青黑体简体中文' },
    { name: 'Heiti SC', family: 'Heiti SC, 黑体-简' },
    { name: 'STHeiti', family: 'STHeiti, 华文黑体' },
  ],
  // iOS 系统字体
  ios: [
    { name: 'PingFang SC', family: 'PingFang SC' },
    { name: 'Heiti SC', family: 'Heiti SC' },
  ],
  // Android 系统字体
  android: [
    { name: 'Noto Sans CJK SC', family: 'Noto Sans CJK SC' },
    { name: 'Droid Sans Fallback', family: 'Droid Sans Fallback' },
    { name: 'Source Han Sans CN', family: 'Source Han Sans CN, 思源黑体' },
  ],
  // 通用备选字体
  fallback: [
    { name: 'Noto Sans SC', family: 'Noto Sans SC' },
    { name: 'Source Han Sans CN', family: 'Source Han Sans CN' },
    { name: 'WenQuanYi Micro Hei', family: 'WenQuanYi Micro Hei, 文泉驿微米黑' },
  ]
};

/**
 * 检测当前操作系统
 * @returns {string} - 'windows' | 'macos' | 'ios' | 'android' | 'linux' | 'unknown'
 */
function detectOS() {
  const userAgent = navigator.userAgent.toLowerCase();
  const platform = navigator.platform?.toLowerCase() || '';

  if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'ios';
  }
  if (/android/.test(userAgent)) {
    return 'android';
  }
  if (/mac/.test(platform) || /macintosh/.test(userAgent)) {
    return 'macos';
  }
  if (/win/.test(platform) || /windows/.test(userAgent)) {
    return 'windows';
  }
  if (/linux/.test(platform)) {
    return 'linux';
  }

  return 'unknown';
}

/**
 * 检测字体是否可用
 * 使用 Canvas 方法检测字体是否在系统中存在
 * @param {string} fontFamily - 要检测的字体家族
 * @returns {boolean} - 字体是否可用
 */
function isFontAvailable(fontFamily) {
  try {
    // 创建测试 canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    // 测试字符 - 使用中文字符进行测试
    const testString = '测试字体ABCabc123';
    const fontSize = 72;

    // 先用默认字体测量
    context.font = `${fontSize}px monospace`;
    const defaultWidth = context.measureText(testString).width;

    // 再用目标字体测量
    context.font = `${fontSize}px ${fontFamily}, monospace`;
    const targetWidth = context.measureText(testString).width;

    // 如果宽度不同，说明字体存在
    return defaultWidth !== targetWidth;
  } catch (error) {
    console.warn(`[PDF字体] 字体检测失败: ${fontFamily}`, error);
    return false;
  }
}

/**
 * 获取可用的系统字体
 * @returns {{fontFamily: string, fontName: string} | null} - 可用的系统字体信息
 */
function getAvailableSystemFont() {
  const os = detectOS();
  console.log(`[PDF字体] 检测到操作系统: ${os}`);

  // 根据操作系统选择字体检测顺序
  let fontsToCheck = [];

  switch (os) {
    case 'windows':
      fontsToCheck = [...SYSTEM_FONTS.windows, ...SYSTEM_FONTS.fallback];
      break;
    case 'macos':
      fontsToCheck = [...SYSTEM_FONTS.macos, ...SYSTEM_FONTS.fallback];
      break;
    case 'ios':
      fontsToCheck = [...SYSTEM_FONTS.ios, ...SYSTEM_FONTS.macos, ...SYSTEM_FONTS.fallback];
      break;
    case 'android':
      fontsToCheck = [...SYSTEM_FONTS.android, ...SYSTEM_FONTS.fallback];
      break;
    default:
      // 对于未知系统，检测所有字体
      fontsToCheck = [
        ...SYSTEM_FONTS.windows,
        ...SYSTEM_FONTS.macos,
        ...SYSTEM_FONTS.android,
        ...SYSTEM_FONTS.fallback
      ];
  }

  // 检测每个字体是否可用
  for (const font of fontsToCheck) {
    if (isFontAvailable(font.family)) {
      console.log(`[PDF字体] ✓ 发现可用系统字体: ${font.name}`);
      return { fontFamily: font.family, fontName: font.name };
    }
  }

  console.warn('[PDF字体] ✗ 未检测到可用的系统中文字体');
  return null;
}

/**
 * 系统字体路径映射
 * 定义各操作系统中字体文件的路径
 */
const SYSTEM_FONT_PATHS = {
  // Windows 字体路径
  'Microsoft YaHei': {
    windows: [
      'C:/Windows/Fonts/msyh.ttc',
      'C:/Windows/Fonts/msyh.ttf',
      'C:/Windows/Fonts/msyhbd.ttc',
      'C:/Windows/Fonts/msyhbd.ttf',
    ]
  },
  'SimHei': {
    windows: [
      'C:/Windows/Fonts/simhei.ttf',
    ]
  },
  'SimSun': {
    windows: [
      'C:/Windows/Fonts/simsun.ttc',
    ]
  },
  // macOS 字体路径
  'PingFang SC': {
    macos: [
      '/System/Library/Fonts/PingFang.ttc',
      '/Library/Fonts/PingFang.ttc',
    ]
  },
  'Hiragino Sans GB': {
    macos: [
      '/System/Library/Fonts/Hiragino Sans GB.ttc',
      '/Library/Fonts/Hiragino Sans GB.ttc',
    ]
  },
  // Android/Linux 字体路径
  'Noto Sans CJK SC': {
    android: [
      '/system/fonts/NotoSansCJK-Regular.ttc',
      '/system/fonts/NotoSansSC-Regular.otf',
    ],
    linux: [
      '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
      '/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc',
    ]
  },
  'Droid Sans Fallback': {
    android: [
      '/system/fonts/DroidSansFallback.ttf',
    ]
  }
};

/**
 * 尝试从系统路径加载字体
 * 注意：由于浏览器安全限制，这通常不会成功
 * 但在 Electron 或其他桌面环境中可能有效
 *
 * @param {jsPDF} pdf - jsPDF 实例
 * @param {string} fontName - 字体名称
 * @returns {Promise<{fontName: string, availableWeights: string[]} | null>}
 */
async function loadSystemFont(pdf, fontName) {
  // 获取当前操作系统
  const os = detectOS();

  // 获取该字体在当前操作系统的路径
  const fontConfig = SYSTEM_FONT_PATHS[fontName];
  if (!fontConfig) {
    console.log(`[PDF字体] 没有 ${fontName} 的系统路径配置`);
    return null;
  }

  const paths = fontConfig[os] || [];
  if (paths.length === 0) {
    console.log(`[PDF字体] ${os} 系统没有 ${fontName} 的路径配置`);
    return null;
  }

  // 尝试从本地路径加载字体
  // 注意：这在浏览器环境中通常会失败，因为无法访问本地文件系统
  // 这个功能主要用于 Electron 应用或其他有文件系统访问权限的环境

  for (const fontPath of paths) {
    try {
      console.log(`[PDF字体] 尝试加载系统字体: ${fontPath}`);

      // 在浏览器中无法直接访问本地文件
      // 但如果是通过 Electron 或类似环境，可以使用 file:// 协议
      const response = await fetch(`file://${fontPath}`).catch(() => null);

      if (!response || !response.ok) {
        continue;
      }

      const arrayBuffer = await response.arrayBuffer();

      // 验证字体文件
      const dataView = new DataView(arrayBuffer);
      const magic = dataView.getUint32(0, false);

      // 检查 TTC 或 TTF 文件头
      const isTTC = magic === 0x74746366; // 'ttcf'
      const isTTF = magic === 0x00010000 || magic === 0x74727565;
      const isOTF = magic === 0x4F54544F; // 'OTTO'

      if (!isTTC && !isTTF && !isOTF) {
        console.warn(`[PDF字体] 文件格式不正确: ${fontPath}`);
        continue;
      }

      // 转换为 base64
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < bytes.byteLength; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.byteLength));
        binary += String.fromCharCode.apply(null, chunk);
      }
      const base64 = btoa(binary);

      // 添加到 jsPDF
      const fileName = fontPath.split('/').pop();
      pdf.addFileToVFS(fileName, base64);
      pdf.addFont(fileName, fontName, 'normal');
      pdf.setFont(fontName, 'normal');

      console.log(`[PDF字体] ✓ 系统字体加载成功: ${fontPath}`);

      return {
        fontName,
        availableWeights: ['normal']
      };
    } catch (error) {
      // 预期会失败，因为浏览器通常无法访问本地文件
      continue;
    }
  }

  console.log(`[PDF字体] 无法从系统路径加载字体 ${fontName}`);
  console.log(`[PDF字体] 这是预期的行为，浏览器无法直接访问本地文件系统`);

  return null;
}

/**
 * 从 URL 加载字体文件
 * 用于从 CDN 加载开源中文字体
 *
 * @param {jsPDF} pdf - jsPDF 实例
 * @param {string} url - 字体文件 URL
 * @param {string} fontName - 字体名称
 * @param {string} fontStyle - 字体样式
 * @returns {Promise<boolean>} - 是否成功
 */
async function loadFontFromURL(pdf, url, fontName, fontStyle = 'normal') {
  try {
    // 设置超时时间（15秒，因为字体文件可能较大）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      signal: controller.signal,
      mode: 'cors'
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[PDF字体] CDN 请求失败: ${response.status}`);
      return false;
    }

    const arrayBuffer = await response.arrayBuffer();
    const fileSizeKB = (arrayBuffer.byteLength / 1024).toFixed(2);
    const fileSizeMB = (arrayBuffer.byteLength / 1024 / 1024).toFixed(2);

    console.log(`[PDF字体] 字体文件大小: ${fileSizeMB} MB (${fileSizeKB} KB)`);

    // 验证文件格式
    const dataView = new DataView(arrayBuffer);
    const magic = dataView.getUint32(0, false);

    const isTTC = magic === 0x74746366; // 'ttcf'
    const isTTF = magic === 0x00010000 || magic === 0x74727565;
    const isOTF = magic === 0x4F54544F; // 'OTTO'

    if (!isTTC && !isTTF && !isOTF) {
      console.warn(`[PDF字体] 文件格式不正确，魔数: 0x${magic.toString(16)}`);
      return false;
    }

    // 检查文件大小（中文字体应该至少 500KB）
    if (arrayBuffer.byteLength < 100 * 1024) {
      console.warn(`[PDF字体] 字体文件过小 (${fileSizeKB} KB)，可能不完整`);
      return false;
    }

    // 转换为 base64
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.byteLength; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.byteLength));
      binary += String.fromCharCode.apply(null, chunk);
    }
    const base64 = btoa(binary);

    // 添加到 jsPDF
    const fileName = url.split('/').pop().split('?')[0];
    pdf.addFileToVFS(fileName, base64);
    pdf.addFont(fileName, fontName, fontStyle);

    console.log(`[PDF字体] ✓ 字体加载成功: ${fontName}-${fontStyle}`);
    return true;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn(`[PDF字体] CDN 加载超时: ${url}`);
    } else {
      console.warn(`[PDF字体] CDN 加载失败: ${error.message}`);
    }
    return false;
  }
}

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
    
    // 设置超时时间（5秒）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
      // 从 public 目录加载字体文件
      // 添加时间戳参数破坏缓存
      const cacheBuster = `?v=${Date.now()}`;
      const response = await fetch(fontPath + cacheBuster, { 
        signal: controller.signal,
        cache: 'no-store', // 禁用缓存
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`加载字体失败: ${response.status}`);
      }

      // 检查 Content-Type，确保是字体文件而不是HTML错误页面
      const contentType = response.headers.get('content-type');
      console.log(`[PDF字体] Content-Type: ${contentType}`);

      if (contentType && contentType.includes('text/html')) {
        console.error(`[PDF字体] 返回了HTML页面而不是字体文件！`);
        return false;
      }

      const arrayBuffer = await response.arrayBuffer();
      const fileSizeKB = (arrayBuffer.byteLength / 1024).toFixed(2);
      const fileSizeMB = (arrayBuffer.byteLength / 1024 / 1024).toFixed(2);

      console.log(`[PDF字体] 字体文件大小: ${fileSizeMB} MB (${fileSizeKB} KB)`);

      // 验证TTF魔数（文件头）
      const dataView = new DataView(arrayBuffer);
      const magic = dataView.getUint32(0, false);
      // TTF文件应该以 0x00010000 或 0x74727565 ('true') 开头
      if (magic !== 0x00010000 && magic !== 0x74727565) {
        console.error(`[PDF字体] 文件不是有效的TTF字体！魔数: 0x${magic.toString(16)}`);
        console.error(`[PDF字体] 这可能是一个HTML错误页面或其他非字体文件`);
        return false;
      }

      // 检查文件是否太小
      if (arrayBuffer.byteLength < 500 * 1024) {
        console.error(`[PDF字体] 字体文件异常小 (仅 ${fileSizeKB} KB)！`);
        console.error(`[PDF字体] 正常的中文字体应该至少 3MB`);
        return false;
      }
      
      // 验证字体是否包含 cmap 表
      const hasCmap = hasUnicodeCmap(arrayBuffer);
      if (!hasCmap) {
        console.warn(`[PDF字体] 警告: 字体可能缺少 Unicode cmap 表`);
        console.warn(`[PDF字体] 建议更换为 Noto Sans SC 或 Source Han Sans CN`);
      }
      
      const bytes = new Uint8Array(arrayBuffer);
      
      // 转换为base64
      let binary = '';
      const len = bytes.byteLength;
      // 批量处理以提高性能
      const chunkSize = 8192;
      for (let i = 0; i < len; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
        binary += String.fromCharCode.apply(null, chunk);
      }
      const base64 = btoa(binary);
      
      // 添加字体到jsPDF
      const fileName = fontPath.split('/').pop();
      
      try {
        pdf.addFileToVFS(fileName, base64);
        // 添加字体时指定样式
        pdf.addFont(fileName, fontName, fontStyle);

        console.log(`[PDF字体] 字体加载成功: ${fontName}-${fontStyle}`);
        return true;
      } catch (addFontError) {
        console.error(`[PDF字体] addFont 失败:`, addFontError.message);
        console.error(`[PDF字体] 这通常意味着字体不兼容 jsPDF`);
        console.error(`[PDF字体] 错误详情:`, addFontError);
        return false;
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.warn(`[PDF字体] 字体加载超时: ${fontPath}`);
      } else {
        console.warn(`[PDF字体] 获取字体文件失败: ${fetchError.message}`);
      }
      return false;
    }
  } catch (error) {
    console.error('[PDF字体] 字体加载失败:', error);
    return false;
  }
}

/**
 * 为PDF添加中文字体支持
 * 优先使用系统字体，如果不可用则尝试加载项目字体
 *
 * 字体优先级：
 * 1. 系统字体（Windows: 微软雅黑, macOS: 苹方, Android: Noto Sans CJK）
 * 2. 项目自带字体（ARUDJingxihei）
 * 3. 默认字体（helvetica）
 *
 * @param {jsPDF} pdf - jsPDF实例
 * @returns {Promise<{success: boolean, fontName: string, availableWeights: string[], isSystemFont: boolean}>} - 加载结果和字体名称
 */
export async function addChineseFontSupport(pdf) {
  console.log('[PDF字体] 开始检测可用字体...');

  // 第一步：尝试使用系统字体
  const systemFont = getAvailableSystemFont();

  if (systemFont) {
    console.log(`[PDF字体] ✓ 检测到系统字体: ${systemFont.fontName}`);
    console.log(`[PDF字体] 字体家族: ${systemFont.fontFamily}`);

    // 尝试加载对应的系统字体文件
    const systemFontLoaded = await loadSystemFont(pdf, systemFont.fontName);

    if (systemFontLoaded) {
      console.log(`[PDF字体] ✓ 系统字体加载成功: ${systemFontLoaded.fontName}`);
      return {
        success: true,
        fontName: systemFontLoaded.fontName,
        availableWeights: systemFontLoaded.availableWeights,
        isSystemFont: true,
        systemFontInfo: systemFont
      };
    }

    console.log(`[PDF字体] ⚠ 无法加载系统字体文件，将回退到项目字体`);
  }

  // 第二步：使用预加载的缓存字体
  if (FontCache.cachedFont) {
    console.log('[PDF字体] 使用预加载的缓存字体...');

    try {
      const fontName = CDN_FONT_CONFIG.name;
      const fileName = `${fontName}.ttf`;

      // 添加字体到 jsPDF
      pdf.addFileToVFS(fileName, FontCache.cachedFont);
      pdf.addFont(fileName, fontName, 'normal');
      pdf.setFont(fontName, 'normal');

      console.log(`[PDF字体] ✓ 缓存字体加载成功: ${fontName}`);

      return {
        success: true,
        fontName: fontName,
        availableWeights: ['normal'],
        isSystemFont: false,
        isCDNFont: true
      };
    } catch (error) {
      console.error('[PDF字体] 缓存字体加载失败:', error);
    }
  }

  // 第三步：字体未就绪，返回失败
  console.error('[PDF字体] ✗ 字体未就绪');
  console.error('[PDF字体] 请等待字体下载完成后再导出 PDF');

  return {
    success: false,
    fontName: 'helvetica',
    availableWeights: ['normal', 'bold', 'italic'],
    isSystemFont: false,
    fontNotReady: true
  };
}

/**
 * 获取操作系统信息和推荐字体
 * 可用于在 UI 中显示字体状态
 * @returns {Object} - 操作系统和字体信息
 */
export function getFontInfo() {
  const os = detectOS();
  const systemFont = getAvailableSystemFont();

  return {
    os,
    systemFont: systemFont ? systemFont.fontName : null,
    recommendation: systemFont
      ? `检测到系统字体: ${systemFont.fontName}`
      : '未检测到中文字体，建议安装中文字体包'
  };
}
