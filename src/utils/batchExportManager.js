// utils/batchExportManager.js
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { extractChatData } from './fileParser';
import { MarkdownGenerator } from './exportManager';
import { DateTimeUtils } from './fileParser';

/**
 * 分支分析器 - 从 ConversationTimeline 中提取的逻辑
 */
class BranchAnalyzer {
  /**
   * 分析消息的分支结构
   * @param {Array} messages - 消息数组
   * @returns {Object} - 分支分析结果
   */
  analyze(messages) {
    const msgDict = {};
    const parentChildren = {};
    const branchPoints = new Map();

    // 构建消息字典和父子关系
    messages.forEach(msg => {
      const uuid = msg.uuid;
      const parentUuid = msg.parent_uuid;

      msgDict[uuid] = msg;

      if (parentUuid) {
        if (!parentChildren[parentUuid]) {
          parentChildren[parentUuid] = [];
        }
        parentChildren[parentUuid].push(uuid);
      }
    });

    // 识别分支点
    const ROOT_UUID = '00000000-0000-4000-8000-000000000000';

    Object.entries(parentChildren).forEach(([parentUuid, children]) => {
      if (children.length > 1) {
        let branchPoint = null;

        if (parentUuid === ROOT_UUID) {
          // 根节点有多个子节点，创建虚拟分支点
          branchPoint = {
            uuid: ROOT_UUID,
            index: -1,
            display_text: '对话起始点',
            sender: 'system',
            timestamp: '对话开始'
          };
        } else if (msgDict[parentUuid]) {
          branchPoint = msgDict[parentUuid];
        }

        if (branchPoint) {
          const sortedChildren = children
            .map(uuid => msgDict[uuid])
            .filter(msg => msg)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

          const branches = sortedChildren.map((childMsg, branchIndex) => {
            const branchMessages = this.findBranchMessages(childMsg.uuid, msgDict, parentChildren);

            return {
              branchIndex,
              startMessage: childMsg,
              messages: branchMessages,
              messageCount: branchMessages.length,
              path: `branch_${branchPoint.uuid}_${branchIndex}`,
              preview: childMsg.display_text
                ? childMsg.display_text.length > 50
                  ? childMsg.display_text.substring(0, 50) + '...'
                  : childMsg.display_text
                : '...'
            };
          });

          branchPoints.set(parentUuid, {
            branchPoint,
            branches,
            currentBranchIndex: 0
          });
        }
      }
    });

    return { branchPoints, msgDict, parentChildren };
  }

  /**
   * 查找分支的所有消息
   */
  findBranchMessages(startUuid, msgDict, parentChildren) {
    const branchMessages = [msgDict[startUuid]];
    const visited = new Set([startUuid]);

    const traverse = (currentUuid) => {
      const children = parentChildren[currentUuid] || [];
      children.forEach(childUuid => {
        if (!visited.has(childUuid) && msgDict[childUuid]) {
          visited.add(childUuid);
          branchMessages.push(msgDict[childUuid]);
          traverse(childUuid);
        }
      });
    };

    traverse(startUuid);
    return branchMessages.sort((a, b) => a.index - b.index);
  }

