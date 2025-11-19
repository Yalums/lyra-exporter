// components/ScreenshotPreviewPanel.js
// 长截图预览编辑面板
import React, { useState, useEffect, useMemo, useRef } from 'react';
import EditableChatBubble from './EditableChatBubble';
import { useI18n } from '../index.js';
import { screenshotExportManager } from '../utils/export/screenshotExportManager';

const ScreenshotPreviewPanel = ({
  isOpen,
  onClose,
  conversation,
  initialMessages,
  exportOptions,
  currentTheme,
  platform,
  format
}) => {
  const { t } = useI18n();
  const [editableMessages, setEditableMessages] = useState(initialMessages || []);
  const [screenshotConfig, setScreenshotConfig] = useState({
    heightLimit: exportOptions?.heightLimit || 8000,
    scale: exportOptions?.scale || 2,
    format: 'png',
    width: exportOptions?.width || 800
  });
  const [splitPoints, setSplitPoints] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const previewRef = useRef(null);

  // 当初始消息变化时重置可编辑消息
  useEffect(() => {
    if (initialMessages) {
      setEditableMessages(initialMessages);
    }
  }, [initialMessages]);

  // 计算切分点
  useEffect(() => {
    if (!editableMessages || editableMessages.length === 0) return;

    // 使用简单的估算方法计算切分点
    // 每条消息估算高度：基础150px + 文本长度/10
    const estimatedHeights = editableMessages.map(msg => {
      const textLength = (msg.display_text || msg.text || '').length;
      const baseHeight = 150;
      const textHeight = Math.ceil(textLength / 50) * 20; // 每50个字符约20px
      return baseHeight + textHeight;
    });

    // 计算切分点
    const ranges = [];
    let currentHeight = 0;
    let startIndex = 0;

    for (let i = 0; i < estimatedHeights.length; i++) {
      const msgHeight = estimatedHeights[i];

      if (currentHeight + msgHeight > screenshotConfig.heightLimit && i > startIndex) {
        ranges.push({ start: startIndex, end: i - 1 });
        startIndex = i;
        currentHeight = msgHeight;
      } else {
        currentHeight += msgHeight;
      }
    }

    // 保存最后一段
    if (startIndex < estimatedHeights.length) {
      ranges.push({ start: startIndex, end: estimatedHeights.length - 1 });
    }

    setSplitPoints(ranges);
  }, [editableMessages, screenshotConfig.heightLimit, screenshotConfig.width]);

  // 判断某个索引是否是切分点
  const isSplitPoint = (index) => {
    return splitPoints.some(range => range.start === index && index > 0);
  };

  // 获取当前消息所在的图片索引
  const getImageIndex = (messageIndex) => {
    for (let i = 0; i < splitPoints.length; i++) {
      const range = splitPoints[i];
      if (messageIndex >= range.start && messageIndex <= range.end) {
        return i + 1;
      }
    }
    return 1;
  };

  // 编辑消息
  const handleEditMessage = (uuid, newText) => {
    setEditableMessages(prev => prev.map(msg =>
      msg.uuid === uuid ? { ...msg, display_text: newText, text: newText } : msg
    ));
  };

  // 删除消息
  const handleDeleteMessage = (uuid) => {
    if (window.confirm(t('screenshot.confirmDelete'))) {
      setEditableMessages(prev => prev.filter(msg => msg.uuid !== uuid));
    }
  };

  // 重置编辑
  const handleReset = () => {
    if (window.confirm(t('screenshot.confirmReset'))) {
      setEditableMessages(initialMessages);
    }
  };

  // 导出
  const handleExport = async () => {
    if (!editableMessages || editableMessages.length === 0) {
      alert(t('screenshot.noMessages'));
      return;
    }

    setIsGenerating(true);
    setProgress({ current: 0, total: splitPoints.length });

    try {
      await screenshotExportManager.exportAsImages(
        editableMessages,
        {
          name: conversation?.name || 'conversation',
          uuid: conversation?.uuid
        },
        {
          heightLimit: screenshotConfig.heightLimit,
          scale: screenshotConfig.scale,
          format: 'png',
          theme: currentTheme,
          platform: platform || 'claude',
          fileFormat: format || 'claude',
          width: screenshotConfig.width,
          exportOptions: exportOptions || {}
        },
        // 进度回调
        (current, total) => {
          setProgress({ current, total });
        }
      );

      // 成功后关闭面板
      setTimeout(() => {
        setIsGenerating(false);
        setProgress({ current: 0, total: 0 });
        onClose();
      }, 500);
    } catch (error) {
      console.error('导出失败:', error);
      alert(t('screenshot.exportError') + error.message);
      setIsGenerating(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="screenshot-preview-modal" onClick={onClose}>
      <div
        className="screenshot-preview-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="screenshot-preview-header">
          <h2>{t('screenshot.previewTitle')}</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {/* 工具栏 */}
        <div className="screenshot-preview-toolbar">
          <div className="toolbar-left">
            <label>
              {t('screenshot.width')}:
              <select
                value={screenshotConfig.width}
                onChange={(e) => setScreenshotConfig(prev => ({
                  ...prev,
                  width: parseInt(e.target.value)
                }))}
              >
                <option value="400">400px</option>
                <option value="600">600px</option>
                <option value="800">800px ({t('screenshot.recommended')})</option>
                <option value="1000">1000px</option>
                <option value="1200">1200px</option>
              </select>
            </label>

            <label>
              {t('screenshot.heightLimit')}:
              <select
                value={screenshotConfig.heightLimit}
                onChange={(e) => setScreenshotConfig(prev => ({
                  ...prev,
                  heightLimit: parseInt(e.target.value)
                }))}
              >
                <option value="2000">2000px</option>
                <option value="4000">4000px</option>
                <option value="8000">8000px ({t('screenshot.recommended')})</option>
                <option value="12000">12000px</option>
              </select>
            </label>

            <label>
              <input
                type="checkbox"
                checked={screenshotConfig.scale === 2}
                onChange={(e) => setScreenshotConfig(prev => ({
                  ...prev,
                  scale: e.target.checked ? 2 : 1
                }))}
              />
              {t('screenshot.highQuality')} (2x)
            </label>
          </div>

          <div className="toolbar-right">
            <span className="info-text">
              {t('screenshot.totalMessages', { count: editableMessages.length })} | {' '}
              {t('screenshot.willGenerate', { count: splitPoints.length })}
            </span>
          </div>
        </div>

        {/* 预览区域 */}
        <div className={`screenshot-preview-area ${currentTheme}`} ref={previewRef}>
          <div
            className="preview-container"
            style={{ maxWidth: `${screenshotConfig.width}px`, margin: '0 auto' }}
          >
            {editableMessages.map((msg, index) => (
              <EditableChatBubble
                key={msg.uuid || index}
                message={msg}
                index={index}
                platform={platform}
                format={format}
                onEdit={handleEditMessage}
                onDelete={handleDeleteMessage}
                showSplitLine={isSplitPoint(index)}
                currentImageIndex={getImageIndex(index)}
              />
            ))}
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="screenshot-preview-footer">
          <div className="footer-left">
            <button className="btn-secondary" onClick={handleReset}>
              {t('screenshot.reset')}
            </button>
          </div>

          <div className="footer-right">
            <button className="btn-secondary" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button
              className="btn-primary"
              onClick={handleExport}
              disabled={isGenerating || editableMessages.length === 0}
            >
              {isGenerating
                ? `${t('screenshot.generating')} ${progress.current}/${progress.total}`
                : t('screenshot.export')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScreenshotPreviewPanel;
