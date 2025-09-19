// utils/exportModule.js
// 合并后的导出模块，整合了原exportManager.js和exportHelper.js的功能

import { generateFileCardUuid } from '../hooks/useFileUuid.js';

// ==================== 工具函数 ====================

// 获取当前日期字符串
const getCurrentDate = () => {
  return new Date().toISOString().split('T')[0];
};

// 获取当前时间字符串
const getCurrentDateTime = () => {
  return new Date().toLocaleString('zh-CN');
};

// 获取文件标记数据
const getFileMarks = (fileUuid) => {
  const fileMarks = {
    completed: new Set(),
    important: new Set(),
    deleted: new Set()
  };
  
  try {
    const markData = localStorage.getItem(`marks_${fileUuid}`);
    if (markData) {
      const parsed = JSON.parse(markData);
      fileMarks.completed = new Set(parsed.completed || []);
      fileMarks.important = new Set(parsed.important || []);
      fileMarks.deleted = new Set(parsed.deleted || []);
    }
  } catch (err) {
    console.error(`获取文件标记失败:`, err);
  }
  
  return fileMarks;
};

// ==================== Markdown生成函数 ====================

// 导出为Markdown
export const exportChatAsMarkdown = (processedData, config) => {
  const { meta_info, chat_history } = processedData;
  const lines = [];

  // 添加YAML前置元数据
  if (config.exportObsidianMetadata) {
    lines.push("---");
    lines.push(`title: ${meta_info.title || '对话记录'}`);
    lines.push(`date: ${getCurrentDate()}`);
    lines.push(`export_time: ${getCurrentDateTime()}`);

    // 添加自定义属性
    if (config.obsidianProperties && config.obsidianProperties.length > 0) {
      config.obsidianProperties.forEach(prop => {
        const { name, value } = prop;
        
        // 处理列表类型的值
        if (value.includes(",") && !value.includes("[")) {
          const values = value.split(",").map(v => v.trim());
          lines.push(`${name}:`);
          values.forEach(v => {
            lines.push(`  - ${v}`);
          });
        } else {
          lines.push(`${name}: ${value}`);
        }
      });
    }

    // 添加标签
    if (config.obsidianTags && config.obsidianTags.length > 0) {
      lines.push("tags:");
      config.obsidianTags.forEach(tag => {
        lines.push(`  - ${tag}`);
      });
    }

    lines.push("---");
    lines.push("");
  }

  // 添加标题和元信息
  lines.push(`# ${meta_info.title || '对话记录'}`);
  lines.push(`*创建时间: ${meta_info.created_at || '未知'}*`);
  lines.push(`*导出时间: ${getCurrentDateTime()}*`);
  
  // 如果是仅导出已完成的消息，添加说明
  if (config.exportMarkedOnly) {
    lines.push(`*导出类型: 仅包含已完成标记的消息*`);
  }

  lines.push("");
  lines.push("---");
  lines.push("");

  // 如果没有消息，添加提示
  if (!chat_history || chat_history.length === 0) {
    lines.push("*没有符合条件的消息*");
    return lines.join("\n");
  }

  // 添加消息内容
  let exportedCount = 0;
  chat_history.forEach(msg => {
    // 如果设置为只导出已标记并且该消息未被标记，则跳过
    if (config.exportMarkedOnly && !config.markedItems?.has(msg.index)) {
      return;
    }

    exportedCount++;
    const sender = msg.sender_label;
    const timestamp = msg.timestamp;
    const msgIndex = msg.index + 1; // 序号从1开始

    // 添加分支标记
    let branchMarker = "";
    if (msg.is_branch_point) {
      branchMarker = " 🔀";
    } else if (msg.branch_level > 0) {
      branchMarker = ` ↳${msg.branch_level}`;
    }

    lines.push(`## ${msgIndex}. ${sender}${branchMarker}`);

    // 根据配置决定是否显示时间戳
    if (config.includeTimestamps) {
      lines.push(`*${timestamp}*`);
    }

    lines.push("");

    // 添加正文内容
    if (msg.display_text) {
      lines.push(msg.display_text);
      lines.push("");
    }

    // 添加思考过程
    if (msg.thinking && config.includeThinking) {
      lines.push("<details>");
      lines.push("<summary>💭 思考过程</summary>");
      lines.push("");
      lines.push("```");
      lines.push(msg.thinking);
      lines.push("```");
      lines.push("</details>");
      lines.push("");
    }

    // 添加artifacts内容
    if (msg.artifacts && msg.artifacts.length > 0 && config.includeArtifacts) {
      msg.artifacts.forEach(artifact => {
        const artifactId = artifact.id || '未知';
        const artifactType = artifact.type || '未知';
        const artifactTitle = artifact.title || '无标题';

        lines.push("<details>");
        lines.push(`<summary>🔧 Artifact: ${artifactTitle} (ID: ${artifactId})</summary>`);
        lines.push("");

        lines.push(`**类型**: \`${artifactType}\``);
        lines.push("");

        const command = artifact.command || '';
        if (command === 'create') {
          const content = artifact.content || '';
          const language = artifact.language || '';

          if (language) {
            lines.push(`**语言**: \`${language}\``);
            lines.push("");
            lines.push("**内容**:");
            lines.push(`\`\`\`${language}`);
            lines.push(content);
            lines.push("```");
          } else {
            lines.push("**内容**:");
            lines.push("```");
            lines.push(content);
            lines.push("```");
          }
        } else if (command === 'update' || command === 'rewrite') {
          const oldStr = artifact.old_str || '';
          const newStr = artifact.new_str || '';

          lines.push(`**操作**: \`${command}\``);
          lines.push("");
          lines.push("**原始文本**:");
          lines.push("```");
          lines.push(oldStr);
          lines.push("```");
          lines.push("");
          lines.push("**新文本**:");
          lines.push("```");
          lines.push(newStr);
          lines.push("```");
        }

        lines.push("</details>");
        lines.push("");
      });
    }

    // 添加工具使用记录
    if (msg.tools && msg.tools.length > 0 && config.includeTools) {
      msg.tools.forEach(tool => {
        const toolName = tool.name;

        lines.push("<details>");
        lines.push(`<summary>🔍 工具: ${toolName}</summary>`);
        lines.push("");

        // 查询内容
        if (toolName === "web_search" && tool.query) {
          lines.push(`**搜索查询**: \`${tool.query}\``);
          lines.push("");
        }

        // 工具输入
        if (tool.input && typeof tool.input === 'object') {
          lines.push("**输入参数**:");
          lines.push("```json");
          try {
            lines.push(JSON.stringify(tool.input, null, 2));
          } catch (error) {
            lines.push(String(tool.input));
          }
          lines.push("```");
          lines.push("");
        }

        // 工具结果
        if (tool.result) {
          lines.push("**结果**:");

          if (tool.result.is_error) {
            lines.push("> ⚠️ 工具执行出错");
            lines.push("");
          }

          // Web搜索结果特殊处理
          if (toolName === "web_search") {
            const resultContent = tool.result.content || [];
            const maxResults = Math.min(resultContent.length, 5);

            if (resultContent.length > 0) {
              lines.push("搜索结果:");
              lines.push("");

              for (let i = 0; i < maxResults; i++) {
                const item = resultContent[i];
                if (!item || typeof item !== 'object') continue;

                const title = item.title || "无标题";
                const url = item.url || "#";

                lines.push(`${i + 1}. [${title}](${url})`);
              }

              if (resultContent.length > maxResults) {
                lines.push(`*...还有 ${resultContent.length - maxResults} 个结果未显示*`);
              }

              lines.push("");
            }
          }
        }

        lines.push("</details>");
        lines.push("");
      });
    }

    // 添加引用
    if (msg.citations && msg.citations.length > 0 && config.includeCitations) {
      lines.push("<details>");
      lines.push("<summary>📎 引用来源</summary>");
      lines.push("");

      lines.push("| 标题 | 来源 |");
      lines.push("| --- | --- |");

      msg.citations.forEach(citation => {
        const title = citation.title || "未知来源";
        const url = citation.url || "#";
        const source = url.includes('/') ? url.split('/')[2] : '未知网站';
        lines.push(`| [${title}](${url}) | ${source} |`);
      });

      lines.push("</details>");
      lines.push("");
    }

    lines.push("---");
    lines.push("");
  });

  // 如果设置了仅导出已完成，在末尾添加统计信息
  if (config.exportMarkedOnly) {
    lines.push("");
    lines.push(`*共导出 ${exportedCount} 条已完成的消息*`);
  }

  return lines.join("\n");
};

