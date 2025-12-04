// utils/export/pdfExportManager_new.js
// PDF导出管理器 - 基于jsPDF实现纯文本PDF导出
//
// 使用 ARUDJingxihei 字体家族支持中文显示（Regular、Bold、Light 三种字重）
// 支持 Markdown 渲染（标题、粗体、斜体、列表、引用等）
// 支持 LaTeX 数学公式渲染（行内和块级）
import { jsPDF } from 'jspdf';
import { DateTimeUtils } from '../fileParser';
import { addChineseFontSupport } from './pdfFontHelper';
import { ContentRenderer, PDF_STYLES } from './pdfContentRenderers';
import * as textHelpers from './pdfTextHelpers';

/**
 * PDF导出管理器类
 */
export class PDFExportManager {
  constructor() {
    this.pdf = null;
    this.currentY = PDF_STYLES.MARGIN_TOP;
    this.config = {};
    this.useChineseFont = false; // 是否成功加载了中文字体
    this.chineseFontName = 'helvetica'; // 当前使用的字体名称
    this.availableFontWeights = []; // 可用的字体变体 (normal, bold, light 等)
    this.isSystemFont = false; // 是否使用系统字体
    this.meta = null; // 保存元数据用于页脚
    this.exportDate = null; // 导出时间
    this.messageAnchors = []; // 保存每条消息的位置信息用于目录链接和书签
    this.contentRenderer = null; // 内容渲染器实例
    
    // 绑定文本辅助方法到实例
    this.cleanText = textHelpers.cleanText;
    this.parseTextWithCodeBlocksAndLatex = textHelpers.parseTextWithCodeBlocksAndLatex;
    this.parseInlineMarkdown = textHelpers.parseInlineMarkdown;
    this.applyCJKPunctuationRules = textHelpers.applyCJKPunctuationRules;
    this.parseCodeLineBold = textHelpers.parseCodeLineBold;
  }

  /**
   * 安全地设置字体，如果字体变体不可用则自动回退
   * @param {string} fontName - 字体名称
   * @param {string} fontStyle - 字体样式 (normal, bold, light, italic, bolditalic)
   * @returns {boolean} - 是否成功设置
   */
  safeSetFont(fontName, fontStyle = 'normal') {
    return textHelpers.safeSetFont(this.pdf, fontName, fontStyle, this.availableFontWeights);
  }

  /**
   * 安全地获取文本宽度，处理字体元数据缺失的情况
   * @param {string} text - 要测量的文本
   * @returns {number} - 文本宽度
   */
  safeGetTextWidth(text) {
    return textHelpers.safeGetTextWidth(this.pdf, text, this.chineseFontName);
  }

  /**
   * 安全地渲染文本，自动处理边界
   * @param {string} text - 要渲染的文本
   * @param {number} x - X 坐标
   * @param {number} y - Y 坐标
   * @param {number} maxWidth - 最大宽度（可选）
   */
  safeRenderText(text, x, y, maxWidth = null) {
    return textHelpers.safeRenderText(this.pdf, text, x, y, maxWidth);
  }

  /**
   * 主导出方法
   * @param {Array} messages - 消息列表
   * @param {Object} meta - 元数据(title, platform, created_at, updated_at)
   * @param {Object} config - 导出配置
   */
  async exportToPDF(messages, meta, config = {}) {
    console.log('[PDF导出] 开始导出', {
      messageCount: messages.length,
      config
    });

    // 保存元数据和导出时间
    this.meta = meta;
    this.exportDate = DateTimeUtils.formatDateTime(new Date());
    this.messageAnchors = []; // 重置消息锚点

    this.config = {
      includeThinking: config.includeThinking ?? false,
      includeArtifacts: config.includeArtifacts ?? true,
      includeTimestamps: config.includeTimestamps ?? false,
      includeTools: config.includeTools ?? true,
      includeCitations: config.includeCitations ?? true,
      highQuality: config.highQuality ?? false,
      ...config
    };

    // 初始化PDF文档
    this.pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    // 尝试加载中文字体（异步加载可能需要时间）
    try {
      console.log('[PDF导出] 开始加载中文字体...');
      console.log('[PDF导出] 调用 addChineseFontSupport(this.pdf)...');
      const fontLoadResult = await addChineseFontSupport(this.pdf);
      console.log('[PDF导出] addChineseFontSupport 返回结果:', fontLoadResult);

      this.useChineseFont = fontLoadResult.success;
      this.chineseFontName = fontLoadResult.fontName;
      this.availableFontWeights = fontLoadResult.availableWeights || [];
      this.isSystemFont = fontLoadResult.isSystemFont || false;

      if (!this.useChineseFont) {
        console.warn('[PDF导出] ⚠️ 中文字体加载失败，将使用默认字体（中文可能显示为方框）');
        console.warn('[PDF导出] fontLoadResult详情:', JSON.stringify(fontLoadResult, null, 2));
        if (fontLoadResult.systemFontAvailable) {
          console.warn('[PDF导出] 提示：检测到系统有中文字体，但无法在浏览器环境中直接使用');
          console.warn('[PDF导出] 建议：请确保项目 public/fonts/ 目录下有中文字体文件');
        }
      } else {
        const fontType = this.isSystemFont ? '系统字体' : '项目字体';
        console.log(`[PDF导出] ✅ 中文字体加载成功: ${this.chineseFontName} (${fontType})`);
        console.log(`[PDF导出] 可用字体变体: ${this.availableFontWeights.join(', ')}`);
        if (fontLoadResult.systemFontInfo) {
          console.log(`[PDF导出] 系统字体信息: ${fontLoadResult.systemFontInfo.fontName}`);
        }
      }
    } catch (error) {
      console.error('[PDF导出] ❌ 字体加载异常:', error);
      console.error('[PDF导出] 错误堆栈:', error.stack);
      this.useChineseFont = false;
      this.chineseFontName = 'helvetica';
      this.availableFontWeights = [];
      this.isSystemFont = false;
    }

    // 无论字体是否加载成功，都设置一个默认字体
    this.pdf.setFont(this.chineseFontName);

    // 创建内容渲染器实例
    this.contentRenderer = new ContentRenderer(this);

    // 渲染文档
    this.contentRenderer.renderTitle(meta);
    this.contentRenderer.renderMetadata(meta);
    this.currentY += PDF_STYLES.SECTION_SPACING;

    // 渲染消息（LaTeX显示为源码）
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];