  /**
   * 找到最新分支的消息
   * @param {Array} messages - 所有消息
   * @returns {Array} - 最新分支的消息
   */
  getLatestBranchMessages(messages) {
    if (!messages || messages.length === 0) {
      return [];
    }

    // 找到时间戳最新的消息
    const sortedMessages = [...messages].sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeA - timeB;
    });

    const latestMessage = sortedMessages[sortedMessages.length - 1];

    // 分析分支结构
    const { branchPoints, msgDict, parentChildren } = this.analyze(messages);

    // 如果没有分支，返回所有消息
    if (branchPoints.size === 0) {
      return messages;
    }

    // 构建最新消息的路径
    const messagePath = [];
    let currentMsg = latestMessage;
    const visitedUuids = new Set();

    while (currentMsg && !visitedUuids.has(currentMsg.uuid)) {
      visitedUuids.add(currentMsg.uuid);
      messagePath.unshift(currentMsg);

      if (currentMsg.parent_uuid) {
        currentMsg = messages.find(m => m.uuid === currentMsg.parent_uuid);
      } else {
        break;
      }
    }

    // 确定每个分支点的选择
    const selectedBranches = new Map();

    for (const [branchPointUuid, branchData] of branchPoints) {
      let selectedBranchIndex = 0;

      // 检查消息路径是否经过这个分支点的某个分支
      for (let bIdx = 0; bIdx < branchData.branches.length; bIdx++) {
        const branch = branchData.branches[bIdx];
        if (messagePath.some(pathMsg =>
          branch.messages.some(branchMsg => branchMsg.uuid === pathMsg.uuid)
        )) {
          selectedBranchIndex = bIdx;
          break;
        }
      }

      selectedBranches.set(branchPointUuid, selectedBranchIndex);
    }

    // 根据选择的分支过滤消息
    const visibleMessages = [];

    for (const msg of messages) {
      let shouldShow = true;

      for (const [branchPointUuid, selectedBranchIndex] of selectedBranches.entries()) {
        const branchData = branchPoints.get(branchPointUuid);
        if (!branchData) continue;

        const branchPoint = branchData.branchPoint;
        const selectedBranch = branchData.branches[selectedBranchIndex];

        // 对于根分支点，所有消息都受影响
        const isRootBranch = branchPoint.index === -1;

        if (isRootBranch || msg.index > branchPoint.index) {
          const belongsToSelectedBranch = selectedBranch.messages.some(
            branchMsg => branchMsg.uuid === msg.uuid
          );

          if (!belongsToSelectedBranch) {
            const belongsToAnyBranch = branchData.branches.some(
              branch => branch.messages.some(branchMsg => branchMsg.uuid === msg.uuid)
            );

            if (belongsToAnyBranch) {
              shouldShow = false;
              break;
            }
          }
        }
      }

      if (shouldShow) visibleMessages.push(msg);
    }

    return visibleMessages;
  }
}

/**
 * 批量导出管理器
 */
export class BatchExportManager {
  constructor() {
    this.branchAnalyzer = new BranchAnalyzer();
  }

