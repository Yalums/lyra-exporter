// fontConfig.js
// PDF 导出字体配置
// 字体打包在扩展内，通过 chrome.runtime.getURL 加载，无需网络请求

/**
 * MiSans 字体配置
 * 版权所有 © 小米科技有限责任公司，依据 MiSans 字体知识产权许可协议使用。
 * 字体文件位于 public/fonts/，构建后复制到 chrome/app/fonts/
 * 许可协议见 MiSans字体知识产权许可协议.pdf
 */

// 字体文件名前缀（实际完整路径由 pdfFontHelper.getFontUrl 拼接）
const FONT_BASE = 'fonts/';

export const MISANS_FONTS = [
  {
    localPath: `${FONT_BASE}MiSans-Regular.ttf`,
    jsPDFName: 'MiSans',
    jsPDFStyle: 'normal',
    label: 'MiSans Regular',
    cacheKey: 'misans-regular-v2',
  },
  {
    localPath: `${FONT_BASE}MiSans-Bold.ttf`,
    jsPDFName: 'MiSans',
    jsPDFStyle: 'bold',
    label: 'MiSans Bold',
    cacheKey: 'misans-bold-v2',
  },
  {
    localPath: `${FONT_BASE}MiSans-Light.ttf`,
    jsPDFName: 'MiSans',
    jsPDFStyle: 'italic',
    label: 'MiSans Light (italic)',
    cacheKey: 'misans-light-v2',
  },
  {
    localPath: `${FONT_BASE}MiSans-Semibold.ttf`,
    jsPDFName: 'MiSans',
    jsPDFStyle: 'bolditalic',
    label: 'MiSans Semibold (bolditalic)',
    cacheKey: 'misans-semibold-v2',
  },
];

// 加载失败时的回退字体（jsPDF 内置，不支持 CJK）
export const FALLBACK_FONT = 'helvetica';