      // 分页策略：一轮对话（用户消息+AI回复）结束后再换页
      // 只有当前是用户消息且不是第一条时才换页，这样一轮对话会在同一页或连续页面上
      if (i > 0 && message.sender === 'human') {
        this.pdf.addPage();
        this.currentY = PDF_STYLES.MARGIN_TOP;
      }

      this.contentRenderer.renderMessage(message, i + 1);
    }

    // 生成目录（放在文档最后，避免页码混乱）
    const hasTOC = messages.length > 1;
    if (hasTOC) {
      console.log('[PDF导出] 生成目录（位于文档末尾）...');
      this.pdf.addPage();
      const tocPageNumber = this.pdf.internal.getCurrentPageInfo().pageNumber;
      this.currentY = PDF_STYLES.MARGIN_TOP;
      this.contentRenderer.renderTOCWithLinks(tocPageNumber, messages);
    }

    // 添加PDF书签
    console.log('[PDF导出] 添加PDF书签...');
    this.addBookmarks();

    // 为所有页面添加页脚
    console.log('[PDF导出] 添加页脚...');
    this.addFooters();

    // 生成文件名并保存
    const fileName = this.generateFileName(meta);
    this.pdf.save(fileName);

    console.log('[PDF导出] 导出完成:', fileName);
    return true;
  }

  /**
   * 添加PDF书签（outline）
   */
  addBookmarks() {
    if (this.messageAnchors.length === 0) return;

    // jsPDF的outline功能
    // 创建书签树结构
    try {
      this.messageAnchors.forEach((anchor) => {
        const sender = anchor.sender === 'human' ? 'Human' : 'Assistant';
        const title = `${anchor.index}. ${sender}`;

        // 使用jsPDF的outline API
        // 注意：jsPDF的outline功能可能需要插件支持
        if (this.pdf.outline) {
          this.pdf.outline.add(null, title, { pageNumber: anchor.page });
        }
      });
    } catch (error) {
      console.warn('[PDF导出] 书签添加失败（可能不支持）:', error);
    }
  }

  /**
   * 为所有页面添加页脚
   */
  addFooters() {
    const totalPages = this.pdf.internal.getNumberOfPages();

    for (let i = 1; i <= totalPages; i++) {
      this.pdf.setPage(i);
      this.contentRenderer.renderFooter(i, totalPages);
    }
  }

  /**
   * 检查是否需要分页
   */
  checkPageBreak(requiredSpace = 20) {
    const bottomLimit = PDF_STYLES.PAGE_HEIGHT - PDF_STYLES.MARGIN_BOTTOM;

    if (this.currentY + requiredSpace > bottomLimit) {
      this.pdf.addPage();
      this.currentY = PDF_STYLES.MARGIN_TOP;
    }
  }

  /**
   * 将代码行按页分组
   * @param {Array} wrappedLines - 包装后的代码行
   * @returns {Array} - 分组后的行 [{page, startY, lines: [...]}]
   */
  groupCodeLinesByPage(wrappedLines) {
    const groups = [];
    let currentGroup = null;
    const bottomLimit = PDF_STYLES.PAGE_HEIGHT - PDF_STYLES.MARGIN_BOTTOM;

    let simulatedY = this.currentY;
    let simulatedPage = this.pdf.internal.getCurrentPageInfo().pageNumber;

    wrappedLines.forEach((line) => {
      // 检查是否需要换页
      if (simulatedY + PDF_STYLES.FONT_SIZE_CODE > bottomLimit) {
        simulatedPage++;
        simulatedY = PDF_STYLES.MARGIN_TOP;
        currentGroup = null; // 开始新组
      }

      // 如果没有当前组或换页了，创建新组
      if (!currentGroup || currentGroup.page !== simulatedPage) {
        currentGroup = {
          page: simulatedPage,
          startY: simulatedY,
          lines: []
        };
        groups.push(currentGroup);
      }

      // 添加行到当前组
      currentGroup.lines.push(line);
      simulatedY += PDF_STYLES.LINE_HEIGHT;
    });

    return groups;
  }

  /**
   * 生成文件名
   */
  generateFileName(meta) {
    const date = DateTimeUtils.getCurrentDate();
    const cleanTitle = (meta.name || 'conversation').replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
    return `${cleanTitle}_${date}.pdf`;
  }

  /**
   * 获取平台前缀
   */
  getPlatformPrefix(platform) {
    const platformLower = (platform || '').toLowerCase();

    if (platformLower.includes('chatgpt')) return 'chatgpt';
    if (platformLower.includes('gemini')) return 'gemini';
    if (platformLower.includes('notebooklm')) return 'notebooklm';
    if (platformLower.includes('aistudio')) return 'aistudio';
    if (platformLower.includes('sillytavern')) return 'sillytavern';

    return 'claude';
  }
}

// 导出单例实例
export const pdfExportManager = new PDFExportManager();