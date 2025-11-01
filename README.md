# Lyra Exporter Documentation

[**阅读中文文档**](https://github.com/Yalums/lyra-exporter/blob/main/README_zh.md)

**A personal project co-created with Claude.** This is a user-friendly, feature-rich tool designed to help you manage and export conversations from AI platforms. Filter through hundreds of conversations to find exactly what you need—from images and thinking processes to attachments, Artifacts, and tool call details.

## Features

- **Conversation Management**: Load multiple conversation JSON files from Claude, ChatGPT, Gemini, NotebookLM, and Google AI Studio. **Supports exporting entire Claude, ChatGPT account data for comprehensive management**
- **Smart Search**: Search message content, find conversations with image attachments, thinking processes, and Artifacts
- **Tagging System**: Mark messages as completed, important, or deleted, with format preservation during export
- **Flexible Export**: Export to Markdown format with batch export support
- **Branch Detection**: Automatically detect and visualize conversation branches
- **Rich Content Parsing**: Intelligently recognize image attachments, thinking processes, and Markdown syntax



## 🔌 Lyra Exporter Fetch Companion Script

Lyra Exporter relies on browsers to safely obtain conversation data. With this open-source script, transfer chat records worth treasuring

1. Install the [Tampermonkey](https://www.tampermonkey.net/) browser extension
2. Install Lyra Exporter Fetch script from [Greasy Fork](https://greasyfork.org/en/scripts/539579-lyra-s-exporter-fetch)
3. Visit [Claude.ai](https://claude.ai/), [ChatGPT](https://chatgpt.com), [Gemini](https://gemini.google.com), [AI Studio](https://aistudio.google.com/), or [NotebookLM](https://notebooklm.google.com/)
4. Click the export button on the page
5. Choose export options (single conversation / full account)
6. Data is automatically sent to Lyra Exporter or downloaded locally

## Recommended Workflow

Rather than building a complex local search engine, here's my practical approach: (just for reference, be care for your personal data)

1. Use Lyra Exporter to export conversations
2. Identify 3-5 related conversations worth organizing
3. Feed them to NotebookLM for analysis and synthesis
4. Archive refined insights in Obsidian

Fast, nearly free, and gets the job done.

| Lyra Exporter |
|--------|
| ![Welcome Page](https://i.postimg.cc/T3cSmKBK/Pix-Pin-2025-10-15-08-32-35.png)|

---

| Global Search |
|--------|
| ![Search](https://i.postimg.cc/C1xSd5Hp/Pix-Pin-2025-10-16-16-33-44.png) |

---

| Card-Style Conversation View |
|--------|
| ![Conversation Management](https://i.postimg.cc/05Fq2JqY/Pix-Pin-2025-10-15-08-46-09.png)|

---

| Timeline Message Management |
|--------|
| ![App Preview](https://i.postimg.cc/hG1SX40R/Pix-Pin-2025-10-15-08-44-10.png) |

---

# Core Capabilities

### 1. Multi-Platform Data Support

**Broad Platform Compatibility**:

* **Claude, ChatGPT**: From single conversations to complete account exports (including all conversations, projects, attachments, Artifacts, etc.)
* **Gemini**: Full support for Gemini conversation format (including images and canvas)
* **NotebookLM**: Intelligent recognition of NotebookLM export data
* **Google AI Studio**: Support for AI Studio conversation format
* **SillyTavern**: Support for jsonl with branches splits.

**Smart Format Recognition**:

* Auto-detect file format types—no manual selection needed
* Batch load multiple files to manage all conversations at once
* File type compatibility checks to prevent confusion

### 2. Unified Conversation Management

**Dual View Modes**:

* **Conversation List View**: Card-based display of all conversations for quick browsing and selection
* **Timeline View**: Complete display of all messages in a conversation with branch visualization

**Intelligent Search & Filtering**:

* Real-time search across message content and conversation titles
* Quick filter for conversations with image attachments
* Find messages with thinking processes
* Locate conversations with created Artifacts
* Support for multi-condition combined filtering

**Branch Visualization**:

* Auto-detect conversation branch structures
* Clearly mark branch points and paths
* Easily trace the complete evolution of conversations

**Star System** (preserves Claude's conversation favorites):

* Mark important conversations
* Filter by starred status
* Add custom stars
* Reset to Claude's initial recorded state

### 3. Message Tagging System

**Three Tag Types**:

* ✅ **Completed**: Mark processed messages
* ⭐ **Important**: Highlight crucial content
* 🗑️ **Deleted**: Mark messages for cleanup

**Smart Tag Management**:

* Cross-file tag statistics
* Option to export only tagged content
* Auto-persist tag information
* Real-time tag count updates

### 4. Customizable Export Options

**Markdown Format Export**:

* Preserve original message format and structure
* Support code highlighting and syntax annotation

**Rich Export Options**:

* Include/exclude timestamps
* Include/exclude thinking processes
* Include/exclude Artifacts content
* Include/exclude tool usage records (web search, code execution, etc.)
* Include/exclude citation information

**Flexible Export Scope**:

* **Current Conversation**: Export the conversation you're viewing
* **Operated Conversations**: Batch export all marked or modified conversations
* **All Conversations**: One-click export of all loaded conversations

**Batch Export**:

* Multiple conversations automatically packaged as ZIP files (gradually optimizing multi-conversation export experience)
* Smart file naming (title + timestamp)
* Support for large-scale exports

### 5. Progressive Content Parser

**Rich Format Records in Conversations**:

* **Image Attachments**: Display thumbnails, click to view full size, preserve image references in exports
* **Thinking Processes**: Complete preservation of Claude's internal thinking, collapsible display
* **Artifacts**: Recognize all created code, documents, charts, and components
* **Tool Calls**: Record web searches, code execution, file reading, and other operations
* **Citations**: Preserve all web search reference sources

**Message Detail Viewing**:

* Multi-tab display: Content / Thinking / Artifacts / User Attachments
* Copy individual messages

### 6. Smart Statistics & Custom Sorting

**Real-Time Statistics**:

* Conversation count, message count
* Tag statistics (completed/important/deleted)
* Search result counts

**Multiple Sorting Options**:

* Sort by update time
* Sort by creation time
* Sort by title
* Support for custom sorting

---

## 🔄 Main Business Flows

### **File Loading Flow**
1. User selects files → `handleFileLoad`
2. File validation and deduplication → `loadFiles`
3. Compatibility check → `checkFileTypeCompatibility`
4. Data parsing → `extractChatData`
5. Format detection → `detectFileFormat`
6. Specific parser processing → `extractXxxData`
7. Branch detection → `detectBranches`
8. UI update and view switching

### **Tagging System Flow**
1. User clicks tag → `handleMarkToggle`
2. Tag state toggle → `toggleMark`
3. localStorage storage → `saveMarks`
4. Statistics update → `getMarkStats`
5. UI feedback update

### **Export Flow**
1. User configures export options
2. Determine export scope → current/operated/all
3. Collect target data → `exportCurrentFile/exportOperatedFiles/exportAllFiles`
4. Filter and screen → based on tags and configuration
5. Generate Markdown → `exportChatAsMarkdown`
6. Save file → `saveTextFile`

### **Search & Filter Flow**
1. User enters search terms → `handleSearch`
2. Real-time search → `useSearch.search`
3. Filter results → `filteredMessages`
4. Highlight display → UI component handling

---

## 🔐 Security Considerations

1. **Message Source Verification**: API_CONFIG.ALLOWED_ORIGINS whitelist
2. **File Size Limits**: FILE_LIMITS.MAX_FILE_SIZE (100MB)
3. **File Type Validation**: JSON format only
4. **XSS Protection**: All user content processed before display
5. **Local Storage Isolation**: UUID prefix for storage keys



## Installation & Usage

### Lyra Exporter (Web App)

**Use Online**:

- Direct access: https://yalums.github.io/lyra-exporter/

**Build Locally**:

```bash
# Clone the repository (or Download from the releases)
git clone https://github.com/Yalums/lyra-exporter.git
cd lyra-exporter

# Install dependencies
npm install

# Start development server
npm start
```

### Usage Steps

**Method 1: With Companion Script (Recommended)**

1. Install Lyra Exporter Fetch script (see above)
2. Click the "Preview" button on the respective platform's webpage
3. Data automatically loads into Lyra Exporter hosted on GitHub Pages

**Method 2: Manual File Loading**

1. Open Lyra Exporter
2. Click the "Save as JSON" button on the respective platform's webpage
3. Run Lyra Exporter and select JSON files exported from Claude, Gemini, or other platforms
4. Start managing and organizing into Markdown documents
