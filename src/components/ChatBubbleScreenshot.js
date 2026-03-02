// components/ChatBubbleScreenshot.js
// 用于截图的只读消息气泡组件 - 移除所有交互功能
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import PlatformIcon from './PlatformIcon';
import { PlatformUtils, DateTimeUtils } from '../utils/fileParser';

/**
 * 过滤图片引用标记（与 MessageDetail.js 保持一致）
 */
const filterImageReferences = (text) => {
  if (!text) return '';
  return text
    .replace(/\[(?:图片|附件|图像|image|attachment)\d*\s*[:：]\s*[^\]]+\]/gi, '')
    .replace(/\[(?:图片|附件|图像|image|attachment)\d+\]/gi, '')
    .replace(/\[图片[1-5]\]/gi, '')
    .trim();
};

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
    if (format === 'grok') return 'assistant platform-grok';
    if (format === 'gemini_notebooklm') {
      const platformLower = platform?.toLowerCase() || '';
      if (platformLower.includes('notebooklm')) return 'assistant platform-notebooklm';
      return 'assistant platform-gemini';
    }

    const platformLower = platform?.toLowerCase() || 'claude';
    if (platformLower.includes('jsonl')) return 'assistant platform-jsonl_chat';
    if (platformLower.includes('chatgpt')) return 'assistant platform-chatgpt';
    if (platformLower.includes('grok')) return 'assistant platform-grok';
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
                components={{
                  p: ({ children }) => <p>{children}</p>,
                  h1: ({ children }) => <h1>{children}</h1>,
                  h2: ({ children }) => <h2>{children}</h2>,
                  h3: ({ children }) => <h3>{children}</h3>,
                  h4: ({ children }) => <h4>{children}</h4>,
                  h5: ({ children }) => <h5>{children}</h5>,
                  h6: ({ children }) => <h6>{children}</h6>,
                  strong: ({ children }) => <strong>{children}</strong>,
                  em: ({ children }) => <em>{children}</em>,

                  // 代码块渲染 - 参考 MessageDetail.js 的风格
                  pre: ({ children, ...props }) => (
                    <pre {...props} style={{ overflowX: 'auto' }}>
                      {children}
                    </pre>
                  ),

                  code: ({ inline, className, children, ...props }) => {
                    if (inline) {
                      return <code className="inline-code" {...props}>{children}</code>;
                    }

                    const match = /language-(\w+)/.exec(className || '');
                    const language = match ? match[1] : '';

                    return (
                      <code
                        className={`code-block ${className || ''}`}
                        data-language={language}
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },

                  blockquote: ({ children, ...props }) => (
                    <blockquote {...props}>{children}</blockquote>
                  ),

                  a: ({ href, children, ...props }) => (
                    <a href={href} {...props}>{children}</a>
                  ),

                  ul: ({ children, ...props }) => <ul {...props}>{children}</ul>,
                  ol: ({ children, ...props }) => <ol {...props}>{children}</ol>,
                  li: ({ children, ...props }) => <li {...props}>{children}</li>,

                  table: ({ children, ...props }) => (
                    <div style={{ overflowX: 'auto' }}>
                      <table {...props}>{children}</table>
                    </div>
                  )
                }}
              >
                {filterImageReferences(message.display_text || message.text || '')}
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
                {/* 图片 - 合并 images 数组和 attachments 中的嵌入图片 */}
                {(() => {
                  // 兼容性处理：自动检测图片类型的附件
                  const embeddedImages = message.attachments?.filter(att => {
                    if (att.is_embedded_image) return true;
                    // 兼容旧数据：检查 MIME 类型
                    if (att.file_type && att.file_type.startsWith('image/')) return true;
                    return false;
                  }) || [];
                  const totalImages = (message.images?.length || 0) + embeddedImages.length;
                  return totalImages > 0 && (
                    <div className="timeline-tag">
                      <span>🖼️</span>
                      <span>{totalImages} 张图片</span>
                    </div>
                  );
                })()}
                {/* 附件 - 排除嵌入的图片，只显示真实附件 */}
                {(() => {
                  // 兼容性处理：自动排除图片类型的附件
                  const regularAttachments = message.attachments?.filter(att => {
                    if (att.is_embedded_image) return false;
                    // 兼容旧数据：排除图片类型
                    if (att.file_type && att.file_type.startsWith('image/')) return false;
                    return true;
                  }) || [];
                  return regularAttachments.length > 0 && exportOptions.includeAttachments !== false && (
                    <div className="timeline-tag">
                      <span>📎</span>
                      <span>{regularAttachments.length} 个附件</span>
                    </div>
                  );
                })()}
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
