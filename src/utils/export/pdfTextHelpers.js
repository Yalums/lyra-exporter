// utils/export/pdfTextHelpers.js
// PDF文本处理辅助函数 - 纯函数模块，处理文本清理、解析和格式化

/**
 * 清理代码块文本（轻量级清理，保留代码特殊字符）
 * @param {string} text - 原始代码文本
 * @returns {string} - 清理后的代码文本
 */
export function cleanCodeText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  try {
    // 1. Unicode 标准化（NFC 模式）
    let cleaned = text.normalize('NFC');

    // 2. 仅移除控制字符（保留换行符和制表符）
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');

    // 3. 移除零宽字符
    cleaned = cleaned.replace(/[\u200B-\u200F\u2060\uFEFF]/g, '');

    // 注意：代码块内容不进行引号、星号等替换，保持原样
    return cleaned;
  } catch (error) {
    console.error('[PDF导出] 代码文本清理失败:', error);
    // 如果清理失败，返回简化处理的文本
    return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }
}

/**
 * 清理和标准化文本，防止编码问题
 * @param {string} text - 原始文本
 * @returns {string} - 清理后的文本
 */
export function cleanText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  try {
    // 1. Unicode 标准化（NFC 模式）
    let cleaned = text.normalize('NFC');

    // 2. 移除控制字符和不可打印字符（保留换行符和制表符）
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');

    // 3. 处理常见的Latin连字（ligatures），将其转换回普通字符组合
    const ligatureMap = {
      '\uFB00': 'ff',    // ﬀ
      '\uFB01': 'fi',    // ﬁ
      '\uFB02': 'fl',    // ﬂ
      '\uFB03': 'ffi',   // ﬃ
      '\uFB04': 'ffl',   // ﬄ
      '\uFB05': 'st',    // ﬅ
      '\uFB06': 'st',    // ﬆ
      '\u00C6': 'AE',    // Æ
      '\u00E6': 'ae',    // æ
      '\u0152': 'OE',    // Œ
      '\u0153': 'oe',    // œ
      '\u00DF': 'ss',    // ß
      '\u1E9E': 'SS',    // ẞ
    };

    // 批量替换连字
    for (const [ligature, replacement] of Object.entries(ligatureMap)) {
      cleaned = cleaned.replace(new RegExp(ligature, 'g'), replacement);
    }

    // 4. 处理特殊Unicode字符（可能导致jsPDF问题）
    // 移除零宽字符
    cleaned = cleaned.replace(/[\u200B-\u200F\u2060\uFEFF]/g, '');

    // 6. 标准化引号和标点符号（修复乱码问题）
    // 将各种引号统一为标准ASCII引号或中文引号
    const quoteMap = {
      // 英文引号标准化
      '\u201C': '"',  // " (左双引号) -> "
      '\u201D': '"',  // " (右双引号) -> "
      '\u2018': "'",  // ' (左单引号) -> '
      '\u2019': "'",  // ' (右单引号) -> '
      '\u2033': '"',  // ″ (双撇号) -> "
      '\u2032': "'",  // ′ (单撇号) -> '

      // 其他标点标准化
      '\u2014': '--', // — (em dash) -> --
      '\u2013': '-',  // – (en dash) -> -
      '\u2026': '...', // … (省略号) -> ...
      '\u2022': '·',  // • (项目符号) -> ·
      '\u00B7': '·',  // · (中点)

      // 星号标准化
      '\u2217': '*',  // ∗ (星号运算符) -> *
      '\u2731': '*',  // ✱ (粗星号) -> *
      '\u2732': '*',  // ✲ (开放中心星号) -> *
      '\u2605': '*',  // ★ (黑色星号) -> *
      '\u2606': '*',  // ☆ (白色星号) -> *

      // 加号标准化
      '\u2795': '+',  // ➕ (粗加号) -> +
      '\uFF0B': '+',  // ＋ (全角加号) -> +
    };

    // 批量替换
    for (const [from, to] of Object.entries(quoteMap)) {
      cleaned = cleaned.replace(new RegExp(from, 'g'), to);
    }

    // 7. 处理全角字符转半角（可选，根据需要）
    // 全角数字和字母转半角
    cleaned = cleaned.replace(/[\uFF10-\uFF19]/g, (ch) => {
      return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
    });
    cleaned = cleaned.replace(/[\uFF21-\uFF3A]/g, (ch) => {
      return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
    });
    cleaned = cleaned.replace(/[\uFF41-\uFF5A]/g, (ch) => {
      return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
    });

    // 全角空格转半角
    cleaned = cleaned.replace(/\u3000/g, ' ');

    return cleaned;
  } catch (error) {
    console.error('[PDF导出] 文本清理失败:', error);
    // 如果清理失败，返回简化处理的文本
    return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }
}

