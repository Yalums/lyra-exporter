// components/MessageDetail.js - 修复版
import React, { useState, useRef, useEffect, Component } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getImageDisplayData, formatFileSize } from '../utils/fileParser';
import { FileText, FileType2, BookOpen, Paperclip } from 'lucide-react';
import { useI18n } from '../index.js';

import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';

// 错误边界组件
class MarkdownErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Markdown 渲染错误:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          backgroundColor: 'var(--bg-tertiary)',
          border: '1px solid var(--accent-danger)',
          borderRadius: '4px',
          color: 'var(--accent-danger)'
        }}>
          <h4>⚠️ 内容渲染出错</h4>
          <p style={{ color: 'var(--text-primary)' }}>此消息包含无法正确渲染的内容（可能是格式错误的数学公式）</p>
          <details style={{ marginTop: '10px' }}>
            <summary style={{ cursor: 'pointer', color: 'var(--text-primary)' }}>查看原始文本</summary>
            <pre style={{
              marginTop: '10px',
              padding: '10px',
              backgroundColor: 'var(--bg-code)',
              color: 'var(--text-code)',
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '12px',
              border: '1px solid var(--border-primary)'
            }}>
              {this.props.fallbackContent || '无内容'}
            </pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

// ==================== System Context Knowledge File 子组件 ====================
const SystemContextKnowledgeFile = ({ file }) => {
  const [open, setOpen] = useState(false);
  const content = file.content || '';
  const sizeStr = content.length > 1024
    ? `${(content.length / 1024).toFixed(1)} KB`
    : `${content.length} B`;

  return (
    <div className="sys-ctx-knowledge-file">
      <button className="sys-ctx-knowledge-header" onClick={() => setOpen(!open)}>
        <span className="sys-ctx-knowledge-icon">📄</span>
        <span className="sys-ctx-knowledge-name">{file.name}</span>
        <span className="sys-ctx-knowledge-size">{sizeStr}</span>
        <span className="sys-ctx-knowledge-chevron">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <pre className="sys-ctx-knowledge-content">{content}</pre>
      )}
    </div>
  );
};

