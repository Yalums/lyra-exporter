// pdfExportManager.js
// 主线程执行，使用 setTimeout yield 防止 UI 完全冻结
import { jsPDF } from 'jspdf';
import { DateTimeUtils } from '../fileParser';
import { addChineseFontSupport } from './pdfFontHelper';
import { ContentRenderer, PDF_STYLES } from './pdfContentRenderers';
import * as textHelpers from './pdfTextHelpers';
import { t } from '../../index.js';

// 每渲染 N 条消息后 yield 一次，让浏览器处理事件
const BATCH_SIZE = 3;
const yieldToBrowser = () => new Promise(resolve => setTimeout(resolve, 0));

export class PDFExportManager {
  constructor() {
    this.pdf = null;
    this.currentY = PDF_STYLES.MARGIN_TOP;
    this.config = {};
    this.useChineseFont = false;
    this.chineseFontName = 'helvetica';
    this.availableFontWeights = [];
    this.meta = null;
    this.exportDate = null;
    this.messageAnchors = [];
    this.contentRenderer = null;

    this.cleanText = textHelpers.cleanText;
    this.parseTextWithCodeBlocksAndLatex = textHelpers.parseTextWithCodeBlocksAndLatex;
    this.parseInlineMarkdown = textHelpers.parseInlineMarkdown;
    this.applyCJKPunctuationRules = textHelpers.applyCJKPunctuationRules;
    this.parseCodeLineBold = textHelpers.parseCodeLineBold;
  }

  safeSetFont(fontName, fontStyle = 'normal') {
    return textHelpers.safeSetFont(this.pdf, fontName, fontStyle, this.availableFontWeights);
  }

  safeGetTextWidth(text) {
    return textHelpers.safeGetTextWidth(this.pdf, text, this.chineseFontName);
  }

  safeRenderText(text, x, y, maxWidth = null) {
    return textHelpers.safeRenderText(this.pdf, text, x, y, maxWidth);
  }

  checkPageBreak(requiredSpace = 20) {
    const bottomLimit = PDF_STYLES.PAGE_HEIGHT - PDF_STYLES.MARGIN_BOTTOM;
    if (this.currentY + requiredSpace > bottomLimit) {
      this.pdf.addPage();
      this.currentY = PDF_STYLES.MARGIN_TOP;
    }
  }

  groupCodeLinesByPage(wrappedLines) {
    const groups = [];
    let currentGroup = null;
    const bottomLimit = PDF_STYLES.PAGE_HEIGHT - PDF_STYLES.MARGIN_BOTTOM;
    let simulatedY = this.currentY;
    let simulatedPage = this.pdf.internal.getCurrentPageInfo().pageNumber;
    wrappedLines.forEach((line) => {
      if (simulatedY + PDF_STYLES.FONT_SIZE_CODE > bottomLimit) {
        simulatedPage++;
        simulatedY = PDF_STYLES.MARGIN_TOP;
        currentGroup = null;
      }
      if (!currentGroup || currentGroup.page !== simulatedPage) {
        currentGroup = { page: simulatedPage, startY: simulatedY, lines: [] };
        groups.push(currentGroup);
      }
      currentGroup.lines.push(line);
      simulatedY += PDF_STYLES.LINE_HEIGHT;
    });
    return groups;
  }

  generateFileName(meta) {
    const date = DateTimeUtils.getCurrentDate();
    const cleanTitle = (meta.name || 'conversation').replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
    return `${cleanTitle}_${date}.pdf`;
  }

  /**
   * @param {Array} messages
   * @param {Object} meta - { name, platform, created_at, updated_at }
   * @param {Object} config
   * @param {Function} [onProgress] - (stage: string | null) => void
   */
  async exportToPDF(messages, meta, config = {}, onProgress = null) {
    this.meta = meta;
    this.exportDate = DateTimeUtils.formatDateTime(new Date());
    this.messageAnchors = [];

    this.config = {
      includeThinking: config.includeThinking ?? false,
      includeArtifacts: config.includeArtifacts ?? true,
      includeTimestamps: config.includeTimestamps ?? false,
      includeTools: config.includeTools ?? true,
      ...config,
    };

    onProgress?.(t('exportManager.progress.initPdf'));
    await yieldToBrowser();

    this.pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

    // 加载字体（首次需下载 ~28MB，之后从 IndexedDB 缓存读取）
    onProgress?.(t('exportManager.progress.loadingFonts'));
    await yieldToBrowser();

    try {
      const fontLoadResult = await addChineseFontSupport(this.pdf); // URL 来自 fontConfig.js
      this.useChineseFont = fontLoadResult.success;
      this.chineseFontName = fontLoadResult.fontName;
      this.availableFontWeights = fontLoadResult.availableWeights || [];
    } catch (err) {
      console.error('[PDF导出] 字体加载失败:', err);
      this.useChineseFont = false;
      this.chineseFontName = 'helvetica';
      this.availableFontWeights = [];
    }

    this.pdf.setFont(this.chineseFontName);
    this.contentRenderer = new ContentRenderer(this);

    onProgress?.(t('exportManager.progress.renderingDoc'));
    await yieldToBrowser();

    this.currentY = PDF_STYLES.MARGIN_TOP;
    this.contentRenderer.renderTitle(meta);
    this.contentRenderer.renderMetadata(meta);
    this.currentY += PDF_STYLES.SECTION_SPACING;

    // 分批渲染消息，每 BATCH_SIZE 条 yield 一次
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      if (i > 0 && message.sender === 'human') {
        this.pdf.addPage();
        this.currentY = PDF_STYLES.MARGIN_TOP;
      }
      this.contentRenderer.renderMessage(message, i + 1);

      if ((i + 1) % BATCH_SIZE === 0) {
        onProgress?.(t('exportManager.progress.renderingMessage', { current: i + 1, total: messages.length }));
        await yieldToBrowser();
      }
    }

    // 目录
    if (messages.length > 1) {
      onProgress?.(t('exportManager.progress.generatingToc'));
      await yieldToBrowser();
      this.pdf.addPage();
      const tocPageNum = this.pdf.internal.getCurrentPageInfo().pageNumber;
      this.currentY = PDF_STYLES.MARGIN_TOP;
      this.contentRenderer.renderTOCWithLinks(tocPageNum, messages);
    }

    // 书签
    try {
      this.messageAnchors.forEach((anchor) => {
        if (this.pdf.outline) {
          const label = anchor.sender === 'human' ? 'Human' : 'Assistant';
          this.pdf.outline.add(null, `${anchor.index}. ${label}`, { pageNumber: anchor.page });
        }
      });
    } catch (_) {}

    // 页脚
    onProgress?.(t('exportManager.progress.addingFooter'));
    await yieldToBrowser();
    const totalPages = this.pdf.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      this.pdf.setPage(i);
      this.contentRenderer.renderFooter(i, totalPages);
    }

    onProgress?.(t('exportManager.progress.savingFile'));
    await yieldToBrowser();
    this.pdf.save(this.generateFileName(meta));
    onProgress?.(null);

    return true;
  }
}

export const pdfExportManager = new PDFExportManager();