/**
 * 解析文本中的代码块和LaTeX块
 */
export function parseTextWithCodeBlocksAndLatex(text) {
  const parts = [];
  const elements = [];

  // 提取所有代码块（允许语言标识符后有空格）
  const codeBlockRegex = /```([^\n]*?)\s*\n([\s\S]*?)```/g;
  let match;
  let lastIndex = 0;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    const language = (match[1] || '').trim().toLowerCase(); // 清理并转小写
    const content = match[2];

    // 检测是否为LaTeX代码块
    if (language === 'latex' || language === 'math') {
      console.log('[解析] 检测到LaTeX代码块:', language);
      elements.push({
        start: match.index,
        end: match.index + match[0].length,
        type: 'latex-display',
        content: content.trim()
      });
    } else {
      // 普通代码块
      elements.push({
        start: match.index,
        end: match.index + match[0].length,
        type: 'code',
        language: language,
        content: content
      });
    }
  }

  // 提取LaTeX display math块 ($$...$$)
  const latexDisplayRegex = /\$\$\n?([\s\S]*?)\n?\$\$/g;
  while ((match = latexDisplayRegex.exec(text)) !== null) {
    elements.push({
      start: match.index,
      end: match.index + match[0].length,
      type: 'latex-display',
      content: match[1].trim()
    });
  }

  // 提取LaTeX display math块 (\[...\])
  const latexBracketRegex = /\\\[([\s\S]*?)\\\]/g;
  while ((match = latexBracketRegex.exec(text)) !== null) {
    elements.push({
      start: match.index,
      end: match.index + match[0].length,
      type: 'latex-display',
      content: match[1].trim()
    });
  }

  // 按位置排序所有元素
  elements.sort((a, b) => a.start - b.start);

  // 移除重叠的元素（保留先出现的）
  const filteredElements = [];
  elements.forEach(element => {
    const overlaps = filteredElements.some(existing =>
      (element.start >= existing.start && element.start < existing.end) ||
      (element.end > existing.start && element.end <= existing.end) ||
      (element.start <= existing.start && element.end >= existing.end)
    );
    if (!overlaps) {
      filteredElements.push(element);
    }
  });

  // 构建最终的parts数组
  lastIndex = 0;
  filteredElements.forEach(element => {
    // 添加元素前的文本
    if (element.start > lastIndex) {
      const plainText = text.substring(lastIndex, element.start);
      if (plainText.trim()) {
        parts.push({ type: 'text', content: plainText });
      }
    }

    // 添加元素本身
    parts.push(element);
    lastIndex = element.end;
  });

  // 添加最后的文本
  if (lastIndex < text.length) {
    const plainText = text.substring(lastIndex);
    if (plainText.trim()) {
      parts.push({ type: 'text', content: plainText });
    }
  }

  // 如果没有特殊元素,返回整个文本
  if (parts.length === 0) {
    parts.push({ type: 'text', content: text });
  }

  return parts;
}

/**
 * 解析行内markdown格式和LaTeX
 * 返回格式化的文本片段数组
 * 支持嵌套结构（如 **$...$** 会生成包含LaTeX子节点的粗体节点）
 */
