// 代码拆分迁移说明
// =====================

## 文件结构说明

原始文件 `pdfExportManager.js` (约2500行) 已被拆分为三个模块：

### 1. pdfTextHelpers_new.js (约 400 行)
- **职责**：纯文本处理函数
- **主要功能**：
  - cleanText - 文本清理和标准化
  - parseTextWithCodeBlocksAndLatex - 解析代码块和LaTeX
  - parseInlineMarkdown - 解析行内Markdown格式
  - applyCJKPunctuationRules - 中文标点避头尾规则
  - parseCodeLineBold - 代码行格式解析
  - safeSetFont, safeGetTextWidth, safeRenderText - 安全的PDF文本操作

### 2. pdfContentRenderers.js (约 1200 行)
- **职责**：内容渲染逻辑
- **主要功能**：
  - ContentRenderer类 - 所有渲染方法的容器
  - renderTitle, renderMetadata - 文档头部渲染
  - renderMessage - 消息渲染主流程
  - renderBody - 支持LaTeX的正文渲染
  - renderCodeBlock - 代码块渲染（支持跨页）
  - renderMarkdownText - Markdown格式文本渲染
  - renderLatexToImage - LaTeX公式转图像
  - renderTOCWithLinks - 目录生成
  - 各种特殊内容渲染（thinking, artifacts, tools等）

### 3. pdfExportManager_new.js (约 300 行)
- **职责**：主控制器和流程管理
- **主要功能**：
  - PDFExportManager类 - 主导出管理器
  - exportToPDF - 主导出流程控制
  - 字体加载和管理
  - 分页控制（checkPageBreak）
  - 书签和页脚管理
  - 文件名生成

## 迁移步骤

### 1. 更新导入语句
将原来的：
```javascript
import { pdfExportManager } from './utils/export/pdfExportManager';
```

改为：
```javascript
import { pdfExportManager } from './utils/export/pdfExportManager_new';
```

### 2. 确保依赖文件存在
新文件需要这些依赖：
- `pdfFontHelper.js` - 字体加载辅助（原有文件）
- `../fileParser` - DateTimeUtils工具（原有文件）
- npm包：jspdf, katex, html2canvas

### 3. 测试验证
建议的测试步骤：
1. 先用简单对话测试基本功能
2. 测试包含代码块的对话
3. 测试包含LaTeX公式的对话
4. 测试长对话的分页效果
5. 测试中文字体加载

## 模块化优势

1. **更好的可维护性**
   - 每个模块职责单一
   - 易于定位和修复问题
   - 减少代码耦合

2. **更容易测试**
   - 纯函数模块可以独立测试
   - ContentRenderer可以mock manager进行测试

3. **更灵活的扩展**
   - 可以独立升级某个模块
   - 易于添加新的渲染器或文本处理函数

## 注意事项

1. **循环依赖**：已通过合理的模块设计避免
2. **性能**：模块化不会影响性能，实际上可能因为更清晰的代码结构而提升
3. **兼容性**：对外接口完全兼容，不需要修改调用代码

## 后续优化建议

1. 可以进一步将 PDF_STYLES 独立为配置文件
2. 可以考虑将 LaTeX 渲染逻辑独立为单独模块
3. 可以添加单元测试覆盖关键功能