// ==================== 文件保存函数 ====================

// 保存文本到文件
export const saveTextFile = (text, fileName) => {
  try {
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('保存文件失败:', error);
    alert('保存文件失败，请重试');
    return false;
  }
};

// ==================== 导出处理函数 ====================

// 导出当前文件
const exportCurrentFile = async (viewMode, processedData, currentFile, sortedMessages, hasCustomSort, marks) => {
  if (viewMode === 'timeline' && processedData) {
    const messagesToExport = hasCustomSort ? sortedMessages : (processedData.chat_history || []);
    
    return [{
      data: {
        ...processedData,
        chat_history: messagesToExport
      },
      fileName: currentFile?.name || 'export',
      marks: marks
    }];
  }
  return [];
};

// 导出有操作的文件
const exportOperatedFiles = async (operatedFiles, files) => {
  const dataToExport = [];
  
  for (const fileUuid of operatedFiles) {
    let targetFile = null;
    let targetFileIndex = -1;
    
    files.forEach((file, index) => {
      const testUuid = generateFileCardUuid(index, file);
      if (fileUuid.includes(testUuid) || fileUuid === testUuid) {
        targetFile = file;
        targetFileIndex = index;
      }
    });
    
    if (targetFile && targetFileIndex !== -1) {
      try {
        const text = await targetFile.text();
        const jsonData = JSON.parse(text);
        const { extractChatData, detectBranches } = await import('./fileParser');
        let data = extractChatData(jsonData, targetFile.name);
        data = detectBranches(data);
        
        const fileMarks = getFileMarks(fileUuid);
        
        dataToExport.push({
          data,
          fileName: targetFile.name,
          marks: fileMarks
        });
      } catch (err) {
        console.error(`导出文件 ${targetFile.name} 失败:`, err);
      }
    }
  }
  
  return dataToExport;
};

