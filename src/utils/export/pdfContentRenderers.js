// PDF内容渲染器 - 负责所有内容的渲染工作

import { cleanText, parseInlineMarkdown, parseCodeLineBold, applyCJKPunctuationRules } from './pdfTextHelpers'
import { LaTeXRenderer } from './pdfLatexRenderer'

// ============ 渲染常量 ============
const RENDER_CONSTANTS = {
  // 行高缩放比例
  LINE_HEIGHT_TITLE: 1.5,
  LINE_HEIGHT_SENDER: 1.2,
  LINE_HEIGHT_HEADING: 1.2,
  LINE_HEIGHT_TABLE_ROW: 1.8,
  
  // 间距缩放比例
  BODY_END_SPACING: 0.3,
  HEADING_AFTER_SPACING: 0.5,
  HR_SPACING_ABOVE: 0.8,
  HR_SPACING_BELOW: 4,
  LATEX_DISPLAY_SPACING: 0.05,
  TOC_ENTRY_SPACING: 1.5,
  
  // 列表缩进
  LIST_INDENT_PER_LEVEL: 8,   // 每级列表缩进
  LIST_BULLET_OFFSET: 2,      // 项目符号偏移
  
  // 代码块
  CODE_LINE_NUMBER_WIDTH: 8,
  CODE_PADDING: 3,
  CODE_BORDER_RADIUS: 1.5,
  
  // 表格
  TABLE_CELL_PADDING: 3,
  TABLE_HEADER_BG: [245, 245, 245],
  
  // 引用
  QUOTE_INDENT: 6,
  QUOTE_LINE_WIDTH: 0.5,
};

// 纸张格式配置 (单位: mm)
export const PAGE_FORMATS = {
  a3: { width: 297, height: 420, name: 'A3' },
  a4: { width: 210, height: 297, name: 'A4' },
  letter: { width: 215.9, height: 279.4, name: 'Letter' },
  supernote: { width: 163, height: 217, name: 'Supernote (10.7")' }
};

export const PDF_STYLES = {
  // 字体大小
  FONT_SIZE_TITLE: 20,
  FONT_SIZE_H1: 16,
  FONT_SIZE_H2: 14,
  FONT_SIZE_SENDER: 12,
  FONT_SIZE_BODY: 10,
  FONT_SIZE_CODE: 9,
  FONT_SIZE_TIMESTAMP: 8,
  FONT_SIZE_HEADER: 8,
  FONT_SIZE_FOOTER: 8,

  // 颜色 (RGB)
  COLOR_SENDER_HUMAN: [0, 102, 204],      // 蓝色
  COLOR_SENDER_ASSISTANT: [102, 102, 102], // 灰色
  COLOR_TIMESTAMP: [150, 150, 150],        // 浅灰
  COLOR_CODE_BG: [245, 245, 245],          // 代码背景
  COLOR_SECTION_BG: [250, 250, 250],       // 区块背景
  COLOR_TEXT: [0, 0, 0],                   // 黑色文本
  COLOR_HEADER: [100, 100, 100],           // 页眉颜色
  COLOR_FOOTER: [150, 150, 150],           // 页脚颜色
  COLOR_BORDER: [200, 200, 200],           // 边框颜色

  // 间距
  MARGIN_LEFT: 15,
  MARGIN_RIGHT: 15,
  MARGIN_TOP: 15,    // 顶部边距（移除页眉，增加空间利用率）
  MARGIN_BOTTOM: 25, // 底部边距为页脚留空间
  LINE_HEIGHT: 5,
  SECTION_SPACING: 8,
  MESSAGE_SPACING: 10,
  FOOTER_HEIGHT: 15, // 页脚高度

  // 页面 (默认 A4)
  PAGE_WIDTH: 210,
  PAGE_HEIGHT: 297,
};

/**
 * 根据纸张格式更新 PDF_STYLES 的页面尺寸
 * @param {string} format - 纸张格式 ('a3', 'a4', 'letter', 'supernote')
 */
export function updatePageFormat(format = 'a4') {
  const pageFormat = PAGE_FORMATS[format] || PAGE_FORMATS.a4;
  PDF_STYLES.PAGE_WIDTH = pageFormat.width;
  PDF_STYLES.PAGE_HEIGHT = pageFormat.height;
  return pageFormat;
}

/**
 * 内容渲染器类
 */
export class ContentRenderer {
  constructor(manager) {
    this.manager = manager;
    this.latexRenderer = null; // 延迟初始化
  }

  /**
   * 获取PDF实例
   */
  get pdf() {
    return this.manager.pdf;
  }

  /**
   * 获取和设置当前Y位置
   */
  get currentY() {
    return this.manager.currentY;
  }

  set currentY(value) {
    this.manager.currentY = value;
  }

  /**
   * 获取配置
   */
  get config() {
    return this.manager.config;
  }

  /**
   * 获取字体相关属性
   */
  get chineseFontName() {
    return this.manager.chineseFontName;
  }

  get availableFontWeights() {
    return this.manager.availableFontWeights;
  }

  /**
   * 委托给manager的辅助方法
   */
  safeSetFont(fontName, fontStyle) {
    return this.manager.safeSetFont(fontName, fontStyle);
  }

  safeGetTextWidth(text) {
    return this.manager.safeGetTextWidth(text);
  }

  safeRenderText(text, x, y, maxWidth) {
    return this.manager.safeRenderText(text, x, y, maxWidth);
  }

  checkPageBreak(requiredSpace) {
    return this.manager.checkPageBreak(requiredSpace);
  }


  /**
   * 渲染标题页
   */
  renderTitle(meta) {
    this.pdf.setFontSize(PDF_STYLES.FONT_SIZE_TITLE);
    this.pdf.setTextColor(...PDF_STYLES.COLOR_TEXT);

    const rawTitle = meta.name || 'Conversation';
    const title = cleanText(rawTitle); // 清理标题文本
    const maxWidth = PDF_STYLES.PAGE_WIDTH - PDF_STYLES.MARGIN_LEFT - PDF_STYLES.MARGIN_RIGHT;

    // 标题可能很长,需要自动换行
    let titleLines;
    try {
      titleLines = this.pdf.splitTextToSize(title, maxWidth);
    } catch (error) {
      console.error('[PDF导出] 标题分割失败,使用原始标题:', error);
      titleLines = [title];
    }
    
    titleLines.forEach(line => {
      this.checkPageBreak(PDF_STYLES.FONT_SIZE_TITLE);
      const cleanLine = cleanText(line);
      if (cleanLine && cleanLine.trim().length > 0) {
        this.pdf.text(cleanLine, PDF_STYLES.MARGIN_LEFT, this.currentY);
      }
      this.currentY += PDF_STYLES.LINE_HEIGHT * 1.5;
    });

    this.currentY += PDF_STYLES.SECTION_SPACING;
  }

  /**
   * 渲染元数据
   */
  renderMetadata(meta) {
    this.pdf.setFontSize(PDF_STYLES.FONT_SIZE_TIMESTAMP);
    this.pdf.setTextColor(...PDF_STYLES.COLOR_TIMESTAMP);

    const lines = [];

    if (meta.platform) {
      lines.push(`Platform: ${meta.platform}`);
    }

    if (meta.created_at) {
      lines.push(`Created: ${meta.created_at}`);
    }

    if (meta.updated_at) {
      lines.push(`Updated: ${meta.updated_at}`);
    }

    lines.push(`Exported: ${this.manager.exportDate}`);

    lines.forEach(line => {
      this.checkPageBreak(PDF_STYLES.FONT_SIZE_TIMESTAMP);
      this.pdf.text(line, PDF_STYLES.MARGIN_LEFT, this.currentY);
      this.currentY += PDF_STYLES.LINE_HEIGHT;
    });
  }

