# Lyra Exporter 功能模块代码函数文档

> 它是我和Claude一起完成的个人项目。我希望能做出一个方便使用、功能完备的AI平台对话筛选、导出应用，在数百个对话窗口中找出需要的部分。从图片、思考过程，到附件、Artifacts、工具调用细节。


## 功能特性

- **对话管理**: 加载多个Claude、Gemini、NotebookLM、Google AI Studio平台的对话JSON文件，**支持导出整个Claude账号对话数据并进行管理**
- **智能查找**: 搜索消息内容，查找有图片附件、思考过程和创建了 Artifacts 的对话
- **标记系统**: 标记消息为完成、重要或删除，并在导出时保留特定格式
- **灵活导出**: 导出为Markdown格式，支持批量导出
- **分支检测**: 自动检测和显示对话分支
- **全功能读取**: 智能识别图片附件、思考过程、Markdown 语法

| 卡片式对话查看 |
|--------|
| ![对话管理](https://i.postimg.cc/VsWyC1Wv/7198f1da897ddcccf1eb2aea75e6c9ef.png)|

---

| 时间线消息管理 |
|--------|
| ![应用预览](https://i.postimg.cc/nrSCkWDb/Pix-Pin-2025-10-10-15-51-36.png) |


# 核心功能

### 1. 多平台数据支持

**广泛的平台兼容性**：

* **Claude**: 支持从单个对话到完整账号的对话导出（包含所有对话和项目、附件、Artifacts等）
* **Gemini**: 完整支持 Gemini 对话格式（含图片）
* **NotebookLM**: 智能识别 NotebookLM 导出数据
* **Google AI Studio**: 支持 AI Studio 对话格式

**智能格式识别**：

* 自动检测文件格式类型，无需手动选择
* 多文件批量加载，一次性管理所有对话
* 文件类型兼容性检查，避免混淆

### 2. 统一的对话管理

**双视图模式**：

* **对话列表视图**: 以卡片形式展示所有对话，快速浏览和选择
* **时间线视图**: 完整展示单个对话的所有消息，支持分支可视化

**智能搜索与筛选**：

* 实时搜索消息内容和对话标题
* 快速筛选包含图片附件的对话
* 查找有思考过程的消息
* 定位创建了 Artifacts 的对话
* 支持多条件组合筛选

**分支可视化**：

* 自动检测对话分支结构
* 清晰标注分支点和分支路径
* 轻松追溯对话的完整演变过程

**星标系统** (保留 Claude 的对话收藏)：

* 标记重要对话
* 按星标状态筛选
* 自定义添加星标
* 支持重置回 Claude 记录的初始状态

### 3. 消息标记系统

**三种标记类型**：

* ✅ **已完成**: 标记已处理完成的消息
* ⭐ **重要**: 高亮重要内容
* 🗑️ **已删除**: 标记待清理的消息

**智能标记管理**：

* 跨文件统计标记数量
* 导出时可选择仅导出已标记内容
* 标记信息自动持久化
* 实时更新标记统计

### 4. 自定义导出功能

**Markdown 格式导出**：

* 保持原始消息格式和结构
* 支持代码高亮和语法标注

**丰富的导出选项**：

* 是否包含时间戳
* 是否包含思考过程 (Thinking)
* 是否包含 Artifacts 内容
* 是否包含工具使用记录（网页搜索、代码执行等）
* 是否包含引用信息 (Citations)

**灵活的导出范围**：

* **当前对话**: 导出正在查看的对话
* **操作过的对话**: 批量导出所有标记或修改过的对话
* **所有对话**: 一键导出所有已加载的对话

**批量导出**：

* 多个对话自动打包成 ZIP 文件（正在逐步优化多对话导出体验）
* 智能文件命名（标题+时间戳）
* 支持大规模导出

### 5. 逐步完善的内容解析器

**对话中的丰富格式记录**：

* **图片附件**: 显示缩略图，支持点击查看大图，导出时保留图片引用
* **思考过程**: 完整保留 Claude 的内部思考（Thinking），可折叠显示
* **Artifacts**: 识别所有创建的代码、文档、图表、组件
* **工具调用**: 记录网页搜索、代码执行、文件读取等操作
* **引用信息**: 保留所有网页搜索的引用来源

**消息详情查看**：

* 多标签页展示：内容 / 思考 / Artifacts / 用户附件
* 复制单条消息

### 6. 智能统计与自定义排序

**实时统计**：

* 对话数量、消息数量
* 标记统计（已完成/重要/已删除）
* 搜索结果统计

**多种排序方式**：

* 按更新时间排序
* 按创建时间排序
* 按标题排序
* 支持自定义排序

---

## 🔌 Lyra's Exporter Fetch 配套脚本

![图片预览](https://i.postimg.cc/50tzSfFd/Pix-Pin-2025-10-10-15-32-21.png)

使用流程

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展
2. 从 [Greasy Fork](https://greasyfork.org/zh-CN/scripts/539579-lyra-s-exporter-fetch) 安装 Lyra's Exporter Fetch 脚本
3. 访问 [Claude.ai](https://claude.ai/)、[Gemini](gemini.google.com)、[AI Studio](https://aistudio.google.com/)、[NotebookLM](https://notebooklm.google.com/)
5. 点击页面上的导出按钮
6. 选择导出选项（单个对话 / 完整账号）
7. 数据自动发送到 Lyra Exporter 或下载到本地

---



## 📋 目录结构概览

```
src/
├── components/     # UI组件层
├── hooks/
├── langs/          # 国际化配置
├── styles/         # 样式文件
└── utils/          # 工具函数
```

---

## 🔧 核心工具函数 (utils/)

### `fileParser.js` - 数据解析引擎

#### **格式检测**

**`detectFileFormat(jsonData)`**
- **功能**: 自动检测JSON文件格式类型
- **支持格式**:
  - `gemini_notebooklm`: Gemini/NotebookLM导出格式
  - `claude_full_export`: Claude完整导出格式
  - `claude`: Claude单个对话格式
  - `unknown`: 未知格式
- **返回**: 格式字符串标识

#### **主解析入口**

**`extractChatData(jsonData, fileName)`**
- **功能**: 统一的数据解析入口
- **流程**: 格式检测 → 调用对应解析器 → 返回标准化数据
- **返回**: 标准化的对话数据结构

#### **Claude格式解析器**

**`extractClaudeData(jsonData)`**
- **功能**: 解析Claude单个对话格式
- **处理内容**:
  - 消息内容(text/image/thinking)
  - 工具使用记录(tool_use/tool_result)
  - Artifacts内容
  - 引用信息(citations)
  - 附件图片
- **返回**: 包含meta_info和chat_history的数据结构

#### **Gemini/NotebookLM解析器**

**`extractGeminiNotebookLMData(jsonData, fileName)`**
- **功能**: 解析Gemini/NotebookLM导出格式
- **特性**:
  - 支持human/assistant对话对
  - 图片内容处理(base64格式)
  - 平台识别(gemini/notebooklm/aistudio)
- **返回**: 统一格式的对话数据

#### **Claude完整导出解析器**

**`extractClaudeFullExportData(jsonData, fileName)`**
- **功能**: 解析Claude完整导出格式(包含多个对话)
- **特性**:
  - 多对话管理
  - 项目分组
  - 对话头部标记
  - 星标状态
- **返回**: 包含views(conversations/projects)的扩展数据结构

#### **分支检测**

**`detectBranches(processedData)`**
- **功能**: 检测消息分支和分支点
- **算法**: 构建父子关系图 → 标记分支点 → 标记分支路径
- **返回**: 添加branches和branch_points的增强数据

#### **辅助工具函数**
- `parseTimestamp(timestampStr)`: 解析时间戳为本地化字符串
- `formatFileSize(bytes)`: 格式化文件大小显示
- `getImageDisplayData(imageInfo)`: 获取图片显示数据
- `createMessage()`: 创建标准消息对象
- `processContentArray()`: 处理content数组
- `processMessageImages()`: 处理消息中的图片
- `processGeminiImage()`: 处理Gemini格式图片
- `finalizeDisplayText()`: 生成最终显示文本
- `extractArtifact()`: 提取artifact信息
- `extractToolUse()`: 提取工具使用信息
- `extractToolResult()`: 提取工具结果信息
- `markBranchPath()`: 标记分支路径
- `extractBranchInfo()`: 提取分支信息

### `exportManager.js` - 导出管理模块

#### **Markdown生成**

**`exportChatAsMarkdown(processedData, config)`**

- **功能**: 将处理后的数据导出为Markdown格式
- **配置选项**:
  - `exportObsidianMetadata`: Obsidian元数据支持
  - `exportMarkedOnly`: 仅导出已标记消息
  - `includeTimestamps`: 包含时间戳
  - `includeThinking`: 包含思考过程
  - `includeArtifacts`: 包含Artifacts
  - `includeTools`: 包含工具使用
  - `includeCitations`: 包含引用
  - `obsidianProperties`: 自定义Obsidian属性
  - `obsidianTags`: Obsidian标签
- **特性**: 支持分支标记、详情折叠、表格格式

#### **文件保存**

**`saveTextFile(text, fileName)`**
- **功能**: 保存文本到文件
- **实现**: Blob + URL.createObjectURL
- **返回**: 成功/失败布尔值

#### **导出处理函数**

**`handleExport(exportOptions, ...params)`**
- **功能**: 统一的导出处理入口
- **参数**:
  - `exportOptions`: 导出选项配置
  - `viewMode`: 当前视图模式
  - `processedData`: 处理后的数据
  - `currentFile`: 当前文件
  - `sortedMessages`: 排序后的消息
  - `hasCustomSort`: 是否有自定义排序
  - `marks`: 标记数据
  - `operatedFiles`: 操作过的文件集合
  - `files`: 所有文件列表
  - `currentFileIndex`: 当前文件索引
- **导出范围**:
  - `current`: 当前时间线文件
  - `operated`: 有过操作的文件
  - `all`: 所有加载的文件
- **流程**: 数据收集 → 筛选过滤 → 生成Markdown → 保存文件

#### **内部处理函数**
- `exportCurrentFile()`: 导出当前文件
- `exportOperatedFiles()`: 导出操作过的文件
- `exportAllFiles()`: 导出所有文件
- `generateMarkdownContent()`: 生成Markdown内容
- `getFileMarks()`: 获取文件标记数据
- `getCurrentDate()`: 获取当前日期
- `getCurrentDateTime()`: 获取当前时间

### `constants.js` - 常量配置中心

- `SORT_OPTIONS`: 排序选项
- `MESSAGE_ACTIONS`: 消息操作类型

#### **标记和视图类型**
- `MARK_TYPES`: 标记类型(completed/important/deleted)
- `VIEW_MODES`: 视图模式(conversations/timeline)
- `FILE_FORMATS`: 文件格式标识
- `PLATFORMS`: 平台类型标识
- `SENDER_TYPES`: 发送者类型
- `TAB_TYPES`: 标签页类型

#### **存储配置**
- `STORAGE_KEYS`: localStorage键名配置
- `DEFAULT_EXPORT_CONFIG`: 导出默认配置
- `FILTER_DEFAULTS`: 筛选器默认值
- `DATE_RANGE_OPTIONS`: 日期范围选项
- `STARRED_FILTER_OPTIONS`: 星标筛选选项

### `messageHandler.js` - 消息处理器

**`createPostMessageHandler(fileActions, setError)`**
- **功能**: 创建postMessage事件处理器
- **支持消息类型**:
  - `LYRA_HANDSHAKE`: 握手确认
  - `LYRA_LOAD_DATA`: 加载数据
  - `LYRA_ERROR`: 错误处理
- **安全性**: 验证消息来源白名单

### `statsCalculator.js` - 统计计算器

**`getAllMarksStats(files, processedData, currentFileIndex)`**

- **功能**: 计算所有文件的标记统计

**`calculateViewStats(viewMode, ...params)`**
- **功能**: 根据视图模式计算统计数据

**`getSearchResultStats(viewMode, filteredMessages, ...params)`**
- **功能**: 获取搜索结果统计

---

## 🎨 UI组件层 (components/)

### 核心视图组件

**`UnifiedCard.js`**

- **功能**: 卡片网格视图(文件卡片/对话卡片)
- **特性**: 星标切换、文件管理、卡片选择

**`ConversationTimeline.js`**

- **功能**: 消息时间线视图
- **特性**: 消息标记、排序、分支显示、搜索高亮

**`FullExportCardFilter.js`**

- **功能**: 对话筛选器(仅claude_full_export格式)
- **特性**: 多维度筛选、实时统计

**`MessageDetail.js`**

- **功能**: 消息详情模态框
- **特性**: 标签页切换(内容/思考/Artifacts/JSON)

---

## 🚀 主应用逻辑 (App.js)

### **状态管理**

#### **文件相关状态**
- `files`: 文件列表
- `currentFile`: 当前文件
- `currentFileIndex`: 当前文件索引
- `processedData`: 处理后的数据
- `fileMetadata`: 文件元数据
- `operatedFiles`: 操作过的文件集合

#### **视图相关状态**
- `viewMode`: 视图模式(conversations/timeline)
- `selectedFileIndex`: 选中的文件索引
- `selectedConversationUuid`: 选中的对话UUID
- `selectedMessageIndex`: 选中的消息索引
- `showMessageDetail`: 是否显示消息详情
- `activeTab`: 激活的标签页

#### **导出相关状态**
- `showExportPanel`: 是否显示导出面板
- `exportOptions`: 导出选项配置

#### **其他状态**
- `scrollPositions`: 滚动位置记录
- `error`: 错误信息

### **核心功能处理**

#### **文件处理**
**`handleFileLoad(e)`**
- **功能**: 处理文件选择
- **调用**: fileActions.loadFiles()

**`handleFileRemove(fileIndex)`**
- **功能**: 移除文件
- **副作用**: 重置视图状态

#### **视图切换**
**`handleCardSelect(card)`**
- **功能**: 处理卡片选择
- **逻辑**:
  - 文件卡片 → 判断格式 → 切换视图
  - 对话卡片 → 设置对话UUID → 进入时间线

**`handleBackToConversations()`**
- **功能**: 返回对话列表
- **特性**: 恢复滚动位置

#### **标记和星标**
**`handleMarkToggle(messageIndex, markType)`**
- **功能**: 切换消息标记
- **副作用**: 添加到operatedFiles

**`handleStarToggle(conversationUuid, nativeIsStarred)`**
- **功能**: 切换星标状态(仅claude_full_export)

#### **导出功能**
**`handleExport()`**
- **功能**: 执行导出操作
- **调用**: exportHandler()
- **参数**: 传递所有必要的状态数据

#### **消息处理**
**`handlePostMessage`**
- **功能**: 处理跨窗口消息
- **使用**: createPostMessageHandler创建

**`handleMessageSelect(messageIndex)`**
- **功能**: 选择消息显示详情

### **计算属性**

**`allCards`** (useMemo)
- **功能**: 生成所有卡片数据
- **逻辑**: 根据viewMode和格式生成文件卡片或对话卡片

**`timelineMessages`** (useMemo)
- **功能**: 获取时间线消息
- **过滤**: 根据selectedConversationUuid过滤

**`currentConversation`** (useMemo)
- **功能**: 获取当前对话信息
- **增强**: 包含星标状态

**`searchTarget`** (useMemo)
- **功能**: 确定搜索目标数据
- **逻辑**: 根据视图模式返回卡片或消息

### **辅助功能**

**`getStats()`**
- **功能**: 获取统计数据
- **调用**: calculateViewStats()

**`getSearchPlaceholder()`**
- **功能**: 动态生成搜索框占位符
- **逻辑**: 根据视图和格式返回不同提示

### **副作用处理**

**主题初始化** (useEffect)

- 从localStorage读取主题设置
- 应用到document.documentElement

**PostMessage监听** (useEffect)
- 监听window.message事件
- 处理外部数据加载请求

**文件自动切换视图** (useEffect)
- 检测新加载文件格式
- 自动切换到合适的视图模式

---

## 📊 数据流架构图

```
用户操作
    ↓
App.js (状态管理)
    ↓
Custom Hooks (业务逻辑)
    ↓
Utils Functions (数据处理)
    ↓
Components (UI渲染)
    ↓
用户界面
```

---

## 🎯 关键设计模式

### 1. **格式驱动UI适配**
- 根据数据格式(`claude` `claude_full_export` `gemini`)自动选择UI模式
- 功能差异化：基础功能通用，高级功能按格式启用

### 3. **统一UUID管理**
- 文件、对话、消息统一标识符管理
- 支持localStorage持久化存储

### 4. **分层数据处理**
- 原始数据 → 格式检测 → 特定解析 → 标准化结构
- 支持多平台格式的对话文件统一处理

---

## 🔄 主要业务流程

### **文件加载流程**
1. 用户选择文件 → `handleFileLoad`
2. 文件验证和去重 → `loadFiles`
3. 兼容性检查 → `checkFileTypeCompatibility`
4. 数据解析 → `extractChatData`
5. 格式检测 → `detectFileFormat`
6. 特定解析器处理 → `extractXxxData`
7. 分支检测 → `detectBranches`
8. UI更新和视图切换

### **标记系统流程**
1. 用户点击标记 → `handleMarkToggle`
2. 标记状态切换 → `toggleMark`
3. localStorage存储 → `saveMarks`
4. 统计更新 → `getMarkStats`
5. UI反馈更新

### **导出流程**
1. 用户配置导出选项
2. 确定导出范围 → current/operated/all
3. 收集目标数据 → `exportCurrentFile/exportOperatedFiles/exportAllFiles`
4. 筛选和过滤 → 根据标记和配置
5. 生成Markdown → `exportChatAsMarkdown`
6. 保存文件 → `saveTextFile`

### **搜索筛选流程**
1. 用户输入搜索词 → `handleSearch`
2. 实时搜索 → `useSearch.search`
3. 结果过滤 → `filteredMessages`
4. 高亮显示 → UI组件处理

---

## 🔐 安全性考虑

1. **消息来源验证**: API_CONFIG.ALLOWED_ORIGINS白名单
2. **文件大小限制**: FILE_LIMITS.MAX_FILE_SIZE (100MB)
3. **文件类型验证**: 仅支持JSON格式
4. **XSS防护**: 所有用户内容经过处理后显示
5. **本地存储隔离**: 使用UUID作为存储键前缀

---

## 使用方法

1. 点击"加载文件"按钮，选择Claude等平台导出的JSON文件
2. 在左侧查看文件列表和消息列表
3. 点击消息查看详情（内容、思考过程、Artifacts）
4. 使用搜索功能快速定位消息
5. 标记重要消息或已完成的消息
6. 导出所需的对话内容
