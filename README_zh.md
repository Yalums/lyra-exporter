[**Read this document in English**](https://github.com/Yalums/lyra-exporter/blob/main/README.md)

> 个人项目，便于使用、功能完备的AI平台对话筛选、导出应用，在数百个对话窗口中找出需要的部分。从图片、思考过程，到附件、Artifacts、Canvas、工具调用细节。


## 功能特性

- **对话管理**: 加载多个Claude、ChatGPT、Gemini、NotebookLM、Google AI Studio平台的对话JSON文件，**支持导出整个Claude、ChatGPT账号对话数据并进行管理**
- **智能查找**: 搜索消息内容，查找有图片附件、思考过程和创建了 Artifacts 的对话
- **标记系统**: 标记消息为完成、重要或删除，并在导出时保留特定格式
- **灵活导出**: 导出为Markdown格式，支持批量导出
- **分支检测**: 自动检测和显示对话分支
- **全功能读取**: 智能识别图片附件、思考过程、Markdown 语法

## 🔌 Lyra Exporter Fetch 配套脚本

![图片预览](https://i.postimg.cc/50tzSfFd/Pix-Pin-2025-10-10-15-32-21.png)

使用流程

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展
2. 从 [Greasy Fork](https://greasyfork.org/zh-CN/scripts/539579-lyra-s-exporter-fetch) 安装 Lyra Exporter Fetch 脚本
3. 访问 [Claude.ai](https://claude.ai/)、[ChatGPT](https://chatgpt.com/)、[Gemini](gemini.google.com)、[AI Studio](https://aistudio.google.com/)、[NotebookLM](https://notebooklm.google.com/)
4. 点击页面上的导出按钮
5. 选择导出选项（单个对话 / 完整账号）
6. 数据自动发送到 Lyra Exporter 或下载到本地

| 全局搜索功能 |
|--------|
| ![搜索](https://i.postimg.cc/xCc30G7M/Pix-Pin-2025-10-16-16-29-47.png) |

---

| 卡片式对话查看 |
|--------|
| ![对话管理](https://i.postimg.cc/Jz5ySypd/Pix-Pin-2025-10-16-16-27-26.png) |

---

| 时间线消息管理 |
|--------|
| ![应用预览](https://i.postimg.cc/GpdNKffF/Pix-Pin-2025-10-16-16-24-37.png) |


# 核心功能

### 1. 多平台数据支持

**广泛的平台兼容性**：

* **Claude/ChatGPT**: 支持从单个对话到完整账号的对话导出（包含所有对话和项目、附件、Artifacts等）
* **Gemini**: 完整支持 Gemini 对话格式（含图片和Canvas）
* **NotebookLM**: 智能识别 NotebookLM 导出数据
* **Google AI Studio**: 支持 AI Studio 对话格式
* **JSONL**: 部分支持 SillyTavern 对话格式

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

## 🔄 主要业务流程

### **文件加载流**
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

**1. 配合脚本使用（推荐）**

1. 安装 Lyra Exporter Fetch 脚本（见上方）
2. 在对应网页点击`预览`按钮
3. 数据自动加载到 Github Pages 上托管的Lyra Exporter

**2. 手动加载文件**

1. 打开 Lyra Exporter
2. 在对应网页点击"保存为JSON"按钮
3. 运行 Lyra Exporter，选择从 Claude、Gemini 等平台导出的 JSON 文件
4. 开始管理和整理为 markdown 文档



### Lyra Exporter (React 应用)

**在线使用**：

* 直接访问: [https://yalums.github.io/lyra-exporter/](https://yalums.github.io/lyra-exporter/) 

**本地构建**：

```
# 克隆仓库 (或从Releases中下载最新打包的仓库)
git clone https://github.com/Yalums/lyra-exporter.git
cd lyra-exporter

# 安装依赖
npm install

# 启动开发服务器
npm start
```
