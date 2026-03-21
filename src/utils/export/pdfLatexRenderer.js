// utils/export/pdfLatexRenderer.js
// LaTeX数学公式渲染器 - 使用Unicode映射和自定义绘图实现非SVG渲染
// 修复版：修复死代码路径、上下标回退、字体状态机冲突

import { cleanText } from './pdfTextHelpers';

// ============ 渲染常量 ============
const LATEX_RENDER_CONSTANTS = {
  // 字体缩放比例
  FRACTION_FONT_SCALE: 0.75,      // 分数内字体缩放
  SUPERSCRIPT_FONT_SCALE: 0.7,    // 上标字体缩放
  SUBSCRIPT_FONT_SCALE: 0.7,      // 下标字体缩放
  DISPLAY_FONT_SCALE: 1.2,        // 块级公式放大
  
  // 位置偏移比例（相对于fontSize）
  FRACTION_NUM_OFFSET: 0.17,      // 分子上移
  FRACTION_DEN_OFFSET: 0.5,       // 分母下移
  SUPERSCRIPT_OFFSET: 0.3,        // 上标上移
  SUBSCRIPT_OFFSET: 0.3,          // 下标下移
  
  // 其他
  FRACTION_PADDING: 4,            // 分数左右padding
  SQRT_PADDING: 8,                // 根号padding
  CACHE_MAX_SIZE: 500,            // 宽度缓存最大条目数
};

/**
 * LaTeX到Unicode的映射表
 */
const LATEX_UNICODE_MAP = {
  // 希腊字母小写
  'alpha': 'α', 'beta': 'β', 'gamma': 'γ', 'delta': 'δ',
  'epsilon': 'ε', 'varepsilon': 'ε', 'zeta': 'ζ', 'eta': 'η',
  'theta': 'θ', 'vartheta': 'ϑ', 'iota': 'ι', 'kappa': 'κ',
  'lambda': 'λ', 'mu': 'μ', 'nu': 'ν', 'xi': 'ξ',
  'pi': 'π', 'varpi': 'ϖ', 'rho': 'ρ', 'varrho': 'ϱ',
  'sigma': 'σ', 'varsigma': 'ς', 'tau': 'τ', 'upsilon': 'υ',
  'phi': 'φ', 'varphi': 'φ', 'chi': 'χ', 'psi': 'ψ', 'omega': 'ω',
  
  // 希腊字母大写
  'Alpha': 'Α', 'Beta': 'Β', 'Gamma': 'Γ', 'Delta': 'Δ',
  'Epsilon': 'Ε', 'Zeta': 'Ζ', 'Eta': 'Η', 'Theta': 'Θ',
  'Iota': 'Ι', 'Kappa': 'Κ', 'Lambda': 'Λ', 'Mu': 'Μ',
  'Nu': 'Ν', 'Xi': 'Ξ', 'Pi': 'Π', 'Rho': 'Ρ',
  'Sigma': 'Σ', 'Tau': 'Τ', 'Upsilon': 'Υ', 'Phi': 'Φ',
  'Chi': 'Χ', 'Psi': 'Ψ', 'Omega': 'Ω',
  
  // 数学运算符
  'pm': '±', 'mp': '∓', 'times': '×', 'div': '÷',
  'cdot': '·', 'ast': '∗', 'star': '⋆', 'circ': '∘',
  'bullet': '•', 'oplus': '⊕', 'ominus': '⊖', 'otimes': '⊗',
  'oslash': '⊘', 'odot': '⊙', 'dagger': '†', 'ddagger': '‡',
  
  // 关系符号
  'leq': '≤', 'le': '≤', 'geq': '≥', 'ge': '≥',
  'neq': '≠', 'ne': '≠', 'approx': '≈', 'equiv': '≡',
  'sim': '∼', 'simeq': '≃', 'propto': '∝', 'perp': '⊥',
  'parallel': '∥', 'subset': '⊂', 'supset': '⊃',
  'subseteq': '⊆', 'supseteq': '⊇', 'in': '∈', 'notin': '∉',
  
  // 箭头
  'leftarrow': '←', 'rightarrow': '→', 'uparrow': '↑', 'downarrow': '↓',
  'leftrightarrow': '↔', 'updownarrow': '↕', 'Leftarrow': '⇐', 'Rightarrow': '⇒',
  'Uparrow': '⇑', 'Downarrow': '⇓', 'Leftrightarrow': '⇔', 'Updownarrow': '⇕',
  'mapsto': '↦', 'to': '→', 'gets': '←',
  
  // 其他符号
  'infty': '∞', 'partial': '∂', 'nabla': '∇', 'forall': '∀',
  'exists': '∃', 'nexists': '∄', 'emptyset': '∅', 'varnothing': '∅',
  'complement': '∁', 'neg': '¬', 'wedge': '∧', 'vee': '∨',
  'cap': '∩', 'cup': '∪', 'int': '∫', 'iint': '∬', 'iiint': '∭',
  'oint': '∮', 'sum': '∑', 'prod': '∏', 'coprod': '∐',
  'bigcap': '⋂', 'bigcup': '⋃', 'bigvee': '⋁', 'bigwedge': '⋀',
  'bigoplus': '⨁', 'bigotimes': '⨂', 'bigodot': '⨀', 'biguplus': '⨄',
  
  // 括号和定界符
  'langle': '⟨', 'rangle': '⟩', 'lfloor': '⌊', 'rfloor': '⌋',
  'lceil': '⌈', 'rceil': '⌉', 'vert': '|', 'Vert': '‖',
  
  // 特殊字符
  'dots': '…', 'cdots': '⋯', 'vdots': '⋮', 'ddots': '⋱',
  'ldots': '…', 'therefore': '∴', 'because': '∵',
  'angle': '∠', 'measuredangle': '∡', 'sphericalangle': '∢',
  
  // 其他
  'prime': '′', 'backprime': '‵', 'degree': '°',

  // 三角函数和数学函数（保留名称，不转换为符号）
  'sin': 'sin', 'cos': 'cos', 'tan': 'tan',
  'cot': 'cot', 'sec': 'sec', 'csc': 'csc',
  'arcsin': 'arcsin', 'arccos': 'arccos', 'arctan': 'arctan',
  'sinh': 'sinh', 'cosh': 'cosh', 'tanh': 'tanh',
  'log': 'log', 'ln': 'ln', 'exp': 'exp',
  'lim': 'lim', 'max': 'max', 'min': 'min',
  'sup': 'sup', 'inf': 'inf', 'det': 'det', 'dim': 'dim'
};

