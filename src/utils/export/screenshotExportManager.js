// utils/export/screenshotExportManager.js
// 长截图导出管理器
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import React from 'react';
import ReactDOM from 'react-dom/client';
import ChatBubbleScreenshot from '../../components/ChatBubbleScreenshot';

export const screenshotExportManager = {
  /**
   * 主导出方法
   */
  async exportAsImages(messages, conversation, config, onProgress) {
    const { heightLimit, scale, format, theme, platform, fileFormat, width, exportOptions } = config;
    const containerWidth = width || 800;
    const imageFormat = format || 'png';

    console.log('[截图导出] 开始导出', {
      messageCount: messages.length,
      heightLimit,
      scale,
      theme,
      width: containerWidth
    });

    // 获取平台名称前缀
    const platformPrefix = this.getPlatformPrefix(platform, fileFormat);

    // 1. 测量气泡高度
    console.log('[截图导出] 测量气泡高度...');
    const heights = await this.measureBubbleHeights(messages, theme, platform, fileFormat, containerWidth, exportOptions);
    console.log('[截图导出] 测量完成:', heights);

    // 2. 计算切分点
    console.log('[截图导出] 计算切分点...');
    const splitRanges = this.calculateSplitPoints(heights, heightLimit);
    console.log('[截图导出] 切分点:', splitRanges);

    // 3. 逐段截图
    console.log('[截图导出] 开始逐段截图...');
    const images = [];
    for (let i = 0; i < splitRanges.length; i++) {
      const range = splitRanges[i];
      console.log(`[截图导出] 截取第 ${i + 1}/${splitRanges.length} 段...`);

      if (onProgress) {
        onProgress(i + 1, splitRanges.length);
      }

      const blob = await this.captureRange(
        messages.slice(range.start, range.end + 1),
        theme,
        scale,
        platform,
        fileFormat,
        containerWidth,
        exportOptions
      );

      // 修正文件名格式: 平台_对话名_序号.格式
      const baseName = this.sanitizeFilename(conversation.name);
      const fileName = splitRanges.length === 1
        ? `${platformPrefix}_${baseName}.${imageFormat}`
        : `${platformPrefix}_${baseName}_${i + 1}.${imageFormat}`;

      images.push({
        name: fileName,
        blob
      });
    }

    // 4. 打包下载
    console.log('[截图导出] 打包下载...');
    if (images.length === 1) {
      saveAs(images[0].blob, images[0].name);
    } else {
      await this.packAsZip(images, `${platformPrefix}_${conversation.name}`);
    }

    console.log('[截图导出] 导出完成!');
  },

  /**
   * 获取平台前缀
   */
  getPlatformPrefix(platform, format) {
    const platformLower = (platform || '').toLowerCase();
    const formatLower = (format || '').toLowerCase();

    if (formatLower.includes('chatgpt') || platformLower.includes('chatgpt')) {
      return 'chatgpt';
    }
    if (formatLower.includes('gemini') || platformLower.includes('gemini')) {
      return 'gemini';
    }
    if (formatLower.includes('notebooklm') || platformLower.includes('notebooklm')) {
      return 'notebooklm';
    }
    if (formatLower.includes('aistudio') || platformLower.includes('ai studio')) {
      return 'aistudio';
    }
    if (formatLower.includes('jsonl') || platformLower.includes('sillytavern')) {
      return 'sillytavern';
    }
    return 'claude';
  },

  /**
   * 测量气泡高度
   */
  async measureBubbleHeights(messages, theme, platform, format, width, exportOptions) {
    const container = this.createHiddenContainer(theme, width);

    return new Promise((resolve) => {
      const root = ReactDOM.createRoot(container);
      const heights = [];

      root.render(
        <div
          ref={(ref) => {
            if (ref) {
              // 等待渲染完成
              setTimeout(() => {
                const bubbles = ref.querySelectorAll('.screenshot-bubble');
                bubbles.forEach((bubble) => {
                  heights.push(bubble.offsetHeight + 20); // 添加间距
                });

                // 清理
                root.unmount();
                document.body.removeChild(container);

                resolve(heights);
              }, 100);
            }
          }}
        >
          {messages.map((msg, index) => (
            <ChatBubbleScreenshot
              key={msg.uuid || index}
              message={msg}
              platform={platform}
              format={format}
              exportOptions={exportOptions || {}}
            />
          ))}
        </div>
      );
    });
  },

  /**
   * 计算切分点算法
   */
  calculateSplitPoints(heights, heightLimit) {
    const ranges = [];
    let currentHeight = 0;
    let startIndex = 0;

    for (let i = 0; i < heights.length; i++) {
      const bubbleHeight = heights[i];

      // 检查是否超出限制
      if (currentHeight + bubbleHeight > heightLimit && i > startIndex) {
        // 保存当前段
        ranges.push({ start: startIndex, end: i - 1 });

        // 开始新段
        startIndex = i;
        currentHeight = bubbleHeight;
      } else {
        currentHeight += bubbleHeight;
      }
    }

    // 保存最后一段
    if (startIndex < heights.length) {
      ranges.push({ start: startIndex, end: heights.length - 1 });
    }

    return ranges;
  },

  /**
   * 截图指定范围
   */
  async captureRange(messages, theme, scale, platform, format, width, exportOptions) {
    const container = this.createHiddenContainer(theme, width);

    return new Promise((resolve, reject) => {
      const root = ReactDOM.createRoot(container);

      root.render(
        <div
          className="screenshot-container"
          style={{ width: `${width}px` }}
          ref={async (ref) => {
            if (ref) {
              // 等待渲染完成
              setTimeout(async () => {
                try {
                  // 截图
                  const canvas = await html2canvas(ref, {
                    scale,
                    backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
                    logging: false,
                    useCORS: true,
                    allowTaint: true
                  });

                  // 转换为 Blob
                  canvas.toBlob((blob) => {
                    // 清理
                    root.unmount();
                    document.body.removeChild(container);

                    resolve(blob);
                  }, 'image/png');
                } catch (error) {
                  // 清理
                  root.unmount();
                  document.body.removeChild(container);

                  reject(error);
                }
              }, 200);
            }
          }}
        >
          {messages.map((msg, index) => (
            <ChatBubbleScreenshot
              key={msg.uuid || index}
              message={msg}
              platform={platform}
              format={format}
              exportOptions={exportOptions || {}}
            />
          ))}
        </div>
      );
    });
  },

  /**
   * 创建隐藏容器
   */
  createHiddenContainer(theme, width = 800) {
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      top: -99999px;
      left: -99999px;
      width: ${width}px;
      z-index: -9999;
      overflow: visible;
    `;

    // 应用主题: 使用data-theme属性以匹配应用的主题系统
    container.setAttribute('data-theme', theme);

    // 直接从document.documentElement复制计算后的CSS变量值，确保样式一致性
    const rootStyles = getComputedStyle(document.documentElement);
    const cssVars = [
      '--bg-primary', '--bg-secondary', '--bg-tertiary', '--bg-overlay',
      '--card-bg', '--border-primary', '--border-secondary', '--border-active', '--border-color',
      '--text-primary', '--text-secondary', '--text-tertiary', '--text-link',
      '--accent-primary', '--accent-color', '--accent-secondary', '--accent-danger',
      '--avatar-human-bg', '--avatar-human-text', '--avatar-ai-bg', '--avatar-ai-text',
      '--shadow-sm', '--shadow-md', '--shadow-lg',
      '--radius-sm', '--radius-md', '--radius-lg', '--radius-xl',
      '--bg-code', '--text-code', '--font-mono', '--font-system'
    ];

    cssVars.forEach(varName => {
      const value = rootStyles.getPropertyValue(varName);
      if (value) {
        container.style.setProperty(varName, value);
      }
    });

    document.body.appendChild(container);
    return container;
  },

  /**
   * 打包为 ZIP
   */
  async packAsZip(images, conversationName) {
    const zip = new JSZip();

    images.forEach((img) => {
      zip.file(img.name, img.blob);
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `${this.sanitizeFilename(conversationName)}_screenshots.zip`);
  },

  /**
   * 清理文件名
   */
  sanitizeFilename(filename) {
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 100);
  }
};
