// utils/export/pdfLatexRenderer.js
// LaTeX数学公式渲染器 - 使用Unicode映射和自定义绘图实现非SVG渲染

import { cleanText } from './pdfTextHelpers';

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
  'prime': '′', 'backprime': '‵', 'degree': '°'
};

// 上标数字和字母映射
const SUPERSCRIPT_MAP = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  'n': 'ⁿ', 'i': 'ⁱ', 'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ',
  'd': 'ᵈ', 'e': 'ᵉ', 'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ',
  'j': 'ʲ', 'k': 'ᵏ', 'l': 'ˡ', 'm': 'ᵐ', 'o': 'ᵒ',
  'p': 'ᵖ', 'r': 'ʳ', 's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ',
  'v': 'ᵛ', 'w': 'ʷ', 'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ'
};

// 下标数字和字母映射
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
 * LaTeX渲染器类
 */
export class LaTeXRenderer {
  constructor(pdf, config = {}) {
    this.pdf = pdf;
    this.config = {
      fontSize: config.fontSize || 10,
      color: config.color || [0, 0, 0],
      useUnicode: config.useUnicode !== false, // 默认使用Unicode
      ...config
    };
  }

  /**
   * 渲染行内LaTeX数学公式
   * @param {string} latex - LaTeX源码（不包含$符号）
   * @param {number} x - 起始X坐标
   * @param {number} y - 基线Y坐标
   * @param {number} maxWidth - 最大宽度
   * @returns {number} - 渲染后的宽度
   */
  renderInlineLaTeX(latex, x, y, maxWidth) {
    // 首先尝试简单的Unicode转换
    const simplified = this.simplifyLaTeX(latex);
    
    // 检查是否包含复杂结构（分数、矩阵等）
    if (this.hasComplexStructure(latex)) {
      return this.renderComplexLaTeX(latex, x, y, maxWidth, true);
    }
    
    // 简单公式直接渲染为Unicode文本
    this.pdf.setFontSize(this.config.fontSize);
    this.pdf.setTextColor(...this.config.color);
    
    // 设置斜体以区分数学文本
    try {
      this.pdf.setFont(this.pdf.getFont().fontName, 'italic');
    } catch (e) {
      // 如果没有斜体，保持原样
    }
    
    this.pdf.text(simplified, x, y);
    const width = this.pdf.getTextWidth(simplified);
    
    // 恢复正常字体
    try {
      this.pdf.setFont(this.pdf.getFont().fontName, 'normal');
    } catch (e) {
      // 忽略字体恢复错误
    }
    
    return width;
  }

  /**
   * 渲染块级LaTeX数学公式
   * @param {string} latex - LaTeX源码
   * @param {number} x - 起始X坐标
   * @param {number} y - 起始Y坐标
   * @param {number} maxWidth - 最大宽度
   * @returns {Object} - {width, height} 渲染后的尺寸
   */
  renderDisplayLaTeX(latex, x, y, maxWidth) {
    // 块级公式居中显示
    const centerX = x + maxWidth / 2;
    
    // 检查是否包含复杂结构
    if (this.hasComplexStructure(latex)) {
      return this.renderComplexLaTeX(latex, centerX, y, maxWidth, false);
    }
    
    // 简单公式
    const simplified = this.simplifyLaTeX(latex);
    const fontSize = this.config.fontSize * 1.2; // 块级公式稍大
    
    this.pdf.setFontSize(fontSize);
    this.pdf.setTextColor(...this.config.color);
    
    // 计算文本宽度以居中
    const textWidth = this.pdf.getTextWidth(simplified);
    const startX = centerX - textWidth / 2;
    
    // 添加背景
    const padding = 5;
    this.pdf.setFillColor(250, 250, 250);
    this.pdf.rect(startX - padding, y - fontSize * 0.8, textWidth + padding * 2, fontSize * 1.5, 'F');
    
    // 渲染文本
    this.pdf.text(simplified, startX, y);
    
    return {
      width: textWidth + padding * 2,
      height: fontSize * 1.5
    };
  }

  /**
   * 简化LaTeX为Unicode字符
   * @param {string} latex - LaTeX源码
   * @returns {string} - 转换后的Unicode文本
   */
  simplifyLaTeX(latex) {
    let result = latex;
    
    // 移除多余的空格
    result = result.replace(/\s+/g, ' ').trim();
    
    // 处理上标（简单情况）
    result = result.replace(/\^{([^}]+)}/g, (match, content) => {
      return this.convertToSuperscript(content);
    });
    result = result.replace(/\^(\w)/g, (match, char) => {
      return this.convertToSuperscript(char);
    });
    