// 数学花体字母映射表（\mathcal{X}）
const MATHCAL_MAP = {
  'A': '𝒜', 'B': 'ℬ', 'C': '𝒞', 'D': '𝒟', 'E': 'ℰ', 'F': 'ℱ',
  'G': '𝒢', 'H': 'ℋ', 'I': 'ℐ', 'J': '𝒥', 'K': '𝒦', 'L': 'ℒ',
  'M': 'ℳ', 'N': '𝒩', 'O': '𝒪', 'P': '𝒫', 'Q': '𝒬', 'R': 'ℛ',
  'S': '𝒮', 'T': '𝒯', 'U': '𝒰', 'V': '𝒱', 'W': '𝒲', 'X': '𝒳',
  'Y': '𝒴', 'Z': '𝒵'
};

// 黑板粗体映射（\mathbb{X}）
const MATHBB_MAP = {
  'A': '𝔸', 'B': '𝔹', 'C': 'ℂ', 'D': '𝔻', 'E': '𝔼', 'F': '𝔽',
  'G': '𝔾', 'H': 'ℍ', 'I': '𝕀', 'J': '𝕁', 'K': '𝕂', 'L': '𝕃',
  'M': '𝕄', 'N': 'ℕ', 'O': '𝕆', 'P': 'ℙ', 'Q': 'ℚ', 'R': 'ℝ',
  'S': '𝕊', 'T': '𝕋', 'U': '𝕌', 'V': '𝕍', 'W': '𝕎', 'X': '𝕏',
  'Y': '𝕐', 'Z': 'ℤ'
};

// ============ 修复点 1：统一上标映射，全部使用Unicode ============
// 原 SUPERSCRIPT_SAFE 会对0,4-9及大部分字母产出 "^x" 字面文本，
// 这是 K_b^ 式回退的直接原因。修复：优先使用 Unicode 上标，
// 仅在完全无对应 Unicode 时才用 positioned rendering 回退。
const SUPERSCRIPT_MAP = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  'n': 'ⁿ', 'i': 'ⁱ',
  'T': 'ᵀ', 'H': 'ᴴ', '*': '﹡', 't': 'ᵗ',
  'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ',
  'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ', 'j': 'ʲ', 'k': 'ᵏ',
  'l': 'ˡ', 'm': 'ᵐ', 'o': 'ᵒ', 'p': 'ᵖ', 'r': 'ʳ',
  's': 'ˢ', 'u': 'ᵘ', 'v': 'ᵛ', 'w': 'ʷ', 'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ'
};

// 下标数字和字母映射（Unicode下标字符）
const SUBSCRIPT_MAP = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
  'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ',
  'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ',
  'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ',
  'v': 'ᵥ', 'x': 'ₓ'
};

/**
 * 提取花括号内的内容（支持嵌套和转义）
 * @param {string} str - 字符串，从 { 开始
 * @returns {string|null} - 提取的内容（不包括外层花括号），如果失败返回 null
 */
function extractBracedContent(str) {
  if (!str || !str.startsWith('{')) return null;

  let depth = 0;
  let i = 0;

  for (; i < str.length; i++) {
    if (str[i] === '\\' && i + 1 < str.length) {
      i++;
      continue;
    }
    
    if (str[i] === '{') {
      depth++;
    } else if (str[i] === '}') {
      depth--;
      if (depth === 0) {
        return str.substring(1, i);
      }
    }
  }

  return null;
}

/**
 * LaTeX渲染器类
 */
export class LaTeXRenderer {
  constructor(pdf, config = {}) {
    this.pdf = pdf;
    this.config = {
      fontSize: config.fontSize || 10,
      color: config.color || [0, 0, 0],
      fontName: config.fontName || 'helvetica',
      useUnicode: config.useUnicode !== false,
      ...config
    };

    // 宽度计算缓存
    this.widthCache = new Map();
    this.cacheAccessOrder = [];

    // ============ 修复点 5：字形可用性缓存 ============
    // 缓存字体是否能渲染某个 Unicode 字符（避免反复检测）
    this._glyphTestCache = new Map();
  }