  /**
   * 渲染单条消息（LaTeX显示为源码）
   */
  renderMessage(message, index) {
    this.checkPageBreak(PDF_STYLES.FONT_SIZE_SENDER + PDF_STYLES.MESSAGE_SPACING);

    // 记录消息位置用于目录链接和书签
    const currentPage = this.pdf.internal.getCurrentPageInfo().pageNumber;
    const currentY = this.currentY;
    this.manager.messageAnchors.push({
      index,
      page: currentPage,
      y: currentY,
      sender: message.sender,
      title: message.display_text ? message.display_text.substring(0, 50) : ''
    });

    // 渲染发送者标签
    this.renderSender(message, index);

    // 渲染时间戳
    if (this.config.includeTimestamps && message.timestamp) {
      this.renderTimestamp(message.timestamp);
    }

    // 渲染thinking(前置)
    if (message.thinking && this.config.includeThinking && message.sender !== 'human') {
      this.renderThinking(message.thinking);
    }

    // 渲染正文（LaTeX显示为源码）
    if (message.display_text) {
      this.renderBody(message.display_text);
    }

    // 渲染附件
    if (message.attachments?.length > 0 && message.sender === 'human') {
      this.renderAttachments(message.attachments);
    }

    // 渲染Artifacts
    if (message.artifacts?.length > 0 && this.config.includeArtifacts && message.sender !== 'human') {
      message.artifacts.forEach(artifact => {
        this.renderArtifact(artifact);
      });
    }

    // 渲染工具调用
    if (message.tools?.length > 0 && this.config.includeTools) {
      message.tools.forEach(tool => {
        this.renderTool(tool);
      });
    }

    // 渲染引用
    if (message.citations?.length > 0 && this.config.includeCitations) {
      this.renderCitations(message.citations);
    }

    // 消息间距
    this.currentY += PDF_STYLES.MESSAGE_SPACING;
  }

  /**
   * 渲染发送者标签
   */
  renderSender(message, index) {
    this.pdf.setFontSize(PDF_STYLES.FONT_SIZE_SENDER);

    // 根据发送者设置颜色
    const color = message.sender === 'human'
      ? PDF_STYLES.COLOR_SENDER_HUMAN
      : PDF_STYLES.COLOR_SENDER_ASSISTANT;

    this.pdf.setTextColor(...color);

    // 构建发送者标签
    const senderLabel = message.sender === 'human' ? 'Human' : 'Assistant';
    const label = `${index}. ${senderLabel}`;

    // 添加分支标记
    let finalLabel = label;
    if (message.branchInfo?.isBranchPoint) {
      const branchMarker = ` [Branch ${message.branchInfo.childCount}]`;
      finalLabel = label + branchMarker;
    }

    // 清理并输出标签
    const cleanLabel = cleanText(finalLabel);
    if (cleanLabel && cleanLabel.trim().length > 0) {
      this.pdf.text(cleanLabel, PDF_STYLES.MARGIN_LEFT, this.currentY);
    }

    this.currentY += PDF_STYLES.LINE_HEIGHT * 1.2;
  }

  /**
   * 渲染时间戳
   */
  renderTimestamp(timestamp) {
    this.pdf.setFontSize(PDF_STYLES.FONT_SIZE_TIMESTAMP);
    this.pdf.setTextColor(...PDF_STYLES.COLOR_TIMESTAMP);
    this.pdf.text(timestamp, PDF_STYLES.MARGIN_LEFT, this.currentY);
    this.currentY += PDF_STYLES.LINE_HEIGHT;
  }

  /**
   * 渲染正文（LaTeX显示为源码）
   */
  renderBody(text) {
    this.pdf.setFontSize(PDF_STYLES.FONT_SIZE_BODY);
    this.pdf.setTextColor(...PDF_STYLES.COLOR_TEXT);

    const maxWidth = PDF_STYLES.PAGE_WIDTH - PDF_STYLES.MARGIN_LEFT - PDF_STYLES.MARGIN_RIGHT;

    // 处理代码块和LaTeX块
    const parts = this.manager.parseTextWithCodeBlocksAndLatex(text);

    // 渲染所有部分
    for (const part of parts) {
      if (part.type === 'code') {
        this.renderCodeBlock(part.content, part.language);
      } else if (part.type === 'latex-display') {
        this.renderLatexDisplay(part);
      } else {
        // 渲染普通文本，支持markdown格式（可能包含inline LaTeX源码）
        this.renderMarkdownText(part.content, maxWidth);
      }
    }

    // 减小正文结束后的间距
    this.currentY += PDF_STYLES.LINE_HEIGHT * 0.3;
  }


  /**
   * 获取或创建LaTeX渲染器
   */
  getLatexRenderer() {
    if (!this.latexRenderer) {
      this.latexRenderer = new LaTeXRenderer(this.pdf, {
        fontSize: PDF_STYLES.FONT_SIZE_BODY,
        color: PDF_STYLES.COLOR_TEXT,
        fontName: this.chineseFontName  // 传入支持Unicode的字体
      });
    }
    return this.latexRenderer;
  }