// 导出所有文件
const exportAllFiles = async (files, sortedMessages, hasCustomSort, currentFileIndex) => {
  const dataToExport = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);
      const { extractChatData, detectBranches } = await import('./fileParser');
      let data = extractChatData(jsonData, file.name);
      data = detectBranches(data);
      
      // 如果是当前文件且有自定义排序，使用排序后的消息
      let messagesToExport = data.chat_history || [];
      if (i === currentFileIndex && hasCustomSort && sortedMessages) {
        messagesToExport = sortedMessages;
      }
      
      const fileUuid = generateFileCardUuid(i, file);
      const fileMarks = getFileMarks(fileUuid);
      
      dataToExport.push({
        data: {
          ...data,
          chat_history: messagesToExport
        },
        fileName: file.name,
        marks: fileMarks
      });
    } catch (err) {
      console.error(`导出文件 ${file.name} 失败:`, err);
    }
  }
  
  return dataToExport;
};

// 生成Markdown内容
const generateMarkdownContent = (dataToExport, exportOptions) => {
  let markdownContent = '';
  
  dataToExport.forEach((item, index) => {
    if (index > 0) {
      markdownContent += '\n\n---\n---\n\n';
    }
    
    // 根据导出选项筛选消息
    let filteredHistory = [...(item.data.chat_history || [])];
    
    // 如果选择了"仅导出已完成标记"
    if (exportOptions.includeCompleted) {
      filteredHistory = filteredHistory.filter(msg => 
        item.marks.completed?.has(msg.index)
      );
    }
    
    // 排除已删除的消息
    if (exportOptions.excludeDeleted) {
      filteredHistory = filteredHistory.filter(msg => 
        !item.marks.deleted?.has(msg.index)
      );
    }
    
    const exportData = {
      ...item.data,
      chat_history: filteredHistory
    };
    
    const config = {
      exportMarkedOnly: exportOptions.includeCompleted,
      markedItems: item.marks.completed || new Set(),
      includeTimestamps: exportOptions.includeTimestamps !== false,
      includeThinking: exportOptions.includeThinking !== false,
      includeArtifacts: exportOptions.includeArtifacts !== false,
      includeTools: exportOptions.includeTools !== false,
      includeCitations: exportOptions.includeCitations !== false,
      exportObsidianMetadata: exportOptions.exportObsidianMetadata || false,
      obsidianProperties: exportOptions.obsidianProperties || [],
      obsidianTags: exportOptions.obsidianTags || []
    };
    
    try {
      markdownContent += exportChatAsMarkdown(exportData, config);
    } catch (err) {
      console.error(`导出文件 ${item.fileName} 失败:`, err);
      markdownContent += `\n# 导出失败: ${item.fileName}\n\n错误信息: ${err.message}\n\n`;
    }
  });
  
  return markdownContent;
};

// ==================== 主导出函数 ====================

// 统一的导出处理函数
export const handleExport = async (
  exportOptions,
  viewMode,
  processedData,
  currentFile,
  sortedMessages,
  hasCustomSort,
  marks,
  operatedFiles,
  files,
  currentFileIndex
) => {
  let dataToExport = [];
  let exportFileName = '';
  const dateStr = getCurrentDate();
  
  try {
    switch (exportOptions.scope) {
      case 'current':
        dataToExport = await exportCurrentFile(
          viewMode, processedData, currentFile, sortedMessages, hasCustomSort, marks
        );
        exportFileName = `${currentFile?.name.replace('.json', '') || 'export'}_${dateStr}.md`;
        break;
        
      case 'operated':
        dataToExport = await exportOperatedFiles(operatedFiles, files);
        exportFileName = `operated_files_${dateStr}.md`;
        break;
        
      case 'all':
        dataToExport = await exportAllFiles(files, sortedMessages, hasCustomSort, currentFileIndex);
        exportFileName = `all_files_${dateStr}.md`;
        break;
        
      default:
        if (processedData) {
          dataToExport = [{
            data: processedData,
            fileName: currentFile?.name || 'export',
            marks: marks
          }];
          exportFileName = `export_${dateStr}.md`;
        }
        break;
    }
    
    if (dataToExport.length === 0) {
      alert('没有可导出的数据');
      return false;
    }
    
    // 生成 Markdown 内容
    const markdownContent = generateMarkdownContent(dataToExport, exportOptions);
    
    // 保存文件
    return saveTextFile(markdownContent, exportFileName);
    
  } catch (error) {
    console.error('导出失败:', error);
    alert(`导出失败: ${error.message}`);
    return false;
  }
};

// ==================== 导出默认配置 ====================

export const DEFAULT_EXPORT_CONFIG = {
  includeThinking: true,
  includeTools: true,
  includeArtifacts: true,
  includeCitations: true,
  includeTimestamps: false,
  exportObsidianMetadata: false,
  exportMarkedOnly: false,
  excludeDeleted: true,
  obsidianProperties: [],
  obsidianTags: []
};