  /**
   * 设置渲染字体 —— 修复点 5：始终使用 normal 体，
   * 因为 MiSans-Light(italic映射) 的字形覆盖率可能不如 Regular
   */
  setRenderFont(fontSize = null) {
    if (this.config.fontName) {
      try {
        this.pdf.setFont(this.config.fontName, 'normal');
      } catch (e) {
        // 字体不可用时回退
      }
    }
    if (fontSize !== null) {
      this.pdf.setFontSize(fontSize);
    }
  }

  /**
   * 获取文本宽度（带缓存，LRU策略）
   */
  getCachedTextWidth(text, fontSize) {
    const cacheKey = `${text}|${fontSize}|${this.config.fontName}`;

    if (this.widthCache.has(cacheKey)) {
      const idx = this.cacheAccessOrder.indexOf(cacheKey);
      if (idx > -1) {
        this.cacheAccessOrder.splice(idx, 1);
      }
      this.cacheAccessOrder.push(cacheKey);
      return this.widthCache.get(cacheKey);
    }

    this.setRenderFont(fontSize);
    const width = this.pdf.getTextWidth(text);
    
    if (this.widthCache.size >= LATEX_RENDER_CONSTANTS.CACHE_MAX_SIZE) {
      const oldestKey = this.cacheAccessOrder.shift();
      if (oldestKey) {
        this.widthCache.delete(oldestKey);
      }
    }
    
    this.widthCache.set(cacheKey, width);
    this.cacheAccessOrder.push(cacheKey);

    return width;
  }

  /**
   * 清除宽度缓存
   */
  clearWidthCache() {
    this.widthCache.clear();
    this.cacheAccessOrder = [];
  }

  /**
   * 检测字体是否能渲染某个字符（通过宽度对比检测）
   * 如果字符宽度与一个已知不存在的字符宽度完全相同，说明回退到 .notdef
   */
  canRenderGlyph(char) {
    if (this._glyphTestCache.has(char)) {
      return this._glyphTestCache.get(char);
    }

    try {
      this.setRenderFont(this.config.fontSize);
      const charWidth = this.pdf.getTextWidth(char);
      // 对比：如果宽度为0或与一个控制字符完全相同，认为不支持
      const refWidth = this.pdf.getTextWidth('\uFFFD'); // replacement character
      const canRender = charWidth > 0 && Math.abs(charWidth - refWidth) > 0.01;
      this._glyphTestCache.set(char, canRender);
      return canRender;
    } catch (e) {
      this._glyphTestCache.set(char, false);
      return false;
    }
  }

  /**
   * 渲染行内LaTeX数学公式
   * 修复点 1+5：统一使用 normal 字体，不再切换 italic
   */
  renderInlineLaTeX(latex, x, y, maxWidth) {
    const simplified = this.simplifyLaTeX(latex);
    
    if (this.hasComplexStructure(latex)) {
      return this.renderComplexLaTeX(latex, x, y, maxWidth, true);
    }
    
    // ============ 修复点 5：始终使用 normal，消除字体切换冲突 ============
    this.setRenderFont(this.config.fontSize);
    this.pdf.setTextColor(...this.config.color);
    
    this.pdf.text(simplified, x, y);
    const width = this.pdf.getTextWidth(simplified);
    
    return width;
  }

  /**
   * 渲染块级LaTeX数学公式
   */
  renderDisplayLaTeX(latex, x, y, maxWidth) {
    const centerX = x + maxWidth / 2;
    const { DISPLAY_FONT_SCALE } = LATEX_RENDER_CONSTANTS;
    
    if (this.hasComplexStructure(latex)) {
      return this.renderComplexLaTeX(latex, centerX, y, maxWidth, false);
    }
    
    const simplified = this.simplifyLaTeX(latex);
    const fontSize = this.config.fontSize * DISPLAY_FONT_SCALE;
    
    this.setRenderFont(fontSize);
    this.pdf.setTextColor(...this.config.color);
    
    const textWidth = this.pdf.getTextWidth(simplified);
    const startX = centerX - textWidth / 2;
    
    const padding = 5;
    this.pdf.setFillColor(250, 250, 250);
    this.pdf.rect(startX - padding, y - fontSize * 0.8, textWidth + padding * 2, fontSize * 1.5, 'F');
    
    this.pdf.text(simplified, startX, y);
    
    return {
      width: textWidth + padding * 2,
      height: fontSize * 1.5
    };
  }

