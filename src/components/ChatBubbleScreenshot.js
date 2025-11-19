// components/ChatBubbleScreenshot.js
// 用于截图的只读消息气泡组件 - 移除所有交互功能
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import PlatformIcon from './PlatformIcon';
import { PlatformUtils, DateTimeUtils } from '../utils/fileParser';

const ChatBubbleScreenshot = ({
  message,
  platform = 'claude',
  format = 'claude',
  showTags = true,
  exportOptions = {}
}) => {
  const getPlatformAvatarClass = (sender) => {
    if (sender === 'human') return 'human';

    // 根据format判断平台
    if (format === 'jsonl_chat') return 'assistant platform-jsonl_chat';
    if (format === 'chatgpt') return 'assistant platform-chatgpt';
    if (format === 'gemini_notebooklm') {
      const platformLower = platform?.toLowerCase() || '';
      if (platformLower.includes('notebooklm')) return 'assistant platform-notebooklm';
      return 'assistant platform-gemini';
    }

    const platformLower = platform?.toLowerCase() || 'claude';
    if (platformLower.includes('jsonl')) return 'assistant platform-jsonl_chat';
    if (platformLower.includes('chatgpt')) return 'assistant platform-chatgpt';
    if (platformLower.includes('gemini')) return 'assistant platform-gemini';
    if (platformLower.includes('ai studio') || platformLower.includes('aistudio')) return 'assistant platform-aistudio';
    if (platformLower.includes('notebooklm')) return 'assistant platform-notebooklm';
    return 'assistant platform-claude';
  };

  return (
    <div className="screenshot-bubble">
      {/* 添加内层包装以匹配 EditableChatBubble 的结构,确保CSS渲染一致 */}
      <div className="editable-bubble">
        <div className="timeline-message">
          {/* 导出模式不需要时间线点标志 */}
          
          <div className="timeline-content">
            {/* 头部 */}
            <div className="timeline-header">
              <div className="timeline-sender">
                <div className={`timeline-avatar ${getPlatformAvatarClass(message.sender)}`}>
                  {message.sender === 'human' ? '👤' : (
                    <PlatformIcon
                      platform={platform?.toLowerCase() || 'claude'}
                      format={format}
                      size={20}
                      style={{ backgroundColor: 'transparent' }}
                    />
                  )}
                </div>
                <div className="sender-info">
                  <div className="sender-name">{message.sender_label}</div>
                  <div className="sender-time">
                    {DateTimeUtils.formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            </div>

            {/* 正文 */}
            <div className="timeline-body">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
              >
                {message.display_text || message.text || ''}
              </ReactMarkdown>
            </div>

            {/* 标签 */}
            {showTags && (
              <div className="timeline-footer">
                {/* 思考过程 - 根据exportOptions控制 */}
                {message.sender !== 'human' && message.thinking && exportOptions.includeThinking !== false && (
                  <div className="timeline-tag">
                    <span>💭</span>
                    <span>思考过程</span>
                  </div>
                )}
                {/* 图片 */}
                {message.images && message.images.length > 0 && (
                  <div className="timeline-tag">
                    <span>🖼️</span>
                    <span>{message.images.length} 张图片</span>
                  </div>
                )}
                {/* 附件 - 根据exportOptions控制 */}
                {message.attachments && message.attachments.length > 0 && exportOptions.includeAttachments !== false && (
                  <div className="timeline-tag">
                    <span>📎</span>
                    <span>{message.attachments.length} 个附件</span>
                  </div>
                )}
                {/* Artifacts - 根据exportOptions控制 */}
                {message.sender !== 'human' && message.artifacts && message.artifacts.length > 0 && exportOptions.includeArtifacts !== false && (
                  <div className="timeline-tag">
                    <span>🔧</span>
                    <span>{message.artifacts.length} 个 Artifacts</span>
                  </div>
                )}
                {/* Canvas - 根据exportOptions控制 */}
                {message.sender !== 'human' && message.canvas && message.canvas.length > 0 && exportOptions.includeArtifacts !== false && (
                  <div className="timeline-tag">
                    <span>🔧</span>
                    <span>Canvas</span>
                  </div>
                )}
                {/* 工具使用 - 根据exportOptions控制 */}
                {message.tools && message.tools.length > 0 && exportOptions.includeTools !== false && (
                  <div className="timeline-tag">
                    <span>🔍</span>
                    <span>使用工具</span>
                  </div>
                )}
                {/* 引用 - 根据exportOptions控制 */}
                {message.citations && message.citations.length > 0 && exportOptions.includeCitations !== false && (
                  <div className="timeline-tag">
                    <span>🔗</span>
                    <span>{message.citations.length} 条引用</span>
                  </div>
                )}

                {/* 用户标记 */}
                {message.marks?.completed && (
                  <div className="timeline-tag completed">
                    <span>✓</span>
                    <span>已完成</span>
                  </div>
                )}
                {message.marks?.important && (
                  <div className="timeline-tag important">
                    <span>⭐</span>
                    <span>重点</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatBubbleScreenshot;