  /**
   * 检测文本是否包含LaTeX公式
   */
  containsLatex(text) {
    const latexPatterns = [
      /\$[^$]+\$/,           // 行内公式 $...$
      /\\\([^)]+\\\)/,       // 行内公式 \(...\)
      /\\\[[^\]]+\\\]/,      // 显示公式 \[...\]
      /\\(mathcal|mathbb|frac|sqrt|sum|int|lim|alpha|beta|gamma|delta|theta|lambda|mu|omega)/  // LaTeX命令
    ];
    return latexPatterns.some(pattern => pattern.test(text));
  }

  /**
   * 渲染LaTeX display math（块级数学公式）- 使用新的渲染器
   */
  renderLatexDisplay(part) {
    const maxWidth = PDF_STYLES.PAGE_WIDTH - PDF_STYLES.MARGIN_LEFT - PDF_STYLES.MARGIN_RIGHT;

    this.checkPageBreak(PDF_STYLES.FONT_SIZE_BODY + 30);

    try {
      // 尝试使用LaTeX渲染器
      const renderer = this.getLatexRenderer();
      const result = renderer.renderDisplayLaTeX(
        part.content,
        PDF_STYLES.MARGIN_LEFT,
        this.currentY + PDF_STYLES.FONT_SIZE_BODY,
        maxWidth
      );

      // 更新Y位置 - 减小公式间距
      this.currentY += result.height + PDF_STYLES.LINE_HEIGHT * 0.05;  // 大幅缩短间距
    } catch (error) {
      console.warn('[PDF导出] LaTeX渲染失败，回退到源码显示:', error);

      // 回退：显示LaTeX源码
      this.renderLatexDisplayAsSource(part, maxWidth);
    }
  }

  /**
   * 渲染LaTeX display math作为源码（备用方案）
   */
  renderLatexDisplayAsSource(part, maxWidth) {
    // 绘制背景（浅蓝色调表示LaTeX）
    this.pdf.setFillColor(240, 248, 255);
    this.pdf.rect(
      PDF_STYLES.MARGIN_LEFT,
      this.currentY - 3,
      maxWidth,
      PDF_STYLES.LINE_HEIGHT * 3,
      'F'
    );

    // 绘制边框（蓝色）
    this.pdf.setDrawColor(100, 150, 200);
    this.pdf.setLineWidth(0.5);
    this.pdf.roundedRect(
      PDF_STYLES.MARGIN_LEFT,
      this.currentY - 3,
      maxWidth,
      PDF_STYLES.LINE_HEIGHT * 3,
      1.5,
      1.5,
      'S'
    );

    // 显示标题
    this.pdf.setFontSize(PDF_STYLES.FONT_SIZE_BODY);
    this.pdf.setTextColor(70, 130, 180);
    this.pdf.text('[LaTeX]', PDF_STYLES.MARGIN_LEFT + 2, this.currentY);
    this.currentY += PDF_STYLES.LINE_HEIGHT;

    // 显示LaTeX源码
    this.pdf.setFont('courier', 'normal');
    this.pdf.setFontSize(PDF_STYLES.FONT_SIZE_CODE);
    this.pdf.setTextColor(50, 50, 50);

    const sourceLines = this.pdf.splitTextToSize(part.content, maxWidth - 4);
    sourceLines.forEach(line => {
      this.pdf.text(line, PDF_STYLES.MARGIN_LEFT + 2, this.currentY);
      this.currentY += PDF_STYLES.LINE_HEIGHT;
    });

    // 恢复样式
    this.pdf.setFont(this.chineseFontName, 'normal');
    this.pdf.setTextColor(...PDF_STYLES.COLOR_TEXT);
    this.currentY += PDF_STYLES.SECTION_SPACING;
  }

  /**
   * 渲染纯文本(带自动换行)
   */
  renderPlainText(text, maxWidth) {
    // 处理空文本
    if (!text || text.trim().length === 0) {
      this.currentY += PDF_STYLES.LINE_HEIGHT;
      return;
    }

    // 清理文本，防止编码问题
    const cleanedText = cleanText(text);
    
    if (!cleanedText || cleanedText.trim().length === 0) {
      console.warn('[PDF导出] 文本清理后为空，跳过');
      this.currentY += PDF_STYLES.LINE_HEIGHT;
      return;
    }

    // 使用 splitTextToSize 自动处理换行,支持Unicode字符
    let lines;
    try {
      lines = this.pdf.splitTextToSize(cleanedText, maxWidth);
    } catch (error) {
      console.error('[PDF导出] splitTextToSize失败，使用简单换行:', error);
      // 如果splitTextToSize失败,使用简单的换行逻辑
      lines = cleanedText.split('\n');
    }

    lines.forEach(line => {
      this.checkPageBreak(PDF_STYLES.FONT_SIZE_BODY);
      
      // 再次清理单行文本（防止splitTextToSize引入问题）
      const cleanLine = cleanText(line);
      if (cleanLine && cleanLine.trim().length > 0) {
        this.pdf.text(cleanLine, PDF_STYLES.MARGIN_LEFT, this.currentY);
      }
      this.currentY += PDF_STYLES.LINE_HEIGHT;
    });
  }

  /**
   * 渲染代码块（支持跨页）- 简化版，逐行渲染
   */
  renderCodeBlock(code, language = '') {
    this.checkPageBreak(PDF_STYLES.FONT_SIZE_CODE + PDF_STYLES.SECTION_SPACING * 2);

    const maxWidth = PDF_STYLES.PAGE_WIDTH - PDF_STYLES.MARGIN_LEFT - PDF_STYLES.MARGIN_RIGHT;
    const lineNumberWidth = 8;
    const codeWidth = maxWidth - lineNumberWidth - 8;
    const padding = 3;

    const cleanCode = cleanText(code);
    const cleanLanguage = cleanText(language);

    // 渲染语言标签
    if (cleanLanguage) {
      this.pdf.setFontSize(PDF_STYLES.FONT_SIZE_TIMESTAMP);
      this.pdf.setTextColor(100, 100, 100);
      const labelText = cleanLanguage.toUpperCase();
      const labelWidth = this.safeGetTextWidth(labelText) + 4;
      this.pdf.setFillColor(220, 220, 220);
      this.pdf.roundedRect(
        PDF_STYLES.MARGIN_LEFT,
        this.currentY - 3,
        labelWidth,
        5,
        1,
        1,
        'F'
      );
      this.pdf.text(labelText, PDF_STYLES.MARGIN_LEFT + 2, this.currentY);
      this.currentY += PDF_STYLES.LINE_HEIGHT * 1.2;
    }

    // 处理代码行
    this.pdf.setFontSize(PDF_STYLES.FONT_SIZE_CODE);
    this.pdf.setFont(this.chineseFontName);
    const codeLines = cleanCode.split('\n');
    const wrappedLines = [];

    codeLines.forEach(line => {
      if (!line) {
        wrappedLines.push({ text: '', lineNumber: wrappedLines.length + 1 });
        return;
      }
      const cleanLine = cleanText(line);
      if (!cleanLine) {
        wrappedLines.push({ text: '', lineNumber: wrappedLines.length + 1 });
        return;
      }

      try {
        const wrapped = this.pdf.splitTextToSize(cleanLine, codeWidth);
        wrapped.forEach((wLine, idx) => {
          wrappedLines.push({
            text: wLine,
            lineNumber: idx === 0 ? wrappedLines.length + 1 : null
          });
        });
      } catch (error) {
        wrappedLines.push({ text: cleanLine, lineNumber: wrappedLines.length + 1 });
      }
    });

    // 逐行渲染，遇到需要换页时自动换页
    const blockStartY = this.currentY;
    const blockStartPage = this.pdf.internal.getCurrentPageInfo().pageNumber;

    // 先绘制第一页的背景和边框起始部分
    const firstPageHeight = Math.min(
      wrappedLines.length * PDF_STYLES.LINE_HEIGHT + padding * 2,
      PDF_STYLES.PAGE_HEIGHT - PDF_STYLES.MARGIN_BOTTOM - this.currentY
    );
    this.pdf.setFillColor(248, 248, 248);
    this.pdf.rect(
      PDF_STYLES.MARGIN_LEFT,
      blockStartY - padding,
      maxWidth,
      firstPageHeight,
      'F'
    );

    this.currentY = blockStartY;

    wrappedLines.forEach(({ text, lineNumber }, index) => {
      // 检查是否需要换页
      if (this.currentY + PDF_STYLES.FONT_SIZE_CODE > PDF_STYLES.PAGE_HEIGHT - PDF_STYLES.MARGIN_BOTTOM) {
        // 先绘制当前页的代码块底部边框
        this.pdf.setDrawColor(200, 200, 200);
        this.pdf.setLineWidth(0.3);
        const currentPageBottom = this.currentY;
        this.pdf.line(
          PDF_STYLES.MARGIN_LEFT,
          blockStartY - padding,
          PDF_STYLES.MARGIN_LEFT,
          currentPageBottom
        );
        this.pdf.line(
          PDF_STYLES.MARGIN_LEFT + maxWidth,
          blockStartY - padding,
          PDF_STYLES.MARGIN_LEFT + maxWidth,
          currentPageBottom
        );

        // 换页
        this.pdf.addPage();
        this.currentY = PDF_STYLES.MARGIN_TOP;
        
        // 在新页绘制代码块背景（连续样式）
        const remainingLines = wrappedLines.length - index;
        const newPageHeight = Math.min(
          remainingLines * PDF_STYLES.LINE_HEIGHT + padding,
          PDF_STYLES.PAGE_HEIGHT - PDF_STYLES.MARGIN_BOTTOM - this.currentY
        );
        this.pdf.setFillColor(248, 248, 248);
        this.pdf.rect(
          PDF_STYLES.MARGIN_LEFT,
          this.currentY - padding,
          maxWidth,
          newPageHeight,
          'F'
        );
      }

      // 渲染行号
      if (lineNumber !== null) {
        this.pdf.setFontSize(PDF_STYLES.FONT_SIZE_CODE - 1);
        this.pdf.setTextColor(150, 150, 150);
        const lineNumStr = String(lineNumber).padStart(3, ' ');
        this.pdf.text(lineNumStr, PDF_STYLES.MARGIN_LEFT + 1, this.currentY);
      }

      // 渲染代码文本（支持 **粗体** 和 ### 标题）
      const safeLine = cleanText(text);
      if (safeLine !== null && safeLine !== undefined) {
        // 解析粗体和标题标记
        const segments = parseCodeLineBold(safeLine);
        const isHeading = segments.some(s => s.heading);

        // 根据标题级别设置字号和颜色
        if (isHeading) {
          const level = segments[0].heading;
          const headingSizes = [14, 13, 12, 11, 10, 10]; // H1-H6 字号
          this.pdf.setFontSize(headingSizes[level - 1] || PDF_STYLES.FONT_SIZE_CODE);
          this.pdf.setTextColor(20, 20, 20); // 深色
        } else {
          this.pdf.setFontSize(PDF_STYLES.FONT_SIZE_CODE);
          this.pdf.setTextColor(50, 50, 50);
        }

        let currentX = PDF_STYLES.MARGIN_LEFT + lineNumberWidth + 2;

        segments.forEach(segment => {
          // 标题或粗体使用bold字体
          if ((segment.heading || segment.bold) && this.availableFontWeights.includes('bold')) {
            this.pdf.setFont(this.chineseFontName, 'bold');
          } else {
            // 使用普通字体（保持中文支持）
            this.pdf.setFont(this.chineseFontName, 'normal');
          }

          this.pdf.text(segment.text, currentX, this.currentY);
          currentX += this.safeGetTextWidth(segment.text);
        });

        // 恢复默认字体和字号
        this.pdf.setFont(this.chineseFontName, 'normal');
        this.pdf.setFontSize(PDF_STYLES.FONT_SIZE_CODE);
        this.pdf.setTextColor(50, 50, 50);
      }
      this.currentY += PDF_STYLES.LINE_HEIGHT;
    });

    // 绘制最后的边框和行号分隔线
    const endPage = this.pdf.internal.getCurrentPageInfo().pageNumber;
    
    // 如果跨页，需要在每一页绘制边框
    for (let page = blockStartPage; page <= endPage; page++) {
      this.pdf.setPage(page);
      const isFirst = (page === blockStartPage);
      const isLast = (page === endPage);
      
      let boxStartY, boxEndY;
      if (isFirst && isLast) {
        // 单页代码块
        boxStartY = blockStartY - padding;
        boxEndY = this.currentY + padding;
      } else if (isFirst) {
        // 第一页
        boxStartY = blockStartY - padding;
        boxEndY = PDF_STYLES.PAGE_HEIGHT - PDF_STYLES.MARGIN_BOTTOM;
      } else if (isLast) {
        // 最后一页
        boxStartY = PDF_STYLES.MARGIN_TOP - padding;
        boxEndY = this.currentY + padding;
      } else {
        // 中间页
        boxStartY = PDF_STYLES.MARGIN_TOP - padding;
        boxEndY = PDF_STYLES.PAGE_HEIGHT - PDF_STYLES.MARGIN_BOTTOM;
      }
      
      // 绘制边框
      this.pdf.setDrawColor(200, 200, 200);
      this.pdf.setLineWidth(0.3);
      if (isFirst && isLast) {
        this.pdf.roundedRect(PDF_STYLES.MARGIN_LEFT, boxStartY, maxWidth, boxEndY - boxStartY, 1.5, 1.5, 'S');
      } else {
        this.pdf.line(PDF_STYLES.MARGIN_LEFT, boxStartY, PDF_STYLES.MARGIN_LEFT, boxEndY);
        this.pdf.line(PDF_STYLES.MARGIN_LEFT + maxWidth, boxStartY, PDF_STYLES.MARGIN_LEFT + maxWidth, boxEndY);
        if (isFirst) {
          this.pdf.line(PDF_STYLES.MARGIN_LEFT, boxStartY, PDF_STYLES.MARGIN_LEFT + maxWidth, boxStartY);
        }
        if (isLast) {
          this.pdf.line(PDF_STYLES.MARGIN_LEFT, boxEndY, PDF_STYLES.MARGIN_LEFT + maxWidth, boxEndY);
        }
      }
      
      // 绘制行号分隔线
      this.pdf.setDrawColor(220, 220, 220);
      this.pdf.setLineWidth(0.2);
      this.pdf.line(
        PDF_STYLES.MARGIN_LEFT + lineNumberWidth,
        boxStartY,
        PDF_STYLES.MARGIN_LEFT + lineNumberWidth,
        boxEndY
      );
    }

    // 确保回到最后一页
    this.pdf.setPage(endPage);
    
    // 恢复默认样式
    this.pdf.setFont(this.chineseFontName);
    this.pdf.setTextColor(...PDF_STYLES.COLOR_TEXT);
    this.currentY += PDF_STYLES.SECTION_SPACING;
  }

  /**
   * 解析markdown格式的文本并渲染（包括LaTeX源码）
   */
  renderMarkdownText(text, maxWidth) {
    if (!text || text.trim().length === 0) {
      this.currentY += PDF_STYLES.LINE_HEIGHT;
      return;
    }

    const cleanedText = cleanText(text);
    if (!cleanedText || cleanedText.trim().length === 0) {
      this.currentY += PDF_STYLES.LINE_HEIGHT;
      return;
    }

    // 按行处理文本
    const lines = cleanedText.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      this.checkPageBreak(PDF_STYLES.FONT_SIZE_BODY);

      // 处理不同类型的行
      if (line.trim() === '') {
        // 空行
        this.currentY += PDF_STYLES.LINE_HEIGHT;
      } else if (line.match(/^#{1,6}\s/)) {
        // 标题
        this.renderMarkdownHeading(line, maxWidth);
      } else if (line.match(/^(---|___|\*\*\*)$/)) {
        // 水平分隔线（---, ___, 或 ***）
        this.renderHorizontalRule(maxWidth);
      } else if (line.match(/^>\s/)) {
        // 引用
        this.renderMarkdownQuote(line, maxWidth);
      } else if (line.match(/^\|.*\|/)) {
        // 表格行 - 收集连续的表格行
        const tableLines = [line];
        while (i + 1 < lines.length && lines[i + 1].match(/^\|.*\|/)) {
          i++;
          tableLines.push(lines[i]);
        }
        this.renderTable(tableLines);
      } else if ((line.match(/^[-*+]\s/) || line.match(/^\d+\.\s/)) && this.containsLatex(line)) {
        // 包含LaTeX的列表项：去掉前缀并添加缩进渲染
        this.renderLatexListItem(line, maxWidth);
      } else if (line.match(/^[-*+]\s/) || line.match(/^\d+\.\s/)) {
        // 普通列表
        this.renderMarkdownList(line, maxWidth);
      } else {
        // 普通文本（可能包含行内格式和LaTeX）
        this.renderMarkdownInlineFormats(line, maxWidth);
      }
    }
  }

  /**
   * 渲染包含LaTeX的列表项（不修改全局状态）
   */
  renderLatexListItem(line, maxWidth) {
    const { LIST_INDENT_PER_LEVEL } = RENDER_CONSTANTS;
    
    // 去掉开头的列表标记
    const cleanedLine = line.replace(/^[-*+]\s+/, '').replace(/^\d+\.\s+/, '');
    const indentX = PDF_STYLES.MARGIN_LEFT + LIST_INDENT_PER_LEVEL;
    const adjustedWidth = maxWidth - LIST_INDENT_PER_LEVEL;

    // 使用行内格式化文本渲染（传递偏移量而非修改全局状态）
    this.renderMarkdownInlineFormatsWithOffset(cleanedLine, adjustedWidth, indentX);
  }

  /**
   * 渲染水平分隔线
   */
  renderHorizontalRule(maxWidth) {
    // 上方留白
    this.currentY += PDF_STYLES.LINE_HEIGHT * 0.8;

    const lineY = this.currentY;

    // 绘制水平线 - 使用更淡的颜色和更细的线条
    this.pdf.setDrawColor(230, 230, 230);  // 浅灰色，不突兀
    this.pdf.setLineWidth(0.2);  // 细线
    this.pdf.line(
      PDF_STYLES.MARGIN_LEFT,
      lineY,
      PDF_STYLES.MARGIN_LEFT + maxWidth,
      lineY
    );

    // <hr/> 下方留白（给下面内容足够间隔）
    this.currentY += PDF_STYLES.LINE_HEIGHT * 4;
  }

  /**
   * 渲染markdown标题
   */
  renderMarkdownHeading(line, maxWidth) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (!match) {
      this.renderPlainText(line, maxWidth);
      return;
    }

    const level = match[1].length;
    const text = match[2];

    // 根据标题级别设置字体大小
    const fontSize = PDF_STYLES.FONT_SIZE_BODY + (7 - level) * 2;
    const oldFontSize = this.pdf.internal.getFontSize();

    this.pdf.setFontSize(fontSize);
    // 使用粗体字体（如果可用）
    this.safeSetFont(this.chineseFontName, 'bold');

    try {
      const lines = this.pdf.splitTextToSize(text, maxWidth);
      lines.forEach(l => {
        this.checkPageBreak(fontSize);
        const cleanLine = cleanText(l);
        if (cleanLine && cleanLine.trim().length > 0) {
          this.pdf.text(cleanLine, PDF_STYLES.MARGIN_LEFT, this.currentY);
        }
        this.currentY += PDF_STYLES.LINE_HEIGHT * 1.2;
      });
    } catch (error) {
      console.error('[PDF导出] 标题渲染失败:', error);
      this.pdf.text(text, PDF_STYLES.MARGIN_LEFT, this.currentY);
      this.currentY += PDF_STYLES.LINE_HEIGHT * 1.2;
    }

    // 恢复字体
    this.pdf.setFontSize(oldFontSize);
    this.safeSetFont(this.chineseFontName, 'normal');

    this.currentY += PDF_STYLES.LINE_HEIGHT * 0.5; // 标题后额外间距
  }

  /**
   * 渲染markdown引用（支持内部格式，不修改全局状态）
   */
  renderMarkdownQuote(line, maxWidth) {
    const { QUOTE_INDENT, QUOTE_LINE_WIDTH } = RENDER_CONSTANTS;
    
    const text = line.replace(/^>\s*/, '');
    const quoteWidth = maxWidth - QUOTE_INDENT - 2;
    const quoteX = PDF_STYLES.MARGIN_LEFT + QUOTE_INDENT;

    // 绘制左侧竖线
    this.pdf.setDrawColor(150, 150, 150);
    this.pdf.setLineWidth(QUOTE_LINE_WIDTH);

    const startY = this.currentY - 2;

    // 使用行内格式化渲染（传递偏移量而非修改全局状态）
    this.pdf.setFontSize(PDF_STYLES.FONT_SIZE_BODY);
    this.pdf.setTextColor(100, 100, 100);

    this.renderMarkdownInlineFormatsWithOffset(text, quoteWidth, quoteX);

    // 绘制引用线
    this.pdf.line(
      PDF_STYLES.MARGIN_LEFT + 2,
      startY,
      PDF_STYLES.MARGIN_LEFT + 2,
      this.currentY - 2
    );

    // 恢复颜色
    this.pdf.setTextColor(...PDF_STYLES.COLOR_TEXT);
  }

  /**
   * 渲染Markdown表格（支持跨页续表头）
   */
  renderTable(tableLines) {
    if (!tableLines || tableLines.length < 2) return;

    const { TABLE_CELL_PADDING, TABLE_HEADER_BG, LINE_HEIGHT_TABLE_ROW } = RENDER_CONSTANTS;
    const maxWidth = PDF_STYLES.PAGE_WIDTH - PDF_STYLES.MARGIN_LEFT - PDF_STYLES.MARGIN_RIGHT;

    // 解析表格行
    const rows = [];
    let headerRow = null;

    tableLines.forEach((line, idx) => {
      // 跳过分隔行 - 检查单元格内容是否只包含-和:
      const checkCells = line.split('|').filter((c, i, arr) => i > 0 && i < arr.length - 1);
      const isSeparator = checkCells.length > 0 && checkCells.every(cell => /^[\s\-:]+$/.test(cell));
      if (isSeparator) {
        return;
      }

      const cells = line
        .split('|')
        .map(cell => cell.trim())
        .filter((cell, i, arr) => i > 0 && i < arr.length - 1);

      if (cells.length > 0) {
        const isHeaderRow = (idx === 0);
        const rowData = { cells, isHeader: isHeaderRow };
        rows.push(rowData);
        
        // 保存表头行以便跨页时重绘
        if (isHeaderRow) {
          headerRow = rowData;
        }
      }
    });

    if (rows.length === 0) return;

    const colCount = Math.max(...rows.map(r => r.cells.length));
    const cellWidth = maxWidth / colCount;
    const rowHeight = PDF_STYLES.LINE_HEIGHT * LINE_HEIGHT_TABLE_ROW;

    this.pdf.setDrawColor(200, 200, 200);
    this.pdf.setLineWidth(0.3);

    /**
     * 渲染单行的辅助函数
     */
    const renderTableRow = (row, rowStartY) => {
      row.cells.forEach((cell, colIdx) => {
        const cellX = PDF_STYLES.MARGIN_LEFT + colIdx * cellWidth;

        // 表头背景
        if (row.isHeader) {
          this.pdf.setFillColor(...TABLE_HEADER_BG);
          this.pdf.rect(cellX, rowStartY, cellWidth, rowHeight, 'F');
        }

        // 绘制单元格边框
        this.pdf.setDrawColor(200, 200, 200);
        this.pdf.rect(cellX, rowStartY, cellWidth, rowHeight, 'S');

        // 处理单元格内容（LaTeX和Markdown）
        const processedText = this.processCellContent(cell);

        this.pdf.setFontSize(PDF_STYLES.FONT_SIZE_BODY);
        if (row.isHeader) {
          this.safeSetFont(this.chineseFontName, 'bold');
          this.pdf.setTextColor(0, 0, 0);
        } else {
          this.safeSetFont(this.chineseFontName, 'normal');
          this.pdf.setTextColor(50, 50, 50);
        }

        // 截断过长文本
        const maxTextWidth = cellWidth - TABLE_CELL_PADDING * 2;
        const truncatedText = this.truncateText(processedText, maxTextWidth);

        // 文本垂直居中：单元格中心 + 字体基线偏移
        const textY = rowStartY + rowHeight / 2 + PDF_STYLES.FONT_SIZE_BODY * 0.15;
        this.pdf.text(truncatedText, cellX + TABLE_CELL_PADDING, textY);
      });
    };

    // 渲染所有行
    rows.forEach((row, rowIdx) => {
      // 检查是否需要换页
      const needsPageBreak = this.currentY + rowHeight > PDF_STYLES.PAGE_HEIGHT - PDF_STYLES.MARGIN_BOTTOM;
      
      if (needsPageBreak && rowIdx > 0) {
        // 换页
        this.pdf.addPage();
        this.currentY = PDF_STYLES.MARGIN_TOP;
        
        // 在新页顶部重绘表头（续表）
        if (headerRow) {
          // 添加“续表”标记
          this.pdf.setFontSize(PDF_STYLES.FONT_SIZE_TIMESTAMP);
          this.pdf.setTextColor(150, 150, 150);
          this.pdf.text('(续表)', PDF_STYLES.MARGIN_LEFT, this.currentY);
          this.currentY += PDF_STYLES.LINE_HEIGHT * 0.8;
          
          // 重绘表头
          renderTableRow(headerRow, this.currentY);
          this.currentY += rowHeight;
        }
      }
      
      const rowStartY = this.currentY;
      renderTableRow(row, rowStartY);
      this.currentY = rowStartY + rowHeight;
    });

    this.safeSetFont(this.chineseFontName, 'normal');
    this.pdf.setTextColor(...PDF_STYLES.COLOR_TEXT);
    this.currentY += PDF_STYLES.SECTION_SPACING;
  }

  /**
   * 处理表格单元格内容
   */
  processCellContent(cellText) {
    if (!cellText) return '';

    let result = cellText;

    // 处理行内LaTeX
    result = result.replace(/\$([^$]+)\$/g, (match, latex) => {
      try {
        const renderer = this.getLatexRenderer();
        return renderer.simplifyLaTeX(latex);
      } catch (e) {
        return latex;
      }
    });

    // 处理粗体
    result = result.replace(/\*\*([^*]+)\*\*/g, '$1');
    result = result.replace(/__([^_]+)__/g, '$1');

    // 处理斜体
    result = result.replace(/\*([^*]+)\*/g, '$1');
    result = result.replace(/_([^_]+)_/g, '$1');

    // 处理行内代码
    result = result.replace(/`([^`]+)`/g, '$1');

    return cleanText(result);
  }

  /**
   * 截断过长文本
   */
  truncateText(text, maxWidth) {
    if (!text) return '';
    const textWidth = this.safeGetTextWidth(text);
    if (textWidth <= maxWidth) return text;

    let truncated = text;
    while (truncated.length > 0 && this.safeGetTextWidth(truncated + '...') > maxWidth) {
      truncated = truncated.slice(0, -1);
    }
    return truncated + '...';
  }

  /**
   * 渲染markdown列表（包括LaTeX源码，支持嵌套列表）
   * @param {string} line - 列表行文本
   * @param {number} maxWidth - 最大宽度
   * @param {number} indentLevel - 缩进级别（默认0）
   */
  renderMarkdownList(line, maxWidth, indentLevel = 0) {
    const { LIST_INDENT_PER_LEVEL, LIST_BULLET_OFFSET } = RENDER_CONSTANTS;
    
    let bullet = '';
    let text = '';

    // 检测列表类型（支持前导空格缩进）
    const unorderedMatch = line.match(/^(\s*)([-*+])\s+(.+)$/);
    const orderedMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/);

    if (unorderedMatch) {
      // 根据前导空格计算缩进级别（2空格 = 1级）
      const leadingSpaces = unorderedMatch[1].length;
      indentLevel = Math.floor(leadingSpaces / 2);
      
      // 根据级别选择不同的项目符号
      const bullets = ['•', '◦', '▪', '▫'];  // 实心圆、空心圆、实心方、空心方
      bullet = bullets[indentLevel % bullets.length];
      text = unorderedMatch[3];
    } else if (orderedMatch) {
      const leadingSpaces = orderedMatch[1].length;
      indentLevel = Math.floor(leadingSpaces / 2);
      
      bullet = orderedMatch[2] + '.';
      text = orderedMatch[3];
    } else {
      this.renderPlainText(line, maxWidth);
      return;
    }

    // 计算缩进后的左边距（不修改全局状态）
    const indentX = PDF_STYLES.MARGIN_LEFT + (indentLevel * LIST_INDENT_PER_LEVEL);
    const bulletWidth = this.safeGetTextWidth(bullet + '  ');
    const textX = indentX + bulletWidth;
    const textWidth = maxWidth - (indentLevel * LIST_INDENT_PER_LEVEL) - bulletWidth;

    // 渲染项目符号
    this.pdf.setFontSize(PDF_STYLES.FONT_SIZE_BODY);
    this.pdf.text(bullet, indentX + LIST_BULLET_OFFSET, this.currentY);

    // 解析并渲染带格式的文本（使用局部变量而非修改全局状态）
    try {
      const segments = parseInlineMarkdown(text);
      // 传递起始位置而不是修改全局MARGIN_LEFT
      this.renderInlineSegmentsWithOffset(segments, textWidth, textX);
    } catch (error) {
      console.error('[PDF导出] 列表渲染失败:', error);
      this.pdf.text(text, textX, this.currentY);
      this.currentY += PDF_STYLES.LINE_HEIGHT;
    }
  }

  /**
   * 渲染包含行内格式的markdown文本（包括LaTeX源码）
   */
  renderMarkdownInlineFormats(line, maxWidth) {
    this.renderMarkdownInlineFormatsWithOffset(line, maxWidth, PDF_STYLES.MARGIN_LEFT);
  }
  
  /**
   * 渲染包含行内格式的markdown文本（带偏移，不修改全局状态）
   * @param {string} line - 文本行
   * @param {number} maxWidth - 最大宽度
   * @param {number} startX - 起始X坐标
   */
  renderMarkdownInlineFormatsWithOffset(line, maxWidth, startX) {
    if (!line || line.trim().length === 0) {
      this.currentY += PDF_STYLES.LINE_HEIGHT;
      return;
    }

    // 解析行内格式（包括LaTeX）
    const segments = parseInlineMarkdown(line);

    // 按行渲染segments（包括LaTeX），传递偏移量
    this.renderInlineSegmentsWithOffset(segments, maxWidth, startX);
  }

  /**
   * 展平嵌套的segments结构
   */
  flattenSegments(segments, parentType = null) {
    const result = [];

    segments.forEach(segment => {
      if (segment.children) {
        // 递归处理子节点，传递父类型
        const childSegments = this.flattenSegments(segment.children, segment.type);
        result.push(...childSegments);
      } else {
        // 叶子节点
        if (parentType) {
          result.push({
            ...segment,
            type: this.mergeSegmentTypes(parentType, segment.type)
          });
        } else {
          result.push(segment);
        }
      }
    });

    return result;
  }

  /**
   * 合并父子类型
   */
  mergeSegmentTypes(parentType, childType) {
    if (childType === 'normal') {
      return parentType;
    }

    if ((parentType === 'bold' && childType === 'italic') ||
        (parentType === 'italic' && childType === 'bold')) {
      return 'bold-italic';
    }

    return childType;
  }

  /**
   * 渲染行内格式的文本片段（包括LaTeX源码）
   */
  renderInlineSegments(segments, maxWidth) {
    this.renderInlineSegmentsWithOffset(segments, maxWidth, PDF_STYLES.MARGIN_LEFT);
  }
  
  /**
   * 渲染行内格式的文本片段（带偏移，不修改全局状态）
   * @param {Array} segments - 文本片段数组
   * @param {number} maxWidth - 最大宽度
   * @param {number} startX - 起始X坐标
   */
  renderInlineSegmentsWithOffset(segments, maxWidth, startX) {
    // 先展平嵌套结构
    const flatSegments = this.flattenSegments(segments);
    
    let currentX = startX;
    let currentLineSegments = [];

    flatSegments.forEach((segment, idx) => {
      // 对于LaTeX，需要先转换为Unicode来计算实际渲染宽度
      let text;
      let textWidth;

      if (segment.type === 'latex-inline') {
        // 使用LaTeX渲染器的simplifyLaTeX方法转换为Unicode
        const renderer = this.getLatexRenderer();
        text = renderer.simplifyLaTeX(segment.text);
        // 计算转换后Unicode文本的宽度
        this.applySegmentStyle(segment.type);
        textWidth = this.safeGetTextWidth(text);
      } else {
        text = cleanText(segment.text || '');
        if (!text) return;
        // 设置样式并测量宽度
        this.applySegmentStyle(segment.type);
        textWidth = this.safeGetTextWidth(text);
      }

      const availableWidth = PDF_STYLES.PAGE_WIDTH - PDF_STYLES.MARGIN_RIGHT - currentX;

      // 如果单个 segment 本身就超过可用宽度，需要拆分
      if (textWidth > availableWidth && currentLineSegments.length === 0) {
        // LaTeX公式不应被分割，直接渲染（即使超出边界）
        if (segment.type === 'latex-inline') {
          console.warn('[PDF导出] LaTeX公式过长，保持完整渲染:', segment.text);
          const segmentData = {
            ...segment,
            x: currentX
          };
          currentLineSegments.push(segmentData);
          currentX += textWidth;
          return;
        }

        // 这是新行的第一个 segment，但它太长了
        // 尝试使用 splitTextToSize 拆分
        try {
          const maxSegmentWidth = PDF_STYLES.PAGE_WIDTH - PDF_STYLES.MARGIN_LEFT - PDF_STYLES.MARGIN_RIGHT;
          let splitLines = this.pdf.splitTextToSize(text, maxSegmentWidth);
          // 应用中文标点避头尾规则
          splitLines = applyCJKPunctuationRules(splitLines);

          // 渲染除最后一行外的所有行
          for (let i = 0; i < splitLines.length - 1; i++) {
            this.checkPageBreak(PDF_STYLES.FONT_SIZE_BODY);
            currentLineSegments = [{
              ...segment,
              x: PDF_STYLES.MARGIN_LEFT,
              text: splitLines[i]
            }];
            this.renderSegmentLine(currentLineSegments);
            this.currentY += PDF_STYLES.LINE_HEIGHT;
          }

          // 最后一行准备与后续 segment 合并
          const lastLine = splitLines[splitLines.length - 1];
          const lastLineWidth = this.safeGetTextWidth(lastLine);
          currentLineSegments = [{
            ...segment,
            x: PDF_STYLES.MARGIN_LEFT,
            text: lastLine
          }];
          currentX = PDF_STYLES.MARGIN_LEFT + lastLineWidth;
        } catch (error) {
          console.warn('[PDF导出] 文本拆分失败，强制换行:', error);
          // 如果拆分失败，直接渲染（可能会超出边界，但至少不会崩溃）
          const segmentData = {
            ...segment,
            x: currentX
          };
          if (segment.type !== 'latex-inline') {
            segmentData.text = text;
          }
          currentLineSegments.push(segmentData);
          currentX += textWidth;
        }
        return;
      }

      // 检查是否需要换行
      if (currentX + textWidth > PDF_STYLES.PAGE_WIDTH - PDF_STYLES.MARGIN_RIGHT && currentLineSegments.length > 0) {
        // 先检查是否需要分页
        this.checkPageBreak(PDF_STYLES.FONT_SIZE_BODY);

        // 渲染当前行
        this.renderSegmentLine(currentLineSegments);
        this.currentY += PDF_STYLES.LINE_HEIGHT;

        // 重置行状态
        currentX = PDF_STYLES.MARGIN_LEFT;
        currentLineSegments = [];

        // 重新检查新行上这个 segment 是否超出边界
        if (textWidth > maxWidth) {
          // LaTeX公式不应被分割
          if (segment.type === 'latex-inline') {
            console.warn('[PDF导出] LaTeX公式过长（换行后仍超宽），保持完整渲染:', segment.text);
            currentLineSegments = [{
              ...segment,
              x: PDF_STYLES.MARGIN_LEFT
            }];
            currentX = PDF_STYLES.MARGIN_LEFT + textWidth;
            return;
          }

          // 即使在新行，segment 仍然太长，需要拆分
          try {
            let splitLines = this.pdf.splitTextToSize(text, maxWidth);
            // 应用中文标点避头尾规则
            splitLines = applyCJKPunctuationRules(splitLines);
            for (let i = 0; i < splitLines.length - 1; i++) {
              this.checkPageBreak(PDF_STYLES.FONT_SIZE_BODY);
              const tempSegments = [{
                ...segment,
                x: PDF_STYLES.MARGIN_LEFT,
                text: splitLines[i]
              }];
              this.renderSegmentLine(tempSegments);
              this.currentY += PDF_STYLES.LINE_HEIGHT;
            }
            // 最后一行
            const lastLine = splitLines[splitLines.length - 1];
            const lastLineWidth = this.safeGetTextWidth(lastLine);
            currentLineSegments = [{
              ...segment,
              x: PDF_STYLES.MARGIN_LEFT,
              text: lastLine
            }];
            currentX = PDF_STYLES.MARGIN_LEFT + lastLineWidth;
          } catch (error) {
            console.warn('[PDF导出] 文本拆分失败:', error);
            const segmentData = {
              ...segment,
              x: currentX
            };
            if (segment.type !== 'latex-inline') {
              segmentData.text = text;
            }
            currentLineSegments.push(segmentData);
            currentX += textWidth;
          }
          return;
        }
      }

      // 添加到当前行
      // 注意：对于latex-inline类型，保留原始的segment.text（不含$符号）
      // 对于其他类型，使用清理后的text
      const segmentData = {
        ...segment,
        x: currentX
      };
      // 只有非LaTeX类型才覆盖text字段
      if (segment.type !== 'latex-inline') {
        segmentData.text = text;
      }
      currentLineSegments.push(segmentData);
      currentX += textWidth;
    });

    // 渲染最后一行
    if (currentLineSegments.length > 0) {
      this.checkPageBreak(PDF_STYLES.FONT_SIZE_BODY);
      this.renderSegmentLine(currentLineSegments);
      this.currentY += PDF_STYLES.LINE_HEIGHT;
    }

    // 恢复默认样式
    this.pdf.setFont(this.chineseFontName, 'normal');
    this.pdf.setTextColor(...PDF_STYLES.COLOR_TEXT);
  }

  /**
   * 渲染一行 segment（支持行内 LaTeX）
   */
  renderSegmentLine(segments) {
    segments.forEach(segment => {
      this.applySegmentStyle(segment.type);

      if (segment.type === 'latex-inline') {
        try {
          const renderer = this.getLatexRenderer();
          renderer.renderInlineLaTeX(
            segment.text,
            segment.x,
            this.currentY,
            PDF_STYLES.PAGE_WIDTH - PDF_STYLES.MARGIN_RIGHT - segment.x
          );
        } catch (error) {
          console.warn('[PDF导出] 行内LaTeX渲染失败，显示源码:', error);
          this.pdf.text(segment.text, segment.x, this.currentY);
        }
      } else if (segment.type === 'link') {
        this.pdf.textWithLink(segment.text, segment.x, this.currentY, {
          url: segment.url || '#'
        });
        const textWidth = this.safeGetTextWidth(segment.text);
        this.pdf.line(segment.x, this.currentY + 0.5, segment.x + textWidth, this.currentY + 0.5);
      } else if (segment.type === 'code') {
        const textWidth = this.safeGetTextWidth(segment.text);
        const padding = 1;
        this.pdf.setFillColor(245, 245, 245);
        this.pdf.rect(segment.x - padding, this.currentY - 3, textWidth + padding * 2, 4, 'F');
        this.pdf.text(segment.text, segment.x, this.currentY);
      } else {
        this.pdf.text(segment.text, segment.x, this.currentY);
      }
    });
  }

  /**
   * 应用segment样式（包括LaTeX源码样式）
   */
  applySegmentStyle(type) {
    this.pdf.setFontSize(PDF_STYLES.FONT_SIZE_BODY);
    this.pdf.setTextColor(...PDF_STYLES.COLOR_TEXT);

    switch (type) {
      case 'latex-inline':
        // LaTeX使用斜体字体（如果使用渲染器失败才会用到这个样式）
        try {
          this.pdf.setFont(this.chineseFontName, 'italic');
        } catch (e) {
          this.pdf.setFont(this.chineseFontName, 'normal');
        }
        this.pdf.setFontSize(PDF_STYLES.FONT_SIZE_BODY);
        this.pdf.setTextColor(50, 50, 50); // 深灰色
        break;
      case 'latex-display':
        // Display LaTeX (handled separately in renderLatexDisplay)
        break;
      case 'bold':
        console.log('[PDF导出] 应用粗体样式, 字体:', this.chineseFontName, '可用变体:', this.availableFontWeights);
        // 使用粗体字体（如果可用，否则自动回退）
        const boldSuccess = this.safeSetFont(this.chineseFontName, 'bold');
        console.log('[PDF导出] safeSetFont 返回:', boldSuccess);
        if (!boldSuccess) {
          // 如果粗体字体不可用，使用明显的视觉区分
          console.warn('[PDF导出] 粗体字体不可用，使用视觉回退方案: 深蓝色 RGB(20,20,150) + 字体大小', PDF_STYLES.FONT_SIZE_BODY + 1);
          // 使用深蓝色 + 增大字体来明显区分粗体
          this.pdf.setTextColor(20, 20, 150); // 深蓝色，非常明显
          this.pdf.setFontSize(PDF_STYLES.FONT_SIZE_BODY + 1); // 增加1pt，更明显
        } else {
          console.log('[PDF导出] 使用字体粗体变体');
        }
        break;
      case 'italic':
        // 使用 light 字体表示斜体（中文字体通常没有真正的斜体）
        const lightSuccess = this.safeSetFont(this.chineseFontName, 'light');
        if (!lightSuccess) {
          // 如果没有 light，用颜色区分
          this.pdf.setTextColor(70, 130, 180); // 蓝色表示强调
        }
        break;
      case 'bold-italic':
        // 粗斜体：尝试使用 bold，如果没有则用 normal + 颜色
        const boldItalicSuccess = this.safeSetFont(this.chineseFontName, 'bolditalic');
        if (!boldItalicSuccess) {
          // 回退：尝试只用 bold
          const boldOnlySuccess = this.safeSetFont(this.chineseFontName, 'bold');
          if (!boldOnlySuccess) {
            // bold 也不可用，使用深蓝色区分
            this.pdf.setTextColor(30, 60, 120); // 深蓝色（粗体+斜体）
            this.pdf.setFontSize(PDF_STYLES.FONT_SIZE_BODY + 0.5);
          } else {
            // bold 可用，添加颜色表示斜体
            this.pdf.setTextColor(70, 130, 180); // 蓝色表示斜体
          }
        }
        break;
      case 'code':
        this.pdf.setFont('courier', 'normal');
        this.pdf.setFontSize(PDF_STYLES.FONT_SIZE_CODE);
        this.pdf.setTextColor(220, 50, 50);
        break;
      case 'link':
        // 使用 light 字体和蓝色表示链接
        const linkLightSuccess = this.safeSetFont(this.chineseFontName, 'light');
        if (!linkLightSuccess) {
          this.safeSetFont(this.chineseFontName, 'normal');
        }
        this.pdf.setTextColor(0, 102, 204); // 蓝色
        break;
      default:
        this.safeSetFont(this.chineseFontName, 'normal');
    }
  }

  /**
   * 渲染thinking区块
   */
  renderThinking(thinking) {
    this.renderSection('💭 Thinking', thinking, PDF_STYLES.COLOR_SECTION_BG);
  }

  /**
   * 渲染Artifact
   */
  renderArtifact(artifact) {
    const title = `📄 Artifact: ${artifact.title || 'Untitled'}`;
    const content = artifact.content || '';
    this.renderSection(title, content, PDF_STYLES.COLOR_SECTION_BG);
  }

  /**
   * 渲染工具调用
   */
  renderTool(tool) {
    const title = `🔧 Tool: ${tool.name || 'Unknown'}`;
    const content = `Input: ${JSON.stringify(tool.input, null, 2)}\n\nOutput: ${tool.output || 'N/A'}`;
    this.renderSection(title, content, PDF_STYLES.COLOR_SECTION_BG);
  }

  /**
   * 渲染引用
   */
  renderCitations(citations) {
    const title = '📚 Citations';
    const content = citations.map((cit, i) =>
      `[${i + 1}] ${cit.title || cit.url || 'Unknown'}`
    ).join('\n');
    this.renderSection(title, content, PDF_STYLES.COLOR_SECTION_BG);
  }

  /**
   * 渲染附件
   */
  renderAttachments(attachments) {
    const title = '📎 Attachments';
    const content = attachments.map((att, i) =>
      `[${i + 1}] ${att.file_name || att.name || 'file'} (${att.file_type || att.type || 'unknown'})`
    ).join('\n');
    this.renderSection(title, content, PDF_STYLES.COLOR_SECTION_BG);
  }

  /**
   * 通用区块渲染(带背景)
   */
  renderSection(title, content, bgColor) {
    this.checkPageBreak(PDF_STYLES.FONT_SIZE_H2 + PDF_STYLES.SECTION_SPACING * 2);

    const maxWidth = PDF_STYLES.PAGE_WIDTH - PDF_STYLES.MARGIN_LEFT - PDF_STYLES.MARGIN_RIGHT;
    
    // 清理标题和内容
    const cleanTitle = cleanText(title);
    const cleanContent = cleanText(content);
    
    // 处理内容换行,带错误处理
    let contentLines;
    try {
      contentLines = this.pdf.splitTextToSize(cleanContent, maxWidth - 4);
    } catch (error) {
      console.error('[PDF导出] 区块内容分割失败:', error);
      contentLines = cleanContent.split('\n');
    }
    
    const bgHeight = PDF_STYLES.LINE_HEIGHT * (contentLines.length + 2);

    // 绘制背景
    this.pdf.setFillColor(...bgColor);
    this.pdf.rect(
      PDF_STYLES.MARGIN_LEFT,
      this.currentY - 3,
      maxWidth,
      bgHeight,
      'F'
    );

    // 渲染标题
    this.pdf.setFontSize(PDF_STYLES.FONT_SIZE_H2);
    this.pdf.setTextColor(...PDF_STYLES.COLOR_TEXT);
    if (cleanTitle && cleanTitle.trim().length > 0) {
      this.pdf.text(cleanTitle, PDF_STYLES.MARGIN_LEFT + 2, this.currentY);
    }
    this.currentY += PDF_STYLES.LINE_HEIGHT * 1.2;

    // 渲染内容
    this.pdf.setFontSize(PDF_STYLES.FONT_SIZE_BODY);
    contentLines.forEach(line => {
      this.checkPageBreak(PDF_STYLES.FONT_SIZE_BODY);
      const cleanLine = cleanText(line);
      if (cleanLine && cleanLine.trim().length > 0) {
        this.pdf.text(cleanLine, PDF_STYLES.MARGIN_LEFT + 2, this.currentY);
      }
      this.currentY += PDF_STYLES.LINE_HEIGHT;
    });

    this.currentY += PDF_STYLES.SECTION_SPACING;
  }

  /**
   * 渲染目录（Table of Contents）带页码链接
   */
  renderTOCWithLinks(tocPage, messages) {
    // 切换到目录页
    this.pdf.setPage(tocPage);
    this.currentY = PDF_STYLES.MARGIN_TOP;

    // 渲染目录标题
    this.pdf.setFontSize(PDF_STYLES.FONT_SIZE_H1);
    this.pdf.setTextColor(...PDF_STYLES.COLOR_TEXT);
    this.pdf.text('Table of Contents', PDF_STYLES.MARGIN_LEFT, this.currentY);
    this.currentY += PDF_STYLES.LINE_HEIGHT * 2;

    // 绘制标题下方的分隔线
    this.pdf.setDrawColor(...PDF_STYLES.COLOR_BORDER);
    this.pdf.setLineWidth(0.3);
    this.pdf.line(
      PDF_STYLES.MARGIN_LEFT,
      this.currentY,
      PDF_STYLES.PAGE_WIDTH - PDF_STYLES.MARGIN_RIGHT,
      this.currentY
    );
    this.currentY += PDF_STYLES.LINE_HEIGHT;

    // 渲染消息列表
    this.pdf.setFontSize(PDF_STYLES.FONT_SIZE_BODY);
    const maxWidth = PDF_STYLES.PAGE_WIDTH - PDF_STYLES.MARGIN_LEFT - PDF_STYLES.MARGIN_RIGHT;

    this.manager.messageAnchors.forEach((anchor, idx) => {
      const message = messages[idx];
      if (!message) return;

      this.checkPageBreak(PDF_STYLES.FONT_SIZE_BODY * 2);

      const messageNumber = `${anchor.index}.`;
      const sender = anchor.sender === 'human' ? 'Human' : 'Assistant';

      // 获取消息预览（前50个字符）
      let preview = anchor.title || '';
      preview = cleanText(preview);
      preview = preview.replace(/\n/g, ' ').substring(0, 50);
      if (preview.length >= 50) {
        preview += '...';
      }

      // 添加分支标记
      let branchMarker = '';
      if (message.branchInfo?.isBranchPoint) {
        branchMarker = ` [Branch ${message.branchInfo.childCount}]`;
      }

      // 构建目录条目和页码
      const entry = `${messageNumber} ${sender}${branchMarker}`;
      const pageNum = `p.${anchor.page}`;

      // 设置发送者颜色
      const color = anchor.sender === 'human'
        ? PDF_STYLES.COLOR_SENDER_HUMAN
        : PDF_STYLES.COLOR_SENDER_ASSISTANT;
      this.pdf.setTextColor(...color);

      // 计算页码位置（右对齐）
      const pageNumWidth = this.safeGetTextWidth(pageNum);
      const pageNumX = PDF_STYLES.PAGE_WIDTH - PDF_STYLES.MARGIN_RIGHT - pageNumWidth;

      // 渲染条目（作为链接）
      const entryY = this.currentY;
      this.pdf.textWithLink(entry, PDF_STYLES.MARGIN_LEFT + 5, entryY, {
        pageNumber: anchor.page
      });

      // 渲染页码（也作为链接）
      this.pdf.setTextColor(...PDF_STYLES.COLOR_TIMESTAMP);
      this.pdf.textWithLink(pageNum, pageNumX, entryY, {
        pageNumber: anchor.page
      });

      // 渲染预览（如果有）
      if (preview) {
        this.pdf.setFontSize(PDF_STYLES.FONT_SIZE_TIMESTAMP);
        this.pdf.setTextColor(...PDF_STYLES.COLOR_TIMESTAMP);
        this.currentY += PDF_STYLES.LINE_HEIGHT;
        this.checkPageBreak(PDF_STYLES.FONT_SIZE_TIMESTAMP);
        this.pdf.text(preview, PDF_STYLES.MARGIN_LEFT + 10, this.currentY);
        this.pdf.setFontSize(PDF_STYLES.FONT_SIZE_BODY);
      }

      this.currentY += PDF_STYLES.LINE_HEIGHT * 1.5;
    });
  }

  /**
   * 渲染页脚
   */
  renderFooter(pageNumber, totalPages) {
    const originalY = this.currentY;
    const originalFontSize = this.pdf.internal.getFontSize();

    // 设置页脚样式
    this.pdf.setFontSize(PDF_STYLES.FONT_SIZE_FOOTER);
    this.pdf.setTextColor(...PDF_STYLES.COLOR_FOOTER);

    const footerY = PDF_STYLES.PAGE_HEIGHT - 10;

    // 绘制页脚上方的分隔线
    this.pdf.setDrawColor(...PDF_STYLES.COLOR_BORDER);
    this.pdf.setLineWidth(0.1);
    this.pdf.line(
      PDF_STYLES.MARGIN_LEFT,
      PDF_STYLES.PAGE_HEIGHT - PDF_STYLES.FOOTER_HEIGHT,
      PDF_STYLES.PAGE_WIDTH - PDF_STYLES.MARGIN_RIGHT,
      PDF_STYLES.PAGE_HEIGHT - PDF_STYLES.FOOTER_HEIGHT
    );

    // 左侧显示导出时间
    const exportText = `Exported: ${this.manager.exportDate}`;
    this.pdf.text(exportText, PDF_STYLES.MARGIN_LEFT, footerY);

    // 右侧显示页码
    const pageText = `${pageNumber} / ${totalPages}`;
    const pageTextWidth = this.safeGetTextWidth(pageText);
    this.pdf.text(pageText, PDF_STYLES.PAGE_WIDTH - PDF_STYLES.MARGIN_RIGHT - pageTextWidth, footerY);

    // 恢复原始设置
    this.pdf.setFontSize(originalFontSize);
    this.pdf.setTextColor(...PDF_STYLES.COLOR_TEXT);
    this.currentY = originalY;
  }
}