const MessageDetail = ({
  processedData,
  selectedMessageIndex,
  activeTab = 'content',
  searchQuery,
  format,
  onTabChange,
  showTabs = true,
  systemContext = null,  // system context 模式
  notes = {},
  onNoteChange = null
}) => {
  const { t } = useI18n();
  const contentRef = useRef(null);
  const [imageLoadErrors, setImageLoadErrors] = useState({});
  const [attachmentViewMode, setAttachmentViewMode] = useState({});

  const currentActiveTab = activeTab;
  const handleTabChange = onTabChange;

  const getCurrentMessage = () => {
    if (!processedData?.chat_history || selectedMessageIndex === null) {
      return null;
    }
    return processedData.chat_history.find(msg => msg.index === selectedMessageIndex);
  };

  const currentMessage = getCurrentMessage();

  const filterImageReferences = (text) => {
    if (!text) return '';
    const result = text
      .replace(/\[(?:图片|附件|图像|image|attachment)\d*\s*[:：]\s*[^\]]+\]/gi, '')
      .replace(/\[(?:图片|附件|图像|image|attachment)\d+\]/gi, '')
      .replace(/\[图片[1-5]\]/gi, '')
      .trim();
    // [LOG-PROBE] filterImageReferences 是否真的删除了内容
    if (result !== text.trim()) {
      console.log('[PROBE] filterImageReferences 实际过滤了图片引用标记 — 原长:', text.length, '→ 新长:', result.length);
    }
    return result;
  };

  // 修复列表项中的内联 markdown 未被解析的问题
  // 当列表项包含多行或其他复杂内容时，ReactMarkdown 可能不解析内联格式
  // 解决方案：手动将内联 markdown 转换为 HTML 标签
  const fixListItemMarkdown = (text) => {
    if (!text) return '';
    const original = text;

    // 先在列表项和后续非列表内容之间添加空行分隔
    let fixed = text.replace(
      /(^|\n)([-*+]|\d+\.)\s+(.+?)(\n)(?![-*+\s]|\d+\.|\n)/gm,
      (_match, prefix, marker, content, newline) => {
        return `${prefix}${marker} ${content}${newline}${newline}`;
      }
    );

    // 手动转换列表项中的内联 markdown 为 HTML
    // 只处理列表行（以 -, *, +, 或数字. 开头）
    fixed = fixed.replace(
      /(^|\n)([-*+]|\d+\.)\s+(.+?)($|\n)/gm,
      (_match, prefix, marker, content, suffix) => {
        // 转换内联格式
        let html = content
          // 粗体：**text** 或 __text__
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/__(.+?)__/g, '<strong>$1</strong>')
          // 斜体：*text* 或 _text_ (但不匹配 ** 和 __)
          .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
          .replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '<em>$1</em>')
          // 行内代码：`text`
          .replace(/`([^`]+?)`/g, '<code>$1</code>');

        return `${prefix}${marker} ${html}${suffix}`;
      }
    );

    // [LOG-PROBE] fixListItemMarkdown 是否真的修改了内容
    if (fixed !== original) {
      console.log('[PROBE] fixListItemMarkdown 实际改变了文本 — 说明 ReactMarkdown 本身没有处理此情况，预处理有效');
    }

    return fixed;
  };

  // 修复不成对的 $$ 符号，避免 remark-math 解析崩溃
  const fixMathDelimiters = (text) => {
    if (!text) return '';

    try {
      // 移除所有 $$ 块级公式标记，将其转换为行内公式 $
      // 这是因为 remark-math 对 $$ 的解析容易出错
      let result = text.replace(/\$\$([^$]*)\$\$/g, (match, content) => {
        // 如果内容为空或只有空白，直接移除
        if (!content.trim()) return '';
        // 转换为行内公式
        return `$${content.trim()}$`;
      });

      // 处理剩余的不成对 $$
      const remaining = result.match(/\$\$/g);
      if (remaining && remaining.length % 2 !== 0) {
        result = result.replace(/\$\$/g, '\\$\\$');
      }

      return result;
    } catch (e) {
      console.error('fixMathDelimiters error:', e);
      return text;
    }
  };

  const getAvailableTabs = () => {
    const baseTabs = [{ id: 'content', label: t('messageDetail.tabs.content') }];
    
    if (!currentMessage) {
      return baseTabs;
    }
    
    if (currentMessage.sender === 'human') {
      // 用户消息：附件（排除嵌入的图片）
      // 只显示非图片的真实附件（文档、PDF等）
      // 兼容性处理：自动排除图片类型的附件
      const regularAttachments = currentMessage.attachments?.filter(att => {
        if (att.is_embedded_image) return false;
        // 兼容旧数据：排除图片类型
        if (att.file_type && att.file_type.startsWith('image/')) return false;
        return true;
      }) || [];
      if (regularAttachments.length > 0) {
        baseTabs.push({ id: 'attachments', label: t('messageDetail.tabs.attachments') });
      }
      // Gemini NotebookLM: 当存在 Canvas 字段时，显示 Canvas Tab
      if (format === 'gemini_notebooklm' && currentMessage.canvas) {
        baseTabs.push({ id: 'canvas', label: 'Canvas' });
      }
    } else {
      // 助手消息：思考过程
      if (format === 'claude' || format === 'claude_code' || format === 'jsonl_chat' || format === 'chatgpt' || format === 'grok' || format === 'gemini_notebooklm' || !format) {
        if (currentMessage.thinking) {
          baseTabs.push({ id: 'thinking', label: t('messageDetail.tabs.thinking') });
        }
      }
      // 助手消息：制品
      if (format === 'claude' || format === 'claude_code' || !format) {
        if (currentMessage.artifacts && currentMessage.artifacts.length > 0) {
          baseTabs.push({ id: 'artifacts', label: 'Artifacts' });
        }
      }
      // Gemini NotebookLM: 当存在 Canvas 字段时，显示 Canvas Tab
      if (format === 'gemini_notebooklm' && currentMessage.canvas) {
        baseTabs.push({ id: 'canvas', label: 'Canvas' });
      }
    }
    
    // 笔记 tab（所有消息都有，system context 除外）
    baseTabs.push({ id: 'notes', label: t('messageDetail.tabs.notes') });

    return baseTabs;
  };

  const availableTabs = getAvailableTabs();

  useEffect(() => {
    if (systemContext) return; // system context 模式：tab 切换由自身管理，不干预
    const availableTabIds = availableTabs.map(tab => tab.id);
    if (availableTabIds.length > 0 && !availableTabIds.includes(currentActiveTab)) {
      handleTabChange('content');
    }
  }, [availableTabs, currentActiveTab, handleTabChange, systemContext]);

  useEffect(() => {
    setImageLoadErrors({});
    setAttachmentViewMode({});
  }, [selectedMessageIndex]);

  const MarkdownComponents = {
    p: ({ children, ...props }) => {
      if (typeof children === 'string' && searchQuery) {
        const highlightedText = highlightSearchText(children, searchQuery);
        return <p {...props} dangerouslySetInnerHTML={{ __html: highlightedText }} />;
      }
      return <p {...props}>{children}</p>;
    },

    li: ({ children, ...props }) => {
      if (typeof children === 'string' && searchQuery) {
        const highlightedText = highlightSearchText(children, searchQuery);
        return <li {...props} dangerouslySetInnerHTML={{ __html: highlightedText }} />;
      }
      return <li {...props}>{children}</li>;
    },

    strong: ({ children, ...props }) => {
      return <strong {...props} style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{children}</strong>;
    },

    em: ({ children, ...props }) => {
      return <em {...props} style={{ fontStyle: 'italic', color: 'var(--text-primary)' }}>{children}</em>;
    },
    
    h1: ({ children, ...props }) => {
      if (typeof children === 'string' && searchQuery) {
        // [LOG-PROBE] 标题搜索高亮路径被触发 (h1)
        console.log('[PROBE] h1 searchQuery 高亮路径触发 — searchQuery:', searchQuery);
        const highlightedText = highlightSearchText(children, searchQuery);
        return <h1 {...props} dangerouslySetInnerHTML={{ __html: highlightedText }} />;
      }
      return <h1 {...props}>{children}</h1>;
    },
    
    h2: ({ children, ...props }) => {
      if (typeof children === 'string' && searchQuery) {
        // [LOG-PROBE] 标题搜索高亮路径被触发 (h2)
        console.log('[PROBE] h2 searchQuery 高亮路径触发');
        const highlightedText = highlightSearchText(children, searchQuery);
        return <h2 {...props} dangerouslySetInnerHTML={{ __html: highlightedText }} />;
      }
      return <h2 {...props}>{children}</h2>;
    },
    
    h3: ({ children, ...props }) => {
      if (typeof children === 'string' && searchQuery) {
        // [LOG-PROBE] 标题搜索高亮路径被触发 (h3)
        console.log('[PROBE] h3 searchQuery 高亮路径触发');
        const highlightedText = highlightSearchText(children, searchQuery);
        return <h3 {...props} dangerouslySetInnerHTML={{ __html: highlightedText }} />;
      }
      return <h3 {...props}>{children}</h3>;
    },
    
    h4: ({ children, ...props }) => {
      if (typeof children === 'string' && searchQuery) {
        // [LOG-PROBE] 标题搜索高亮路径被触发 (h4)
        console.log('[PROBE] h4 searchQuery 高亮路径触发');
        const highlightedText = highlightSearchText(children, searchQuery);
        return <h4 {...props} dangerouslySetInnerHTML={{ __html: highlightedText }} />;
      }
      return <h4 {...props}>{children}</h4>;
    },
    
    h5: ({ children, ...props }) => {
      if (typeof children === 'string' && searchQuery) {
        // [LOG-PROBE] 标题搜索高亮路径被触发 (h5)
        console.log('[PROBE] h5 searchQuery 高亮路径触发');
        const highlightedText = highlightSearchText(children, searchQuery);
        return <h5 {...props} dangerouslySetInnerHTML={{ __html: highlightedText }} />;
      }
      return <h5 {...props}>{children}</h5>;
    },
    
    h6: ({ children, ...props }) => {
      if (typeof children === 'string' && searchQuery) {
        // [LOG-PROBE] 标题搜索高亮路径被触发 (h6)
        console.log('[PROBE] h6 searchQuery 高亮路径触发');
        const highlightedText = highlightSearchText(children, searchQuery);
        return <h6 {...props} dangerouslySetInnerHTML={{ __html: highlightedText }} />;
      }
      return <h6 {...props}>{children}</h6>;
    },

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

    a: ({ href, children, ...props }) => (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer" 
        {...props}
      >
        {children}
      </a>
    ),

    ul: ({ children, ...props }) => (
      <ul {...props} style={{
        paddingLeft: '20px',
        marginBottom: '12px',
        marginTop: '8px',
        listStyleType: 'disc',
        color: 'var(--text-primary)'
      }}>{children}</ul>
    ),

    ol: ({ children, ...props }) => (
      <ol {...props} style={{
        paddingLeft: '20px',
        marginBottom: '12px',
        marginTop: '8px',
        listStyleType: 'decimal',
        color: 'var(--text-primary)'
      }}>{children}</ol>
    ),

    blockquote: ({ children, ...props }) => (
      <blockquote {...props} style={{
        borderLeft: '4px solid var(--accent-primary)',
        paddingLeft: '16px',
        marginLeft: '0',
        marginTop: '12px',
        marginBottom: '12px',
        color: 'var(--text-secondary)',
        fontStyle: 'italic'
      }}>{children}</blockquote>
    ),

    table: ({ children, ...props }) => (
      <div style={{ overflowX: 'auto' }}>
        <table {...props}>{children}</table>
      </div>
    )
  };

  const highlightSearchText = (text, query) => {
    if (!query || !text) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  };

  const renderImages = (images) => {
    if (!images || images.length === 0) {
      return null;
    }

    return (
      <div className="message-images">
        <h4>{t('messageDetail.images.title')} ({images.length})</h4>
        <div className="image-grid">
          {images.map((image, index) => {
            const imageData = getImageDisplayData(image);
            const errorKey = `${selectedMessageIndex}-${index}`;
            const hasError = imageLoadErrors[errorKey];
            let finalSrc = imageData.src;
            if (imageData.isBase64 && !finalSrc.startsWith('data:')) {
              const mediaType = image.media_type || 'image/png'; 
              finalSrc = `data:${mediaType};base64,${finalSrc}`;
            }
            return (
              <div key={index} className="image-container">
                <div className="image-wrapper">
                  {hasError ? (
                    <div className="image-error">
                      <span className="error-icon">🖼️</span>
                      <span className="error-text">{t('messageDetail.images.loadFailed')}</span>
                      <span className="error-filename">{image.file_name}</span>
                    </div>
                  ) : (
                    <img 
                      src={finalSrc}
                      alt={imageData.alt}
                      title={imageData.title}
                      onError={() => {
                        setImageLoadErrors(prev => ({
                          ...prev,
                          [errorKey]: true
                        }));
                      }}
                      onClick={() => {
                        if (imageData.isBase64) {
                          const newWindow = window.open();
                          newWindow.document.write(`
                            <html>
                              <head>
                                <title>${imageData.alt}</title>
                                <style>
                                  body { margin: 0; background: #000; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
                                  img { max-width: 100%; max-height: 100vh; object-fit: contain; }
                                </style>
                              </head>
                              <body>
                                <img src="${finalSrc}" alt="${imageData.alt}" />
                              </body>
                            </html>
                          `);
                        } else {
                          window.open(finalSrc, '_blank');
                        }
                      }}
                    />
                  )}
                </div>
                <div className="image-info">
                  <span className="image-name">{image.file_name}</span>
                  {((image.embedded_image && image.embedded_image.size) || image.file_size) && (
                    <span className="image-size">
                      {((image.embedded_image?.size || image.file_size || 0) / 1024).toFixed(1)} KB
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderArtifacts = (artifacts) => {
    if (!artifacts || artifacts.length === 0) {
      return <div className="placeholder">{t('messageDetail.placeholder.noArtifacts')}</div>;
    }

    return artifacts.map((artifact, index) => (
      <div key={index} className="artifact-item">
        <h4>Artifact {index + 1}: {artifact.title || t('messageDetail.artifacts.noTitle')}</h4>
        <div className="artifact-meta">
          <span>ID: {artifact.id || t('messageDetail.artifacts.unknown')}</span>
          <span>{t('messageDetail.artifacts.type')}: {artifact.type || t('messageDetail.artifacts.unknown')}</span>
          <span>{t('messageDetail.artifacts.operation')}: {artifact.command || t('messageDetail.artifacts.unknown')}</span>
        </div>
        
        {artifact.command === 'create' && (
          <div className="artifact-content">
            {artifact.language && (
              <div className="language-tag">{t('messageDetail.artifacts.language')}: {artifact.language}</div>
            )}
            <pre className="artifact-code">
              <code>{artifact.content || ''}</code>
            </pre>
          </div>
        )}
        
        {(artifact.command === 'update' || artifact.command === 'rewrite') && (
          <div className="artifact-content">
            {/* [LOG-PROBE] artifact update/rewrite 渲染 — 用户看到的是原始 diff 而非最终内容 */}
            {console.log('[PROBE] renderArtifacts: command=', artifact.command, '| artifact.id=', artifact.id, '— 仅展示 diff，无最终状态重建')}
            <div className="artifact-change">
              <h5>{t('messageDetail.artifacts.originalText')}:</h5>
              <pre><code>{artifact.old_str || ''}</code></pre>
            </div>
            <div className="artifact-change">
              <h5>{t('messageDetail.artifacts.newText')}:</h5>
              <pre><code>{artifact.new_str || ''}</code></pre>
            </div>
          </div>
        )}
      </div>
    ));
  };

  const renderAttachments = (attachments) => {
    if (!attachments || attachments.length === 0) {
      return <div className="placeholder">{t('messageDetail.placeholder.noAttachments')}</div>;
    }

    const toggleViewMode = (index) => {
      setAttachmentViewMode(prev => ({
        ...prev,
        [index]: prev[index] === 'full' ? 'preview' : 'full'
      }));
    };

    const getFileExtension = (fileName) => {
      if (!fileName) return '';
      const parts = fileName.split('.');
      return parts.length > 1 ? parts.pop().toLowerCase() : '';
    };

    const renderFileContent = (attachment, index) => {
      if (!attachment.extracted_content) return null;

      const isFullView = attachmentViewMode[index] === 'full';
      const fileExt = getFileExtension(attachment.file_name);
      const isCode = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'go', 'rs', 'php', 'rb', 'swift'].includes(fileExt);

      const content = isFullView ?
        attachment.extracted_content :
        attachment.extracted_content.substring(0, 1000);

      const needsToggle = attachment.extracted_content.length > 1000;

      return (
        <div className="attachment-content">
          <div className="content-header">
            <h5>
              {isFullView ? t('messageDetail.attachments.fullContent') : t('messageDetail.attachments.contentPreview')}
              {attachment.extracted_content.length > 50 && (
                <span className="content-length"> ({attachment.extracted_content.length} {t('messageDetail.attachments.characters')})</span>
              )}
            </h5>
            {needsToggle && (
              <button
                className="toggle-view-btn"
                onClick={() => toggleViewMode(index)}
              >
                {isFullView ? t('messageDetail.attachments.showPreview') : t('messageDetail.attachments.showAll')}
              </button>
            )}
          </div>

          <div className="content-body">
            {isCode ? (
              <pre className="code-content">
                <code>{content}</code>
                {!isFullView && needsToggle && (
                  <div style={{color: 'var(--text-secondary)', marginTop: '10px'}}>... {t('messageDetail.attachments.codeTruncated')} ...</div>
                )}
              </pre>
            ) : (
              <pre className="text-content">{content}{!isFullView && needsToggle && '...'}</pre>
            )}
          </div>
        </div>
      );
    };

    return (
      <div className="attachments-list">
        {attachments.map((attachment, index) => (
          <div key={index} className="attachment-item">
            <div className="attachment-header">
              <span className="attachment-icon">
                {getFileExtension(attachment.file_name) === 'md' ? <FileText size={16} /> :
                 getFileExtension(attachment.file_name) === 'docx' ? <FileType2 size={16} /> :
                 getFileExtension(attachment.file_name) === 'pdf' ? <BookOpen size={16} /> : <Paperclip size={16} />}
              </span>
              <span className="attachment-name">{attachment.file_name || t('messageDetail.attachments.unknownFile')}</span>
              <span className="attachment-size">({formatFileSize(attachment.file_size)})</span>
            </div>
            {attachment.file_type && (
              <div className="attachment-meta">
                <span>{t('messageDetail.attachments.type')}: {attachment.file_type || getFileExtension(attachment.file_name)}</span>
              </div>
            )}
            {renderFileContent(attachment, index)}
            {attachment.created_at && (
              <div className="attachment-timestamp">{t('messageDetail.attachments.created')}: {attachment.created_at}</div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderTools = (tools) => {
    if (!tools || tools.length === 0) {
      return null;
    }

    return tools.map((tool, index) => (
      <div key={index} className="tool-item">
        <h4>{t('messageDetail.tools.tool')}: {tool.name}</h4>
        
        {tool.query && (
          <div className="tool-query">
            <strong>{t('messageDetail.tools.searchQuery')}:</strong> {tool.query}
          </div>
        )}
        
        {tool.input && (
          <div className="tool-input">
            <strong>{t('messageDetail.tools.inputParams')}:</strong>
            <pre><code>{JSON.stringify(tool.input, null, 2)}</code></pre>
          </div>
        )}
        
        {tool.result && (
          <div className="tool-result">
            <strong>{t('messageDetail.tools.result')}:</strong>
            {tool.result.is_error && (
              <div className="error-notice">⚠️ {t('messageDetail.tools.executionError')}</div>
            )}
            
            {tool.name === 'web_search_tool' && tool.result.content && (
              <div className="search-results">
                {tool.result.content.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="search-result-item">
                    <a href={item.url || '#'} target="_blank" rel="noopener noreferrer">
                      {item.title || t('messageDetail.tools.noTitle')}
                    </a>
                  </div>
                ))}
                {tool.result.content.length > 5 && (
                  <div className="more-results">
                    ...{t('messageDetail.tools.moreResults', { count: tool.result.content.length - 5 })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    ));
  };

  const renderCitations = (citations) => {
    if (!citations || citations.length === 0) {
      return null;
    }

    return (
      <div className="citations">
        <h4>引用来源</h4>
        <div className="citation-list">
          {citations.map((citation, index) => (
            <div key={index} className="citation-item">
              <a href={citation.url || '#'} target="_blank" rel="noopener noreferrer">
                {citation.title || '未知来源'}
              </a>
              <span className="citation-source">
                {citation.url ? new URL(citation.url).hostname : '未知网站'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    if (!currentMessage) {
      return <div className="placeholder">{t('messageDetail.placeholder.selectMessage')}</div>;
    }

    switch (currentActiveTab) {
      case 'content':
        // 从 attachments 中筛选出嵌入的图片
        // 兼容性处理：自动检测图片类型的附件
        const embeddedImages = currentMessage.attachments?.filter(att => {
          if (att.is_embedded_image) return true;
          // 兼容旧数据：检查 MIME 类型
          if (att.file_type && att.file_type.startsWith('image/')) return true;
          return false;
        }) || [];
        // 合并两种图片来源：优先使用 images 数组，然后添加 embeddedImages
        let displayImages = null;
        if (currentMessage.images?.length > 0 || embeddedImages.length > 0) {
          displayImages = [
            ...(currentMessage.images || []),
            ...embeddedImages
          ];
        }

        return (
          <div className="message-content">
            {renderImages(displayImages)}

            <div className="message-text">
              <MarkdownErrorBoundary
                key={`content-${selectedMessageIndex}`}
                fallbackContent={currentMessage.display_text}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex, rehypeRaw]}
                  components={MarkdownComponents}
                >
                  {fixMathDelimiters(fixListItemMarkdown(filterImageReferences(currentMessage.display_text || '')))}
                </ReactMarkdown>
              </MarkdownErrorBoundary>
            </div>

            {renderTools(currentMessage.tools)}
            {renderCitations(currentMessage.citations)}
          </div>
        );

      case 'thinking':
        if (format !== 'claude' && format !== 'claude_code' && format !== 'chatgpt' && format !== 'jsonl_chat' && format !== 'grok' && format !== 'gemini_notebooklm' && format) {
          return <div className="placeholder">{t('messageDetail.placeholder.formatNotSupported.thinking')}</div>;
        }
        return (
          <div className="thinking-content">
            {currentMessage.thinking ? (
              <div className="thinking-text">
                <MarkdownErrorBoundary 
                  key={`thinking-${selectedMessageIndex}`} 
                  fallbackContent={currentMessage.thinking}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex, rehypeRaw]}
                    components={MarkdownComponents}
                  >
                    {fixMathDelimiters(fixListItemMarkdown(filterImageReferences(currentMessage.thinking)))}
                  </ReactMarkdown>
                </MarkdownErrorBoundary>
              </div>
            ) : (
              <div className="placeholder">{t('messageDetail.placeholder.noThinking')}</div>
            )}
          </div>
        );

      case 'artifacts':
        if (format !== 'claude' && format !== 'claude_code' && format) {
          return <div className="placeholder">{t('messageDetail.placeholder.formatNotSupported.artifacts')}</div>;
        }
        return (
          <div className="artifacts-content">
            {renderArtifacts(currentMessage.artifacts)}
          </div>
        );

      case 'attachments':
        // 排除嵌入的图片，只显示真正的附件
        // 兼容性处理：自动排除图片类型的附件
        const regularAttachments = currentMessage.attachments?.filter(att => {
          if (att.is_embedded_image) return false;
          // 兼容旧数据：排除图片类型
          if (att.file_type && att.file_type.startsWith('image/')) return false;
          return true;
        }) || [];
        return (
          <div className="attachments-content">
            {renderAttachments(regularAttachments)}
          </div>
        );

      case 'canvas':
        // Canvas Tab 仅在 Gemini NotebookLM 使用
        return (
          <div className="canvas-content">
            {currentMessage.canvas ? (
              <MarkdownErrorBoundary
                key={`canvas-${selectedMessageIndex}`}
                fallbackContent={currentMessage.canvas}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex, rehypeRaw]}
                  components={MarkdownComponents}
                >
                  {fixMathDelimiters(currentMessage.canvas)}
                </ReactMarkdown>
              </MarkdownErrorBoundary>
            ) : (
              <div className="placeholder">{t('messageDetail.placeholder.noCanvas') || '暂无 Canvas 内容'}</div>
            )}
          </div>
        );

      case 'notes':
        return (
          <div className="notes-content">
            <textarea
              className="notes-textarea"
              value={notes[selectedMessageIndex] || ''}
              onChange={(e) => onNoteChange && onNoteChange(selectedMessageIndex, e.target.value)}
              placeholder={t('messageDetail.placeholder.notesPlaceholder')}
            />
          </div>
        );

      default:
        return <div className="placeholder">{t('messageDetail.placeholder.selectTab')}</div>;
    }
  };

  // ==================== System Context 模式 ====================
  if (systemContext) {
    // [LOG-PROBE] MessageDetail 进入 SystemContext 模式 — 若从未出现，说明此路径完全通过 CT 内 Modal 处理
    console.log('[PROBE] MessageDetail systemContext 模式激活 — projectInfo keys:', Object.keys(systemContext.projectInfo || {}), '| userMemory keys:', Object.keys(systemContext.userMemory || {}));
    const { projectInfo, userMemory, stContext } = systemContext;

    // ==================== SillyTavern Context 模式 ====================
    if (stContext) {
      const char = stContext.character || {};

      // Build merged lorebook entries (character book + world books, enabled only)
      const lorebookEntries = [];
      (stContext.characterBook?.entries || []).filter(e => e.enabled !== false)
        .forEach(e => lorebookEntries.push({ source: 'Character Book', _wbSource: 'character', ...e }));
      Object.entries(stContext.worldBooks || {}).forEach(([bookName, wb]) => {
        const wbSource = wb.source || 'unknown'; // 'character' | 'chat' | 'global'
        (wb.entries || []).filter(e => e.enabled !== false)
          .forEach(e => lorebookEntries.push({ source: bookName, _wbSource: wbSource, ...e }));
      });

      const stTabs = [];
      if (char.description || char.personality || char.scenario)
        stTabs.push({ id: 'st_character', label: char.name || 'Character' });
      if (char.system_prompt || char.post_history_instructions)
        stTabs.push({ id: 'st_char_prompt', label: 'Character Prompt' });
      if (char.creator_notes)
        stTabs.push({ id: 'st_notes', label: 'Notes' });
      if (lorebookEntries.length > 0)
        stTabs.push({ id: 'st_lorebook', label: `Lorebook (${lorebookEntries.length})` });
      if (stContext.persona?.description)
        stTabs.push({ id: 'st_persona', label: 'Persona' });
      if (char.first_mes || char.mes_example)
        stTabs.push({ id: 'st_examples', label: 'Examples' });
      if (stContext.instructPreset || stContext.syspromptPreset)
        stTabs.push({ id: 'st_presets', label: 'Presets' });

      const stTab = stTabs.find(t => t.id === currentActiveTab) ? currentActiveTab : stTabs[0]?.id;

      const renderStContent = () => {
        switch (stTab) {
          case 'st_character':
            return (
              <div className="sys-ctx-body">
                {char.description && (
                  <section className="st-char-section">
                    <h4 className="st-section-label">Description</h4>
                    <div className="ctx-text-content">{char.description}</div>
                  </section>
                )}
                {char.personality && (
                  <section className="st-char-section">
                    <h4 className="st-section-label">Personality</h4>
                    <div className="ctx-text-content">{char.personality}</div>
                  </section>
                )}
                {char.scenario && (
                  <section className="st-char-section">
                    <h4 className="st-section-label">Scenario</h4>
                    <div className="ctx-text-content">{char.scenario}</div>
                  </section>
                )}
              </div>
            );
          case 'st_char_prompt':
            return (
              <div className="sys-ctx-body">
                {char.system_prompt && (
                  <section className="st-char-section">
                    <h4 className="st-section-label">System Prompt</h4>
                    <pre className="ctx-text-content">{char.system_prompt}</pre>
                  </section>
                )}
                {char.post_history_instructions && (
                  <section className="st-char-section">
                    <h4 className="st-section-label">Post-History Instructions</h4>
                    <pre className="ctx-text-content">{char.post_history_instructions}</pre>
                  </section>
                )}
              </div>
            );
          case 'st_notes':
            return <div className="ctx-text-content sys-ctx-body">{char.creator_notes}</div>;
          case 'st_lorebook': {
            // Group entries by world book name for clearer display
            const lbGroups = {};
            lorebookEntries.forEach(e => {
              if (!lbGroups[e.source]) lbGroups[e.source] = { _wbSource: e._wbSource, entries: [] };
              lbGroups[e.source].entries.push(e);
            });
            const sourceLabel = (s) => ({ character: '角色书', chat: '聊天绑定', global: '全局' }[s] || s);
            return (
              <div className="sys-ctx-body">
                {Object.entries(lbGroups).map(([bookName, grp]) => (
                  <section key={bookName} className="st-char-section">
                    <h4 className="st-section-label">
                      {bookName}
                      <span className="st-wb-badge" data-source={grp._wbSource}>
                        {sourceLabel(grp._wbSource)}
                      </span>
                    </h4>
                    {grp.entries.map((e, i) => (
                      <SystemContextKnowledgeFile key={i} file={{
                        name: e.keys?.join(', ') || e.comment || `Entry ${e.id}`,
                        content: e.content || ''
                      }} />
                    ))}
                  </section>
                ))}
              </div>
            );
          }
          case 'st_persona':
            return (
              <div className="sys-ctx-body">
                {stContext.persona?.name && (
                  <div className="st-persona-name">{stContext.persona.name}</div>
                )}
                <div className="ctx-text-content">{stContext.persona?.description}</div>
              </div>
            );
          case 'st_examples':
            return (
              <div className="sys-ctx-body">
                {char.first_mes && (
                  <section className="st-char-section">
                    <h4 className="st-section-label">First Message</h4>
                    <div className="ctx-text-content">{char.first_mes}</div>
                  </section>
                )}
                {char.mes_example && (
                  <section className="st-char-section">
                    <h4 className="st-section-label">Example Messages</h4>
                    <pre className="ctx-text-content">{char.mes_example}</pre>
                  </section>
                )}
              </div>
            );
          case 'st_presets':
            return (
              <div className="sys-ctx-body">
                {stContext.syspromptPreset && (
                  <section className="st-char-section">
                    <h4 className="st-section-label">System Prompt Preset</h4>
                    <div className="ctx-text-content st-preset-row">
                      <span className="st-preset-name">{stContext.syspromptPreset.name}</span>
                      {stContext.syspromptPreset.enabled !== undefined && (
                        <span className={`st-preset-badge ${stContext.syspromptPreset.enabled ? 'enabled' : 'disabled'}`}>
                          {stContext.syspromptPreset.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      )}
                    </div>
                  </section>
                )}
                {stContext.instructPreset && (
                  <section className="st-char-section">
                    <h4 className="st-section-label">Instruct Mode Preset</h4>
                    <div className="ctx-text-content st-preset-row">
                      <span className="st-preset-name">{stContext.instructPreset.name}</span>
                      {stContext.instructPreset.enabled !== undefined && (
                        <span className={`st-preset-badge ${stContext.instructPreset.enabled ? 'enabled' : 'disabled'}`}>
                          {stContext.instructPreset.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      )}
                    </div>
                  </section>
                )}
              </div>
            );
          default:
            return null;
        }
      };

      return (
        <div className="message-detail" ref={contentRef}>
          {showTabs && stTabs.length > 0 && (
            <div className="detail-tabs">
              {stTabs.map(tab => (
                <button
                  key={tab.id}
                  className={`tab ${stTab === tab.id ? 'active' : ''}`}
                  onClick={() => handleTabChange(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
          <div className="tab-content">
            {renderStContent()}
          </div>
        </div>
      );
    }

    // ==================== Claude/Project Context 模式 ====================

    const sysTabs = [];
    if (projectInfo?.description)  sysTabs.push({ id: 'proj_desc',    label: 'Project' });
    if (projectInfo?.instructions) sysTabs.push({ id: 'instructions', label: 'Instructions' });
    if (projectInfo?.memory)       sysTabs.push({ id: 'proj_memory',  label: 'Project Memory' });
    if (projectInfo?.knowledgeFiles?.length > 0) sysTabs.push({ id: 'knowledge', label: `Knowledge (${projectInfo.knowledgeFiles.length})` });
    if (userMemory?.preferences)   sysTabs.push({ id: 'preferences',  label: 'Preferences' });
    if (userMemory?.memories)      sysTabs.push({ id: 'user_memories',label: 'User Memories' });

    const sysTab = sysTabs.find(tb => tb.id === currentActiveTab) ? currentActiveTab : sysTabs[0]?.id;

    const toStr = (val) => {
      if (!val) return '';
      if (typeof val === 'string') return val;
      return JSON.stringify(val, null, 2);
    };

    const renderSysContent = () => {
      switch (sysTab) {
        case 'proj_desc':
          return <div className="ctx-text-content sys-ctx-body">{toStr(projectInfo?.description)}</div>;
        case 'instructions':
          return <div className="ctx-text-content sys-ctx-body">{toStr(projectInfo?.instructions)}</div>;
        case 'proj_memory':
          return (
            <div className="ctx-text-content sys-ctx-body">
              <MarkdownErrorBoundary fallbackContent={toStr(projectInfo?.memory)}>
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                  {toStr(projectInfo?.memory)}
                </ReactMarkdown>
              </MarkdownErrorBoundary>
            </div>
          );
        case 'knowledge':
          return (
            <div className="sys-ctx-body">
              {(projectInfo?.knowledgeFiles || []).map((file, idx) => (
                <SystemContextKnowledgeFile key={idx} file={file} />
              ))}
            </div>
          );
        case 'preferences':
          return <pre className="ctx-json-content sys-ctx-body">{toStr(userMemory?.preferences)}</pre>;
        case 'user_memories':
          return (
            <div className="ctx-text-content sys-ctx-body">
              <MarkdownErrorBoundary fallbackContent={toStr(userMemory?.memories)}>
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                  {toStr(userMemory?.memories)}
                </ReactMarkdown>
              </MarkdownErrorBoundary>
            </div>
          );
        default:
          return null;
      }
    };

    return (
      <div className="message-detail" ref={contentRef}>
        {showTabs && sysTabs.length > 0 && (
          <div className="detail-tabs">
            {sysTabs.map(tab => (
              <button
                key={tab.id}
                className={`tab ${sysTab === tab.id ? 'active' : ''}`}
                onClick={() => handleTabChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
        <div className="tab-content">
          {renderSysContent()}
        </div>
      </div>
    );
  }

  // ==================== 正常消息模式 ====================
  return (
    <div className="message-detail" ref={contentRef}>
      {showTabs && availableTabs.length >= 1 && (
        <div className="detail-tabs">
          {availableTabs.map(tab => (
            <button
              key={tab.id}
              className={`tab ${currentActiveTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="tab-content">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default MessageDetail;