  /**
   * 批量导出文件为 Markdown 并打包成 ZIP
   * @param {Array<File>} files - 要处理的文件数组
   * @param {Function} onProgress - 进度回调函数 (current, total, fileName)
   * @returns {Promise<void>}
   */
  async exportLatestBranchesToZip(files, onProgress = null) {
    const zip = new JSZip();
    const timestamp = DateTimeUtils.formatDateTime(new Date()).replace(/[:/\s]/g, '-');
    const successfulExports = [];
    const failedExports = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        // 通知进度
        if (onProgress) {
          onProgress(i + 1, files.length, file.name);
        }

        // 读取文件内容
        const content = await this.readFileAsText(file);
        const jsonData = JSON.parse(content);

        // 检测是否为 claude_full_export 格式（包含多个对话）
        const isFullExport = jsonData?.exportedAt && Array.isArray(jsonData.conversations);

        if (isFullExport) {
          // 处理 claude_full_export 格式 - 包含多个对话
          const conversations = jsonData.conversations || [];

          for (let convIndex = 0; convIndex < conversations.length; convIndex++) {
            const conversation = conversations[convIndex];

            try {
              // 构造单个对话的数据结构
              const singleConvData = {
                uuid: conversation.uuid,
                name: conversation.name,
                model: conversation.model,
                created_at: conversation.created_at,
                updated_at: conversation.updated_at,
                chat_messages: conversation.chat_messages || []
              };

              // 使用 extractChatData 处理单个对话
              const processedData = extractChatData(singleConvData);

              if (!processedData || !processedData.chat_history || processedData.chat_history.length === 0) {
                failedExports.push({
                  fileName: `${file.name} - ${conversation.name || conversation.uuid}`,
                  error: '无有效的对话数据'
                });
                continue;
              }

              // 获取最新分支的消息
              const latestBranchMessages = this.branchAnalyzer.getLatestBranchMessages(processedData.chat_history);

              // 创建包含最新分支消息的新数据
              const latestBranchData = {
                ...processedData,
                chat_history: latestBranchMessages
              };

              // 生成 Markdown
              const generator = new MarkdownGenerator({
                includeThinking: true,
                includeTools: true,
                includeArtifacts: true,
                includeCitations: true,
                includeAttachments: true,
                includeTimestamps: false,
                exportObsidianMetadata: false,
                excludeDeleted: false
              });

              const markdown = generator.generate(latestBranchData);

              // 生成文件名 - 使用对话名称
              const convTitle = conversation.name || `conversation_${convIndex + 1}`;
              const sanitizedTitle = this.sanitizeFileName(convTitle);
              const mdFileName = `${sanitizedTitle}.md`;

              // 添加到 ZIP
              zip.file(mdFileName, markdown);
              successfulExports.push({
                fileName: `${file.name} - ${convTitle}`,
                mdFileName
              });

            } catch (convError) {
              console.error(`处理对话 ${conversation.name || conversation.uuid} 时出错:`, convError);
              failedExports.push({
                fileName: `${file.name} - ${conversation.name || conversation.uuid}`,
                error: convError.message
              });
            }
          }
        } else {
          // 处理普通单对话格式
          const processedData = extractChatData(jsonData);

          if (!processedData || !processedData.chat_history || processedData.chat_history.length === 0) {
            failedExports.push({ fileName: file.name, error: '无有效的对话数据' });
            continue;
          }

          // 获取最新分支的消息
          const latestBranchMessages = this.branchAnalyzer.getLatestBranchMessages(processedData.chat_history);

          // 创建包含最新分支消息的新数据
          const latestBranchData = {
            ...processedData,
            chat_history: latestBranchMessages
          };

          // 生成 Markdown
          const generator = new MarkdownGenerator({
            includeThinking: true,
            includeTools: true,
            includeArtifacts: true,
            includeCitations: true,
            includeAttachments: true,
            includeTimestamps: false,
            exportObsidianMetadata: false,
            excludeDeleted: false
          });

          const markdown = generator.generate(latestBranchData);

          // 生成文件名
          const originalName = file.name.replace(/\.json$/i, '');
          const title = processedData.meta_info?.title || originalName;
          const sanitizedTitle = this.sanitizeFileName(title);
          const mdFileName = `${sanitizedTitle}.md`;

          // 添加到 ZIP
          zip.file(mdFileName, markdown);
          successfulExports.push({ fileName: file.name, mdFileName });
        }

      } catch (error) {
        console.error(`处理文件 ${file.name} 时出错:`, error);
        failedExports.push({ fileName: file.name, error: error.message });
      }
    }

    // 生成摘要文件
    const summary = this.generateSummary(successfulExports, failedExports);
    zip.file('_导出摘要.txt', summary);

    // 生成并下载 ZIP
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipFileName = `Latest_Branches_Export_${timestamp}.zip`;
    saveAs(zipBlob, zipFileName);

    return {
      successful: successfulExports.length,
      failed: failedExports.length,
      total: files.length,
      failedFiles: failedExports
    };
  }

  /**
   * 读取文件为文本
   */
  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('文件读取失败'));
      reader.readAsText(file);
    });
  }

  /**
   * 清理文件名中的非法字符
   */
  sanitizeFileName(fileName) {
    return fileName
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 100);
  }

  /**
   * 生成导出摘要
   */
  generateSummary(successful, failed) {
    const lines = [];
    lines.push('=' .repeat(60));
    lines.push('批量导出摘要');
    lines.push('=' .repeat(60));
    lines.push('');
    lines.push(`导出时间: ${DateTimeUtils.formatDateTime(new Date())}`);
    lines.push(`成功导出: ${successful.length} 个文件`);
    lines.push(`导出失败: ${failed.length} 个文件`);
    lines.push('');

    if (successful.length > 0) {
      lines.push('成功导出的文件:');
      lines.push('-' .repeat(60));
      successful.forEach(({ fileName, mdFileName }) => {
        lines.push(`✓ ${fileName} -> ${mdFileName}`);
      });
      lines.push('');
    }

    if (failed.length > 0) {
      lines.push('导出失败的文件:');
      lines.push('-' .repeat(60));
      failed.forEach(({ fileName, error }) => {
        lines.push(`✗ ${fileName}`);
        lines.push(`  错误: ${error}`);
      });
      lines.push('');
    }

    lines.push('=' .repeat(60));
    lines.push('');
    lines.push('说明:');
    lines.push('- 每个文件都已导出为包含最新对话分支的 Markdown 文件');
    lines.push('- 如果对话有多个分支，将自动选择时间戳最新的分支');
    lines.push('- 文件名已自动清理非法字符');
    lines.push('');

    return lines.join('\n');
  }
}

// 导出单例
export const batchExportManager = new BatchExportManager();