    // 处理下标（简单情况）
    result = result.replace(/_{([^}]+)}/g, (match, content) => {
      return this.convertToSubscript(content);
    });
    result = result.replace(/_(\w)/g, (match, char) => {
      return this.convertToSubscript(char);
    });
    
    // 替换LaTeX命令为Unicode
    Object.keys(LATEX_UNICODE_MAP).forEach(command => {
      const pattern = new RegExp(`\\\\${command}(?![a-zA-Z])`, 'g');
      result = result.replace(pattern, LATEX_UNICODE_MAP[command]);
    });
    
    // 清理剩余的反斜杠
    result = result.replace(/\\([a-zA-Z]+)/g, '$1');
    result = result.replace(/\\(.)/g, '$1');
    
    // 清理花括号
    result = result.replace(/[{}]/g, '');
    
    return result;
  }

  /**
   * 转换为上标Unicode
   */
  convertToSuperscript(text) {
    return text.split('').map(char => SUPERSCRIPT_MAP[char] || char).join('');
  }

  /**
   * 转换为下标Unicode
   */
  convertToSubscript(text) {
    return text.split('').map(char => SUBSCRIPT_MAP[char] || char).join('');
  }

  /**
   * 检查是否包含复杂LaTeX结构
   */
  hasComplexStructure(latex) {
    const complexPatterns = [
      /\\frac\{/,           // 分数
      /\\sqrt[\[\{]/,       // 根号
      /\\begin\{/,          // 环境（如矩阵）
      /\\left/,             // 大括号
      /\\right/,            // 大括号
      /\\sum/,              // 求和（需要特殊布局）
      /\\int/,              // 积分（需要特殊布局）
      /\\prod/,             // 乘积
      /\\lim/,              // 极限
      /\\mathbb/,           // 黑板粗体
      /\\mathcal/,          // 花体
      /\\boldsymbol/,       // 粗体符号
      /\\overline/,         // 上划线
      /\\underline/,        // 下划线
      /\\vec/,              // 向量
      /\\hat/,              // 帽子
      /\\tilde/,            // 波浪号
      /\\dot/,              // 点
      /\\ddot/              // 双点
    ];
    
    return complexPatterns.some(pattern => pattern.test(latex));
  }

  /**
   * 渲染复杂LaTeX结构
   */
  renderComplexLaTeX(latex, x, y, maxWidth, isInline) {
    const fontSize = isInline ? this.config.fontSize : this.config.fontSize * 1.2;
    const elements = this.parseComplexLaTeX(latex);

    // 第一步：计算总宽度
    let totalWidth = 0;
    this.pdf.setFontSize(fontSize);

    elements.forEach(element => {
      switch (element.type) {
        case 'text':
          totalWidth += this.pdf.getTextWidth(element.content);
          break;

        case 'fraction':
          // 估算分数宽度
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
    let hasFraction = false;  // 标记是否包含分数

    // 第三步：渲染所有元素
    elements.forEach(element => {
      switch (element.type) {
        case 'text':
          this.pdf.setFontSize(fontSize);
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
          // 未识别的类型，渲染为普通文本
          const fallbackText = element.raw || '';
          this.pdf.setFontSize(fontSize);
          this.pdf.text(fallbackText, currentX, y);
          const fallbackWidth = this.pdf.getTextWidth(fallbackText);
          currentX += fallbackWidth;
      }
    });

    // 根据是否包含分数计算实际高度
    if (hasFraction) {
      maxHeight = fontSize * 1.2;  // 分数需要更多垂直空间
    } else {
      maxHeight = fontSize;  // 普通公式紧凑间距
    }

    return isInline ? totalWidth : { width: totalWidth, height: maxHeight };
  }

  /**
   * 解析复杂LaTeX为可渲染的元素
   */
  parseComplexLaTeX(latex) {
    const elements = [];
    let remaining = latex;
    
    // 简化解析：主要处理分数
    const fracRegex = /\\frac\{([^}]*)\}\{([^}]*)\}/;
    
    while (remaining.length > 0) {
      const fracMatch = remaining.match(fracRegex);
      
      if (fracMatch) {
        // 添加分数前的文本
        if (fracMatch.index > 0) {
          const beforeText = remaining.substring(0, fracMatch.index);
          const simplified = this.simplifyLaTeX(beforeText);
          if (simplified) {
            elements.push({ type: 'text', content: simplified });
          }
        }
        
        // 添加分数
        elements.push({
          type: 'fraction',
          numerator: this.simplifyLaTeX(fracMatch[1]),
          denominator: this.simplifyLaTeX(fracMatch[2]),
          raw: fracMatch[0]
        });
        
        remaining = remaining.substring(fracMatch.index + fracMatch[0].length);
      } else {
        // 没有更多分数，处理剩余文本
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
    // 设置较小的字体用于分数
    const fracFontSize = fontSize * 0.75;
    this.pdf.setFontSize(fracFontSize);

    const numWidth = this.pdf.getTextWidth(numerator);
    const denWidth = this.pdf.getTextWidth(denominator);
    const fracWidth = Math.max(numWidth, denWidth) + 4;

    // 进一步减小间距：分子和分母紧贴分数线
    const numOffset = fracFontSize * 0.17;  // 分子上移（距离分数线）
    const denOffset = fracFontSize * 0.5;  // 分母下移（距离分数线）

    // 渲染分子（在分数线上方，居中对齐）
    const numX = x + (fracWidth - numWidth) / 2;
    this.pdf.text(numerator, numX, y - numOffset);

    // 绘制分数线
    this.pdf.setLineWidth(0.3);
    this.pdf.setDrawColor(0, 0, 0);
    this.pdf.line(x, y, x + fracWidth, y);

    // 渲染分母（在分数线下方，居中对齐）
    const denX = x + (fracWidth - denWidth) / 2;
    this.pdf.text(denominator, denX, y + denOffset);

    // 恢复字体大小
    this.pdf.setFontSize(fontSize);

    return fracWidth;
  }

  /**
   * 渲染平方根
   */
  renderSquareRoot(content, x, y, fontSize) {
    const contentWidth = this.pdf.getTextWidth(content);
    const sqrtWidth = contentWidth + 8;
    const sqrtHeight = fontSize * 1.2;
    
    // 绘制根号符号
    this.pdf.setLineWidth(0.3);
    // 左侧勾
    this.pdf.line(x, y - sqrtHeight / 3, x + 2, y);
    // 斜线
    this.pdf.line(x + 2, y, x + 4, y - sqrtHeight);
    // 顶线
    this.pdf.line(x + 4, y - sqrtHeight, x + sqrtWidth, y - sqrtHeight);
    
    // 渲染根号内的内容
    this.pdf.setFontSize(fontSize);
    this.pdf.text(content, x + 6, y);
    
    return sqrtWidth;
  }

  /**
   * 渲染上标
   */
  renderSuperscript(base, exponent, x, y, fontSize) {
    // 渲染基数
    this.pdf.setFontSize(fontSize);
    this.pdf.text(base, x, y);
    const baseWidth = this.pdf.getTextWidth(base);
    
    // 渲染上标（使用更小的字体和向上偏移）
    const supFontSize = fontSize * 0.7;
    this.pdf.setFontSize(supFontSize);
    const supText = this.simplifyLaTeX(exponent);
    this.pdf.text(supText, x + baseWidth, y - fontSize * 0.3);
    const supWidth = this.pdf.getTextWidth(supText);
    
    // 恢复字体大小
    this.pdf.setFontSize(fontSize);
    
    return baseWidth + supWidth;
  }

  /**
   * 渲染下标
   */
  renderSubscript(base, subscript, x, y, fontSize) {
    // 渲染基数
    this.pdf.setFontSize(fontSize);
    this.pdf.text(base, x, y);
    const baseWidth = this.pdf.getTextWidth(base);
    
    // 渲染下标（使用更小的字体和向下偏移）
    const subFontSize = fontSize * 0.7;
    this.pdf.setFontSize(subFontSize);
    const subText = this.simplifyLaTeX(subscript);
    this.pdf.text(subText, x + baseWidth, y + fontSize * 0.3);
    const subWidth = this.pdf.getTextWidth(subText);
    
    // 恢复字体大小
    this.pdf.setFontSize(fontSize);
    
    return baseWidth + subWidth;
  }
}

// 导出默认实例化函数
export function createLaTeXRenderer(pdf, config) {
  return new LaTeXRenderer(pdf, config);
}