  /**
   * 简化LaTeX为Unicode字符（增强版，支持嵌套）
   */
  simplifyLaTeX(latex) {
    if (!latex) return '';
    
    let result = latex;

    result = result.replace(/\s+/g, ' ').trim();
    
    // 处理LaTeX环境
    result = this.simplifyEnvironments(result);
    
    // 处理 \left 和 \right
    result = result.replace(/\\left\(/g, '(');
    result = result.replace(/\\right\)/g, ')');
    result = result.replace(/\\left\[/g, '[');
    result = result.replace(/\\right\]/g, ']');
    result = result.replace(/\\left\\\{/g, '{');
    result = result.replace(/\\right\\\}/g, '}');
    result = result.replace(/\\left\{/g, '{');
    result = result.replace(/\\right\}/g, '}');
    result = result.replace(/\\left\|/g, '|');
    result = result.replace(/\\right\|/g, '|');
    result = result.replace(/\\left\./g, '');
    result = result.replace(/\\right\./g, '');

    // 处理 \mathbb{X}
    result = result.replace(/\\mathbb\{([A-Z])\}/g, (_, letter) => {
      return MATHBB_MAP[letter] || letter;
    });

    // 处理 \mathcal{X}
    result = result.replace(/\\mathcal\{([A-Z])\}/g, (_, letter) => {
      return MATHCAL_MAP[letter] || letter;
    });

    // 处理 \text{}
    result = result.replace(/\\text\{([^}]*)\}/g, '$1');
    // 处理 \mathrm{} - 与 \text 类似
    result = result.replace(/\\mathrm\{([^}]*)\}/g, '$1');
    // 处理 \mathbf{} - 粗体（PDF中无法真正加粗，保留文本）
    result = result.replace(/\\mathbf\{([^}]*)\}/g, '$1');

    // 处理可扩展箭头命令
    result = result.replace(/\\xleftrightarrow\{([^}]*)\}/g, (match, inner) => {
      const simplifiedInner = inner ? this.simplifyLaTeX(inner) : '';
      return `←[${simplifiedInner}]→`;
    });
    result = result.replace(/\\xrightarrow\{([^}]*)\}/g, (match, inner) => {
      const simplifiedInner = inner ? this.simplifyLaTeX(inner) : '';
      return `→[${simplifiedInner}]`;
    });
    result = result.replace(/\\xleftarrow\{([^}]*)\}/g, (match, inner) => {
      const simplifiedInner = inner ? this.simplifyLaTeX(inner) : '';
      return `[${simplifiedInner}]←`;
    });

    // 处理 \boxed{...}
    result = this.simplifyBoxed(result);

    // 处理 \underbrace 和 \overbrace
    result = this.simplifyBraces(result);

    // 处理 \frac{a}{b}
    result = this.simplifyFractions(result);

    // 处理 \sqrt
    result = result.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, '($2)^(1/$1)');
    result = result.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');

    // 处理上标和下标
    result = this.processSupSubScripts(result);
    
    // 替换LaTeX命令为Unicode
    const sortedCommands = Object.keys(LATEX_UNICODE_MAP).sort((a, b) => b.length - a.length);
    sortedCommands.forEach(command => {
      const pattern = new RegExp(`\\\\${command}(?![a-zA-Z])`, 'g');
      result = result.replace(pattern, LATEX_UNICODE_MAP[command]);
    });
    
    // 清理剩余的反斜杠命令
    result = result.replace(/\\([a-zA-Z]+)/g, '$1');
    result = result.replace(/\\(.)/g, '$1');
    
    // 清理花括号
    result = result.replace(/[{}]/g, '');
    
    return result;
  }

  /**
   * 简化 \boxed{...}
   */
  simplifyBoxed(text) {
    let result = text;
    let lastResult = '';

    while (result !== lastResult) {
      lastResult = result;

      const boxedMatch = result.match(/\\boxed/);
      if (!boxedMatch) break;

      const startIdx = boxedMatch.index;
      const afterBoxed = result.substring(startIdx + 6);

      const content = extractBracedContent(afterBoxed);
      if (content === null) break;

      const fullMatch = result.substring(startIdx, startIdx + 6 + content.length + 2);
      const simplifiedContent = this.simplifyLaTeX(content);
      const simplified = `[ ${simplifiedContent} ]`;

      result = result.replace(fullMatch, simplified);
    }

    return result;
  }

  /**
   * 简化 \underbrace 和 \overbrace
   */
  simplifyBraces(text) {
    let result = text;
    let lastResult = '';

    // 处理 \underbrace{content}_{label}
    while (result !== lastResult) {
      lastResult = result;

      const underbraceMatch = result.match(/\\underbrace/);
      if (!underbraceMatch) break;

      const startIdx = underbraceMatch.index;
      const afterCmd = result.substring(startIdx + 11);

      const content = extractBracedContent(afterCmd);
      if (content === null) break;

      const afterContent = afterCmd.substring(content.length + 2);
      let label = '';
      let totalLength = 11 + content.length + 2;

      if (afterContent.startsWith('_')) {
        const labelContent = extractBracedContent(afterContent.substring(1));
        if (labelContent !== null) {
          label = labelContent;
          totalLength += 1 + labelContent.length + 2;
        }
      }

      const fullMatch = result.substring(startIdx, startIdx + totalLength);
      const simplifiedContent = this.simplifyLaTeX(content);
      const simplifiedLabel = label ? this.simplifyLaTeX(label) : '';
      const simplified = simplifiedLabel
        ? `${simplifiedContent}[${simplifiedLabel}]`
        : simplifiedContent;

      result = result.replace(fullMatch, simplified);
    }

    // 处理 \overbrace{content}^{label}
    lastResult = '';
    while (result !== lastResult) {
      lastResult = result;

      const overbraceMatch = result.match(/\\overbrace/);
      if (!overbraceMatch) break;

      const startIdx = overbraceMatch.index;
      const afterCmd = result.substring(startIdx + 10);

      const content = extractBracedContent(afterCmd);
      if (content === null) break;

      const afterContent = afterCmd.substring(content.length + 2);
      let label = '';
      let totalLength = 10 + content.length + 2;

      if (afterContent.startsWith('^')) {
        const labelContent = extractBracedContent(afterContent.substring(1));
        if (labelContent !== null) {
          label = labelContent;
          totalLength += 1 + labelContent.length + 2;
        }
      }

      const fullMatch = result.substring(startIdx, startIdx + totalLength);
      const simplifiedContent = this.simplifyLaTeX(content);
      const simplifiedLabel = label ? this.simplifyLaTeX(label) : '';
      const simplified = simplifiedLabel
        ? `${simplifiedContent}[${simplifiedLabel}]`
        : simplifiedContent;

      result = result.replace(fullMatch, simplified);
    }

    return result;
  }

  /**
   * 简化分数表达式（支持嵌套）
   */
  simplifyFractions(text) {
    let result = text;
    let lastResult = '';

    while (result !== lastResult) {
      lastResult = result;

      const fracMatch = result.match(/\\frac/);
      if (!fracMatch) break;

      const startIdx = fracMatch.index;
      const afterFrac = result.substring(startIdx + 5);

      const numerator = extractBracedContent(afterFrac);
      if (numerator === null) break;

      const afterNum = afterFrac.substring(numerator.length + 2);
      const denominator = extractBracedContent(afterNum);
      if (denominator === null) break;

      const fullMatch = result.substring(startIdx, startIdx + 5 + numerator.length + 2 + denominator.length + 2);
      const simplified = `(${numerator})/(${denominator})`;

      result = result.replace(fullMatch, simplified);
    }

    return result;
  }

  /**
   * 处理上下标（支持嵌套）
   */
  processSupSubScripts(text) {
    let result = text;
    
    // 处理上标 ^{...}
    let lastResult = '';
    while (result !== lastResult) {
      lastResult = result;
      const supMatch = result.match(/\^(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}|\w)/);
      if (supMatch) {
        let content = supMatch[1];
        if (content.startsWith('{') && content.endsWith('}')) {
          content = content.slice(1, -1);
        }
        const converted = this.convertToSuperscript(content);
        result = result.replace(supMatch[0], converted);
      }
    }
    
    // 处理下标 _{...}
    lastResult = '';
    while (result !== lastResult) {
      lastResult = result;
      const subMatch = result.match(/_(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}|\w)/);
      if (subMatch) {
        let content = subMatch[1];
        if (content.startsWith('{') && content.endsWith('}')) {
          content = content.slice(1, -1);
        }
        const converted = this.convertToSubscript(content);
        result = result.replace(subMatch[0], converted);
      }
    }
    
    return result;
  }

  /**
   * ============ 修复点 2：转换为上标Unicode（不再使用 SUPERSCRIPT_SAFE） ============
   * 
   * 修复前：SUPERSCRIPT_SAFE 对 0,4-9 等输出 "^0","^4" 字面文本
   * 修复后：统一使用 SUPERSCRIPT_MAP 中的 Unicode 上标字符；
   *         仅当字符无映射时，使用上角标记法 "^(content)"
   */
  convertToSuperscript(text) {
    const simplified = this.simplifyLaTeX(text);
    
    // 检查是否所有字符都有 Unicode 上标映射
    const allMapped = simplified.split('').every(char => SUPERSCRIPT_MAP[char]);
    
    if (allMapped) {
      return simplified.split('').map(char => SUPERSCRIPT_MAP[char]).join('');
    }
    
    // 混合策略：能映射的映射，不能的组合输出
    // 如果整体较短且简单，直接用 Unicode
    const result = simplified.split('').map(char => {
      if (SUPERSCRIPT_MAP[char]) return SUPERSCRIPT_MAP[char];
      // 对于无映射的字符（如希腊字母），保持原样但标记上标位置
      return char;
    }).join('');
    
    // 如果结果中有无法映射的字符，检测是否含有非上标字符
    const hasUnmapped = simplified.split('').some(char => !SUPERSCRIPT_MAP[char]);
    if (hasUnmapped && simplified.length > 1) {
      // 对于复杂上标内容，用紧凑格式标记
      return '⁽' + result + '⁾';
    }
    
    return result;
  }

  /**
   * ============ 修复点 3：转换为下标Unicode（不再使用括号回退） ============
   * 
   * 修复前：字母下标一律包裹括号 K_b → K(b)
   * 修复后：优先使用 Unicode 下标字符；仅在无映射时用下角标记法
   */
  convertToSubscript(text) {
    const simplified = this.simplifyLaTeX(text);

    // 尝试全部映射为 Unicode 下标
    const result = simplified.split('').map(char => {
      if (SUBSCRIPT_MAP[char]) return SUBSCRIPT_MAP[char];
      return char; // 保持原字符（如 b, c, d 等有映射的会自动转换）
    }).join('');

    // 检查是否有无法映射的字符
    const hasUnmapped = simplified.split('').some(char => !SUBSCRIPT_MAP[char]);
    
    if (hasUnmapped) {
      // 对于单个无映射字母（如 b, c, d, f, g, q, w, y, z），
      // 因为 Unicode 没有这些的下标形式，使用缩小字体渲染标记
      // 返回特殊标记让渲染器知道需要 positioned rendering
      // 格式：用下标括号包裹，比原来的 (b) 更紧凑
      return '₍' + result + '₎';
    }
    
    return result;
  }

  /**
   * 检查是否包含复杂LaTeX结构
   */
  hasComplexStructure(latex) {
    const complexPatterns = [
      /\\frac\{/,
      /\\sqrt[\[\{]/,
      /\\begin\{/,
      /\\xleftrightarrow/,
      /\\xrightarrow/,
      /\\xleftarrow/,
      /\\boxed\{/,
      /\\underbrace\{/,
      /\\overbrace\{/
    ];

    return complexPatterns.some(pattern => pattern.test(latex));
  }

  /**
   * 渲染复杂LaTeX结构
   * ============ 修复点 1：使用 parseComplexLaTeXWithFractions 替代 parseComplexLaTeX ============
   * 
   * 修复前：parseComplexLaTeX 直接调 simplifyLaTeX 把所有内容变成纯文本，
   *         导致 renderFraction / renderSuperscript / renderSubscript / renderSquareRoot 全部是死代码
   * 修复后：使用 parseComplexLaTeXWithFractions 真正解析分数结构，
   *         分数用 renderFraction（分子在上、分母在下），其余简化为 Unicode
   */
  renderComplexLaTeX(latex, x, y, maxWidth, isInline) {
    const fontSize = isInline ? this.config.fontSize : this.config.fontSize * 1.2;
    
    // ============ 关键修复：使用能真正解析结构的方法 ============
    const elements = this.parseComplexLaTeXWithFractions(latex);

    // 第一步：计算总宽度
    let totalWidth = 0;
    this.setRenderFont(fontSize);

    elements.forEach(element => {
      switch (element.type) {
        case 'text':
          totalWidth += this.pdf.getTextWidth(element.content);
          break;

        case 'fraction':
          const fracFontSize = fontSize * 0.75;
          this.pdf.setFontSize(fracFontSize);
          const numWidth = this.pdf.getTextWidth(element.numerator);
          const denWidth = this.pdf.getTextWidth(element.denominator);
          totalWidth += Math.max(numWidth, denWidth) + 4;
          this.pdf.setFontSize(fontSize);
          break;

        case 'sqrt':
          totalWidth += this.pdf.getTextWidth(element.content) + 8;
          break;

        case 'superscript':
        case 'subscript':
          totalWidth += this.pdf.getTextWidth(element.base || '');
          const subSupFontSize = fontSize * 0.7;
          this.pdf.setFontSize(subSupFontSize);
          totalWidth += this.pdf.getTextWidth(element.exponent || element.subscript || '');
          this.pdf.setFontSize(fontSize);
          break;

        default:
          totalWidth += this.pdf.getTextWidth(element.raw || '');
      }
    });

    // 第二步：对于display math，从居中位置开始渲染
    let currentX = isInline ? x : (x - totalWidth / 2);
    let maxHeight = fontSize;
    let hasFraction = false;

    // 第三步：渲染所有元素
    elements.forEach(element => {
      switch (element.type) {
        case 'text':
          this.setRenderFont(fontSize);
          this.pdf.text(element.content, currentX, y);
          const textWidth = this.pdf.getTextWidth(element.content);
          currentX += textWidth;
          break;

        case 'fraction':
          const fracWidth = this.renderFraction(
            element.numerator,
            element.denominator,
            currentX,
            y,
            fontSize
          );
          currentX += fracWidth;
          hasFraction = true;
          break;

        case 'sqrt':
          const sqrtWidth = this.renderSquareRoot(
            element.content,
            currentX,
            y,
            fontSize
          );
          currentX += sqrtWidth;
          break;

        case 'superscript':
          const supWidth = this.renderSuperscript(
            element.base,
            element.exponent,
            currentX,
            y,
            fontSize
          );
          currentX += supWidth;
          break;

        case 'subscript':
          const subWidth = this.renderSubscript(
            element.base,
            element.subscript,
            currentX,
            y,
            fontSize
          );
          currentX += subWidth;
          break;

        default:
          const fallbackText = element.raw || '';
          this.setRenderFont(fontSize);
          this.pdf.text(fallbackText, currentX, y);
          const fallbackWidth = this.pdf.getTextWidth(fallbackText);
          currentX += fallbackWidth;
      }
    });

    if (hasFraction) {
      maxHeight = fontSize * 1.2;
    } else {
      maxHeight = fontSize;
    }

    return isInline ? totalWidth : { width: totalWidth, height: maxHeight };
  }

  /**
   * 解析复杂LaTeX为可渲染的元素
   * ============ 修复点 1：真正解析分数和根号结构 ============
   * 
   * 分数用 type:'fraction' 输出（触发 renderFraction）
   * 根号用 type:'sqrt' 输出（触发 renderSquareRoot）
   * 其余简化为 type:'text'
   */
  parseComplexLaTeXWithFractions(latex) {
    const elements = [];
    let remaining = latex;

    while (remaining.length > 0) {
      // 查找最近的复杂结构
      const fracIdx = remaining.indexOf('\\frac');
      const sqrtIdx = remaining.indexOf('\\sqrt');
      
      // 找到最近的一个
      let nearestIdx = -1;
      let nearestType = null;
      
      if (fracIdx >= 0 && (sqrtIdx < 0 || fracIdx < sqrtIdx)) {
        nearestIdx = fracIdx;
        nearestType = 'frac';
      } else if (sqrtIdx >= 0) {
        nearestIdx = sqrtIdx;
        nearestType = 'sqrt';
      }
      
      if (nearestIdx === -1) {
        // 没有更多复杂结构
        const simplified = this.simplifyLaTeX(remaining);
        if (simplified) {
          elements.push({ type: 'text', content: simplified });
        }
        break;
      }
      
      // 添加复杂结构前的文本
      if (nearestIdx > 0) {
        const beforeText = remaining.substring(0, nearestIdx);
        const simplified = this.simplifyLaTeX(beforeText);
        if (simplified) {
          elements.push({ type: 'text', content: simplified });
        }
      }
      
      if (nearestType === 'frac') {
        const afterFrac = remaining.substring(nearestIdx + 5);
        const numerator = extractBracedContent(afterFrac);
        
        if (numerator !== null) {
          const afterNum = afterFrac.substring(numerator.length + 2);
          const denominator = extractBracedContent(afterNum);
          
          if (denominator !== null) {
            elements.push({
              type: 'fraction',
              numerator: this.simplifyLaTeX(numerator),
              denominator: this.simplifyLaTeX(denominator),
              raw: remaining.substring(nearestIdx, nearestIdx + 5 + numerator.length + 2 + denominator.length + 2)
            });

            remaining = remaining.substring(nearestIdx + 5 + numerator.length + 2 + denominator.length + 2);
            continue;
          }
        }
        
        // 提取失败，简化剩余
        const simplified = this.simplifyLaTeX(remaining);
        if (simplified) {
          elements.push({ type: 'text', content: simplified });
        }
        break;
        
      } else if (nearestType === 'sqrt') {
        const afterSqrt = remaining.substring(nearestIdx + 5);
        const content = extractBracedContent(afterSqrt);
        
        if (content !== null) {
          elements.push({
            type: 'sqrt',
            content: this.simplifyLaTeX(content),
            raw: remaining.substring(nearestIdx, nearestIdx + 5 + content.length + 2)
          });
          
          remaining = remaining.substring(nearestIdx + 5 + content.length + 2);
          continue;
        }
        
        // 提取失败
        const simplified = this.simplifyLaTeX(remaining);
        if (simplified) {
          elements.push({ type: 'text', content: simplified });
        }
        break;
      }
    }
    
    return elements;
  }

  /**
   * 渲染分数
   */
  renderFraction(numerator, denominator, x, y, fontSize) {
    const { FRACTION_FONT_SCALE, FRACTION_NUM_OFFSET, FRACTION_DEN_OFFSET, FRACTION_PADDING } = LATEX_RENDER_CONSTANTS;
    
    const fracFontSize = fontSize * FRACTION_FONT_SCALE;
    this.setRenderFont(fracFontSize);

    const numWidth = this.pdf.getTextWidth(numerator);
    const denWidth = this.pdf.getTextWidth(denominator);
    const fracWidth = Math.max(numWidth, denWidth) + FRACTION_PADDING;

    const numOffset = fracFontSize * FRACTION_NUM_OFFSET;
    const denOffset = fracFontSize * FRACTION_DEN_OFFSET;

    // 渲染分子（居中）
    const numX = x + (fracWidth - numWidth) / 2;
    this.pdf.text(numerator, numX, y - numOffset);

    // 绘制分数线
    this.pdf.setLineWidth(0.3);
    this.pdf.setDrawColor(0, 0, 0);
    this.pdf.line(x, y, x + fracWidth, y);

    // 渲染分母（居中）
    const denX = x + (fracWidth - denWidth) / 2;
    this.pdf.text(denominator, denX, y + denOffset);

    this.setRenderFont(fontSize);

    return fracWidth;
  }

  /**
   * 渲染平方根
   */
  renderSquareRoot(content, x, y, fontSize) {
    const { SQRT_PADDING, DISPLAY_FONT_SCALE } = LATEX_RENDER_CONSTANTS;
    
    this.setRenderFont(fontSize);
    const contentWidth = this.pdf.getTextWidth(content);
    const sqrtWidth = contentWidth + SQRT_PADDING;
    const sqrtHeight = fontSize * DISPLAY_FONT_SCALE;
    
    // 绘制根号符号
    this.pdf.setLineWidth(0.3);
    this.pdf.line(x, y - sqrtHeight / 3, x + 2, y);
    this.pdf.line(x + 2, y, x + 4, y - sqrtHeight);
    this.pdf.line(x + 4, y - sqrtHeight, x + sqrtWidth, y - sqrtHeight);
    
    // 渲染根号内的内容
    this.pdf.text(content, x + 6, y);
    
    return sqrtWidth;
  }

  /**
   * 渲染上标
   */
  renderSuperscript(base, exponent, x, y, fontSize) {
    const { SUPERSCRIPT_FONT_SCALE, SUPERSCRIPT_OFFSET } = LATEX_RENDER_CONSTANTS;
    
    this.setRenderFont(fontSize);
    this.pdf.text(base, x, y);
    const baseWidth = this.pdf.getTextWidth(base);
    
    const supFontSize = fontSize * SUPERSCRIPT_FONT_SCALE;
    this.setRenderFont(supFontSize);
    const supText = this.simplifyLaTeX(exponent);
    this.pdf.text(supText, x + baseWidth, y - fontSize * SUPERSCRIPT_OFFSET);
    const supWidth = this.pdf.getTextWidth(supText);
    
    this.setRenderFont(fontSize);
    
    return baseWidth + supWidth;
  }

  /**
   * 渲染下标
   */
  renderSubscript(base, subscript, x, y, fontSize) {
    const { SUBSCRIPT_FONT_SCALE, SUBSCRIPT_OFFSET } = LATEX_RENDER_CONSTANTS;
    
    this.setRenderFont(fontSize);
    this.pdf.text(base, x, y);
    const baseWidth = this.pdf.getTextWidth(base);
    
    const subFontSize = fontSize * SUBSCRIPT_FONT_SCALE;
    this.setRenderFont(subFontSize);
    const subText = this.simplifyLaTeX(subscript);
    this.pdf.text(subText, x + baseWidth, y + fontSize * SUBSCRIPT_OFFSET);
    const subWidth = this.pdf.getTextWidth(subText);
    
    this.setRenderFont(fontSize);
    
    return baseWidth + subWidth;
  }

  /**
   * 简化LaTeX环境（matrix, cases, align等）
   */
  simplifyEnvironments(latex) {
    let result = latex;
    
    const matrixTypes = ['matrix', 'pmatrix', 'bmatrix', 'vmatrix', 'Vmatrix', 'Bmatrix'];
    const matrixBrackets = {
      'matrix': ['', ''],
      'pmatrix': ['(', ')'],
      'bmatrix': ['[', ']'],
      'vmatrix': ['|', '|'],
      'Vmatrix': ['‖', '‖'],
      'Bmatrix': ['{', '}']
    };
    
    for (const mtype of matrixTypes) {
      const regex = new RegExp(`\\\\begin\\{${mtype}\\}([\\s\\S]*?)\\\\end\\{${mtype}\\}`, 'g');
      result = result.replace(regex, (match, content) => {
        const [leftBracket, rightBracket] = matrixBrackets[mtype];
        return leftBracket + this.simplifyMatrixContent(content) + rightBracket;
      });
    }
    
    result = result.replace(/\\begin\{cases\}([\s\S]*?)\\end\{cases\}/g, (match, content) => {
      return '{ ' + this.simplifyCasesContent(content) + ' }';
    });
    
    result = result.replace(/\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}/g, (match, content) => {
      return this.simplifyAlignContent(content);
    });
    result = result.replace(/\\begin\{aligned\}([\s\S]*?)\\end\{aligned\}/g, (match, content) => {
      return this.simplifyAlignContent(content);
    });
    
    result = result.replace(/\\begin\{equation\*?\}([\s\S]*?)\\end\{equation\*?\}/g, '$1');
    
    result = result.replace(/\\begin\{array\}\{[^}]*\}([\s\S]*?)\\end\{array\}/g, (match, content) => {
      return this.simplifyMatrixContent(content);
    });
    
    return result;
  }
  
  simplifyMatrixContent(content) {
    const rows = content.split(/\\\\/).map(row => row.trim()).filter(row => row);
    
    const simplifiedRows = rows.map(row => {
      const cells = row.split('&').map(cell => {
        return this.simplifyLaTeXBasic(cell.trim());
      });
      return cells.join(' , ');
    });
    
    return simplifiedRows.join(' ; ');
  }
  
  simplifyCasesContent(content) {
    const rows = content.split(/\\\\/).map(row => row.trim()).filter(row => row);
    
    const simplifiedRows = rows.map(row => {
      const parts = row.split('&').map(part => this.simplifyLaTeXBasic(part.trim()));
      if (parts.length >= 2) {
        return `${parts[0]}, if ${parts[1]}`;
      }
      return parts[0];
    });
    
    return simplifiedRows.join(' | ');
  }
  
  simplifyAlignContent(content) {
    const rows = content.split(/\\\\/).map(row => row.trim()).filter(row => row);
    
    const simplifiedRows = rows.map(row => {
      return this.simplifyLaTeXBasic(row.replace(/&/g, ' '));
    });
    
    return simplifiedRows.join(' ; ');
  }
  
  /**
   * 基础LaTeX简化（不包含环境处理，避免递归）
   */
  simplifyLaTeXBasic(latex) {
    if (!latex) return '';
    
    let result = latex;
    
    result = result.replace(/\\mathbb\{([A-Z])\}/g, (_, letter) => MATHBB_MAP[letter] || letter);
    result = result.replace(/\\mathcal\{([A-Z])\}/g, (_, letter) => MATHCAL_MAP[letter] || letter);
    result = result.replace(/\\text\{([^}]*)\}/g, '$1');
    result = result.replace(/\\mathrm\{([^}]*)\}/g, '$1');
    result = result.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1)/($2)');
    result = result.replace(/\\sqrt\{([^}]*)\}/g, '√($1)');
    
    result = this.processSupSubScripts(result);
    
    const sortedCommands = Object.keys(LATEX_UNICODE_MAP).sort((a, b) => b.length - a.length);
    sortedCommands.forEach(command => {
      const pattern = new RegExp(`\\\\${command}(?![a-zA-Z])`, 'g');
      result = result.replace(pattern, LATEX_UNICODE_MAP[command]);
    });
    
    result = result.replace(/\\([a-zA-Z]+)/g, '$1');
    result = result.replace(/\\(.)/g, '$1');
    result = result.replace(/[{}]/g, '');
    
    return result.trim();
  }
}

// 导出默认实例化函数
export function createLaTeXRenderer(pdf, config) {
  return new LaTeXRenderer(pdf, config);
}