export function parseInlineMarkdown(text) {
  const segments = [];

  // 正则表达式模式（按优先级）
  // 粗体/斜体模式在前，它们会包含内部内容并递归解析
  const patterns = [
    { type: 'bold-italic', regex: /\*\*\*(.+?)\*\*\*/g, recursive: true },
    { type: 'bold-italic', regex: /___(.+?)___/g, recursive: true },
    { type: 'bold', regex: /\*\*(.+?)\*\*/g, recursive: true },
    { type: 'bold', regex: /__(.+?)__/g, recursive: true },
    { type: 'italic', regex: /\*([^*]+?)\*/g, recursive: true },
    { type: 'italic', regex: /_([^_]+?)_/g, recursive: true },
    { type: 'latex-inline', regex: /\$([^\$\n]+?)\$/g, recursive: false },
    { type: 'latex-inline', regex: /\\\(([^)]*?)\\\)/g, recursive: false },
    { type: 'code', regex: /`([^`]+)`/g, recursive: false },
    { type: 'link', regex: /\[([^\]]+)\]\(([^)]+)\)/g, recursive: false }
  ];

  // 查找所有匹配
  const matches = [];
  patterns.forEach(pattern => {
    let match;
    const regex = new RegExp(pattern.regex.source, 'g');
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        type: pattern.type,
        start: match.index,
        end: regex.lastIndex,
        text: match[1],
        url: match[2],
        recursive: pattern.recursive
      });
    }
  });

  // 按位置排序
  matches.sort((a, b) => a.start - b.start);

  // 移除重叠的匹配（保留最外层）
  const filteredMatches = [];
  matches.forEach(match => {
    const overlaps = filteredMatches.some(existing =>
      (match.start >= existing.start && match.start < existing.end) ||
      (match.end > existing.start && match.end <= existing.end)
    );
    if (!overlaps) {
      filteredMatches.push(match);
    }
  });

  // 构建segments数组
  let lastEnd = 0;
  filteredMatches.forEach(match => {
    // 添加普通文本
    if (match.start > lastEnd) {
      segments.push({
        type: 'normal',
        text: cleanText(text.substring(lastEnd, match.start))
      });
    }

    // 处理匹配项
    if (match.recursive && match.type !== 'latex-inline') {
      // 递归解析内部内容（粗体/斜体内可能包含LaTeX）
      const innerSegments = parseInlineMarkdown(match.text);
      segments.push({
        type: match.type,
        children: innerSegments
      });
    } else {
      // 非递归类型（LaTeX、代码、链接）
      segments.push({
        type: match.type,
        text: match.type === 'latex-inline' ? match.text : cleanText(match.text),
        url: match.url
      });
    }

    lastEnd = match.end;
  });

  // 添加剩余文本
  if (lastEnd < text.length) {
    segments.push({
      type: 'normal',
      text: cleanText(text.substring(lastEnd))
    });
  }

  // 如果没有匹配，返回整个文本
  if (segments.length === 0) {
    segments.push({
      type: 'normal',
      text: cleanText(text)
    });
  }

  return segments;
}

/**
 * 应用中文标点避头尾规则
 * @param {string[]} lines - 换行后的文本行数组
 * @returns {string[]} - 调整后的文本行数组
 */
export function applyCJKPunctuationRules(lines) {
  if (!lines || lines.length <= 1) return lines;

  // 不能出现在行首的标点（避头）
  const noLineStart = /^[。，、；：！？）》」』】"',.;:!?)}\]]/;
  // 不能出现在行尾的标点（避尾）
  const noLineEnd = /[（《「『【"'(\[{]$/;

  const result = [];
  let prevLine = lines[0];

  for (let i = 1; i < lines.length; i++) {
    const currentLine = lines[i];

    // 检查当前行开头是否有不能在行首的标点
    if (noLineStart.test(currentLine)) {
      // 将标点移到上一行末尾
      const punct = currentLine[0];
      prevLine = prevLine + punct;
      lines[i] = currentLine.substring(1);
      continue;
    }

    // 检查上一行结尾是否有不能在行尾的标点
    if (noLineEnd.test(prevLine)) {
      // 将标点移到当前行开头
      const punct = prevLine[prevLine.length - 1];
      prevLine = prevLine.substring(0, prevLine.length - 1);
      lines[i] = punct + currentLine;
    }

    result.push(prevLine);
    prevLine = lines[i];
  }

  result.push(prevLine);
  return result;
}

/**
 * 解析代码行中的格式标记（粗体、标题）
 * 返回 [{text: string, bold: boolean, heading: number}]
 */
export function parseCodeLineBold(line) {
  const segments = [];

  // 检查是否是标题行（### 开头）
  const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
  if (headingMatch) {
    const level = headingMatch[1].length; // 标题级别（1-6）
    const headingText = headingMatch[2];

    // 标题文本仍然可以包含粗体
    const boldRegex = /\*\*([^*]+?)\*\*/g;
    let lastEnd = 0;
    let match;

    while ((match = boldRegex.exec(headingText)) !== null) {
      if (match.index > lastEnd) {
        segments.push({
          text: headingText.substring(lastEnd, match.index),
          bold: false,
          heading: level
        });
      }
      segments.push({
        text: match[1],
        bold: true,
        heading: level
      });
      lastEnd = boldRegex.lastIndex;
    }

    if (lastEnd < headingText.length) {
      segments.push({
        text: headingText.substring(lastEnd),
        bold: false,
        heading: level
      });
    }

    if (segments.length === 0) {
      segments.push({
        text: headingText,
        bold: false,
        heading: level
      });
    }

    return segments;
  }

  // 不是标题，解析普通粗体
  const boldRegex = /\*\*([^*]+?)\*\*/g;
  let lastEnd = 0;
  let match;

  while ((match = boldRegex.exec(line)) !== null) {
    // 添加普通文本
    if (match.index > lastEnd) {
      segments.push({
        text: line.substring(lastEnd, match.index),
        bold: false
      });
    }

    // 添加粗体文本
    segments.push({
      text: match[1],
      bold: true
    });

    lastEnd = boldRegex.lastIndex;
  }

  // 添加剩余文本
  if (lastEnd < line.length) {
    segments.push({
      text: line.substring(lastEnd),
      bold: false
    });
  }

  // 如果没有匹配，返回整行
  if (segments.length === 0) {
    segments.push({
      text: line,
      bold: false
    });
  }

  return segments;
}

/**
 * 安全地设置字体，如果字体变体不可用则自动回退
 * @param {Object} pdf - jsPDF实例
 * @param {string} fontName - 字体名称
 * @param {string} fontStyle - 字体样式
 * @param {Array} availableFontWeights - 可用字体变体列表
 * @returns {boolean} - 是否成功设置
 */
export function safeSetFont(pdf, fontName, fontStyle = 'normal', availableFontWeights = []) {
  try {
    // 如果请求的样式可用，直接使用
    if (availableFontWeights.includes(fontStyle)) {
      pdf.setFont(fontName, fontStyle);
      return true;
    }

    // 字体变体不可用，进行智能回退
    console.warn(`[PDF导出] 字体变体 ${fontStyle} 不可用，尝试回退...`);

    // 回退策略
    if (fontStyle === 'bold' || fontStyle === 'bolditalic') {
      // 粗体：优先尝试 normal，如果没有则用第一个可用的
      if (availableFontWeights.includes('normal')) {
        pdf.setFont(fontName, 'normal');
        console.log(`[PDF导出] ✓ 回退到 normal 字体`);
        return false; // 返回 false 表示使用了回退
      }
    }

    if (fontStyle === 'italic' || fontStyle === 'bolditalic') {
      // 斜体：中文字体通常没有斜体，回退到 light 或 normal
      if (availableFontWeights.includes('light')) {
        pdf.setFont(fontName, 'light');
        console.log(`[PDF导出] ✓ 斜体回退到 light 字体`);
        return false;
      } else if (availableFontWeights.includes('normal')) {
        pdf.setFont(fontName, 'normal');
        console.log(`[PDF导出] ✓ 斜体回退到 normal 字体`);
        return false;
      }
    }

    // 默认回退：使用第一个可用的字体变体
    if (availableFontWeights.length > 0) {
      const fallbackStyle = availableFontWeights[0];
      pdf.setFont(fontName, fallbackStyle);
      console.log(`[PDF导出] ✓ 回退到 ${fallbackStyle} 字体`);
      return false;
    }

    // 最终回退：使用 normal
    pdf.setFont(fontName, 'normal');
    console.log(`[PDF导出] ✓ 回退到 normal 字体`);
    return false;
  } catch (error) {
    console.error(`[PDF导出] 设置字体失败:`, error);
    // 最后的保险：使用默认字体
    pdf.setFont(fontName || 'helvetica');
    return false;
  }
}

/**
 * 安全地获取文本宽度，处理字体元数据缺失的情况
 * @param {Object} pdf - jsPDF实例
 * @param {string} text - 要测量的文本
 * @param {string} chineseFontName - 中文字体名称
 * @returns {number} - 文本宽度
 */
export function safeGetTextWidth(pdf, text, chineseFontName = 'helvetica') {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  try {
    // 检查当前字体是否有 Unicode 元数据
    const font = pdf.getFont();
    if (!font.metadata || !font.metadata.Unicode) {
      const currentStyle = font.fontStyle || 'normal';
      console.warn(`[PDF导出] 当前字体 (${currentStyle}) 缺少 Unicode 元数据`);

      // 只在非normal字体时回退
      if (currentStyle !== 'normal') {
        console.log('[PDF导出] 回退到 normal 字体');
        safeSetFont(pdf, chineseFontName, 'normal');
        // 重新尝试获取宽度
        return pdf.getTextWidth(text);
      } else {
        // normal字体也有问题，使用近似值
        console.warn('[PDF导出] normal 字体也缺少元数据，使用近似计算');
        const fontSize = pdf.getFontSize();
        return text.length * fontSize * 0.5;
      }
    }

    return pdf.getTextWidth(text);
  } catch (error) {
    console.error('[PDF导出] getTextWidth 失败:', error);
    // 如果失败，使用近似值：字符数 * 字体大小 * 0.5
    const fontSize = pdf.getFontSize();
    return text.length * fontSize * 0.5;
  }
}

/**
 * 安全地渲染文本，自动处理边界
 * @param {Object} pdf - jsPDF实例
 * @param {string} text - 要渲染的文本
 * @param {number} x - X 坐标
 * @param {number} y - Y 坐标
 * @param {number} maxWidth - 最大宽度（可选）
 */
export function safeRenderText(pdf, text, x, y, maxWidth = null) {
  if (!text || typeof text !== 'string') {
    return;
  }

  const cleanedText = cleanText(text);
  if (!cleanedText) {
    return;
  }

  // 如果指定了 maxWidth，检查文本宽度
  if (maxWidth) {
    const textWidth = safeGetTextWidth(pdf, cleanedText);
    if (textWidth > maxWidth) {
      // 文本过长，进行截断并添加省略号
      console.warn('[PDF导出] 文本过长，将被截断:', cleanedText.substring(0, 50));
      // 尝试使用 splitTextToSize 拆分（只渲染第一行）
      try {
        const lines = pdf.splitTextToSize(cleanedText, maxWidth);
        if (lines.length > 0) {
          pdf.text(lines[0], x, y);
        }
      } catch (error) {
        // 如果失败，尝试简单截断
        let truncated = cleanedText;
        while (safeGetTextWidth(pdf, truncated + '...') > maxWidth && truncated.length > 0) {
          truncated = truncated.substring(0, truncated.length - 1);
        }
        pdf.text(truncated + '...', x, y);
      }
      return;
    }
  }

  // 文本长度合适，直接渲染
  pdf.text(cleanedText, x, y);
}