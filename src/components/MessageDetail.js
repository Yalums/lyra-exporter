// components/MessageDetail.js - 修复版
import React, { useState, useRef, useEffect, Component } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getImageDisplayData, formatFileSize } from '../utils/fileParser';
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

const MessageDetail = ({ 
  processedData, 
  selectedMessageIndex, 
  activeTab = 'content',
  searchQuery,
  format, 
  onTabChange,
  showTabs = true
}) => {
  const { t } = useI18n();
  const contentRef = useRef(null);
  const [imageLoadErrors, setImageLoadErrors] = useState({});
  const [internalActiveTab, setInternalActiveTab] = useState(activeTab);
  const [attachmentViewMode, setAttachmentViewMode] = useState({});
  
  const currentActiveTab = onTabChange ? activeTab : internalActiveTab;
  const handleTabChange = onTabChange || setInternalActiveTab;
  
  const getCurrentMessage = () => {
    if (!processedData?.chat_history || selectedMessageIndex === null) {
      return null;
    }
    return processedData.chat_history.find(msg => msg.index === selectedMessageIndex);
  };

  const currentMessage = getCurrentMessage();

  const filterImageReferences = (text) => {
    if (!text) return '';
    return text
      .replace(/\[(?:图片|附件|图像|image|attachment)\d*\s*[:：]\s*[^\]]+\]/gi, '')
      .replace(/\[(?:图片|附件|图像|image|attachment)\d+\]/gi, '')
      .replace(/\[图片[1-5]\]/gi, '')
      .trim();
  };

  // 修复列表项中的内联 markdown 未被解析的问题
  // 当列表项包含多行或其他复杂内容时，ReactMarkdown 可能不解析内联格式
  // 解决方案：手动将内联 markdown 转换为 HTML 标签
  const fixListItemMarkdown = (text) => {
    if (!text) return '';

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
      if (format === 'claude' || format === 'claude_code' || format === 'jsonl_chat' || format === 'chatgpt' || format === 'grok' || !format) {
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
    
    return baseTabs;
  };

  const availableTabs = getAvailableTabs();

  useEffect(() => {
    const availableTabIds = availableTabs.map(tab => tab.id);
    if (availableTabIds.length > 0 && !availableTabIds.includes(currentActiveTab)) {
      handleTabChange('content');
    }
  }, [availableTabs, currentActiveTab, handleTabChange]);

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
      // 如果 children 是纯字符串且包含未解析的 markdown（如 **text**），手动解析它
      if (typeof children === 'string') {
        // 处理搜索高亮
        if (searchQuery) {
          const highlightedText = highlightSearchText(children, searchQuery);
          return <li {...props} dangerouslySetInnerHTML={{ __html: highlightedText }} />;
        }

        // 检测是否包含未解析的 markdown 格式
        if (children.includes('**') || children.includes('*') || children.includes('`')) {
          // 手动解析内联 markdown
          let html = children
            // 粗体：**text** 或 __text__
            .replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight: bold; color: var(--text-primary);">$1</strong>')
            .replace(/__(.+?)__/g, '<strong style="font-weight: bold; color: var(--text-primary);">$1</strong>')
            // 斜体：*text* 或 _text_ (但不匹配 ** 和 __)
            .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em style="font-style: italic; color: var(--text-primary);">$1</em>')
            .replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '<em style="font-style: italic; color: var(--text-primary);">$1</em>')
            // 行内代码：`text`
            .replace(/`(.+?)`/g, '<code style="background: var(--bg-tertiary); color: var(--accent-danger); padding: 2px 4px; border-radius: 3px; font-size: 85%;">$1</code>')
            // 换行符转为 <br>
            .replace(/\n/g, '<br>');

          return <li {...props} dangerouslySetInnerHTML={{ __html: html }} />;
        }
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
        const highlightedText = highlightSearchText(children, searchQuery);
        return <h1 {...props} dangerouslySetInnerHTML={{ __html: highlightedText }} />;
      }
      return <h1 {...props}>{children}</h1>;
    },
    
    h2: ({ children, ...props }) => {
      if (typeof children === 'string' && searchQuery) {
        const highlightedText = highlightSearchText(children, searchQuery);
        return <h2 {...props} dangerouslySetInnerHTML={{ __html: highlightedText }} />;
      }
      return <h2 {...props}>{children}</h2>;
    },
    
    h3: ({ children, ...props }) => {
      if (typeof children === 'string' && searchQuery) {
        const highlightedText = highlightSearchText(children, searchQuery);
        return <h3 {...props} dangerouslySetInnerHTML={{ __html: highlightedText }} />;
      }
      return <h3 {...props}>{children}</h3>;
    },
    
    h4: ({ children, ...props }) => {
      if (typeof children === 'string' && searchQuery) {
        const highlightedText = highlightSearchText(children, searchQuery);
        return <h4 {...props} dangerouslySetInnerHTML={{ __html: highlightedText }} />;
      }
      return <h4 {...props}>{children}</h4>;
    },
    
    h5: ({ children, ...props }) => {
      if (typeof children === 'string' && searchQuery) {
        const highlightedText = highlightSearchText(children, searchQuery);
        return <h5 {...props} dangerouslySetInnerHTML={{ __html: highlightedText }} />;
      }
      return <h5 {...props}>{children}</h5>;
    },
    
    h6: ({ children, ...props }) => {
      if (typeof children === 'string' && searchQuery) {
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
      const isMarkdown = fileExt === 'md' || fileExt === 'markdown';
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
            {isMarkdown ? (
              <div className="markdown-content">
                <MarkdownErrorBoundary 
                  key={`attachment-${selectedMessageIndex}-${index}`} 
                  fallbackContent={content}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex, rehypeRaw]}
                    components={{
                      code: ({node, inline, className, children, ...props}) => {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                          <pre style={{
                            background: 'var(--bg-code)',
                            color: 'var(--text-code)',
                            padding: '10px',
                            borderRadius: '4px',
                            overflow: 'auto',
                            border: '1px solid var(--border-primary)'
                          }}>
                            <code className={className} {...props}>
                              {children}
                            </code>
                          </pre>
                        ) : (
                          <code style={{
                            background: 'var(--bg-tertiary)',
                            color: 'var(--accent-danger)',
                            padding: '2px 4px',
                            borderRadius: '3px',
                            fontSize: '85%',
                            border: '1px solid var(--border-primary)'
                          }} {...props}>
                            {children}
                          </code>
                        );
                      },
                      h1: ({children}) => <h1 style={{fontSize: '1.8em', marginTop: '20px', marginBottom: '10px', color: 'var(--text-primary)'}}>{children}</h1>,
                      h2: ({children}) => <h2 style={{fontSize: '1.5em', marginTop: '18px', marginBottom: '8px', color: 'var(--text-primary)'}}>{children}</h2>,
                      h3: ({children}) => <h3 style={{fontSize: '1.3em', marginTop: '16px', marginBottom: '6px', color: 'var(--text-primary)'}}>{children}</h3>,
                      ul: ({children}) => <ul style={{paddingLeft: '25px', marginBottom: '10px', color: 'var(--text-primary)'}}>{children}</ul>,
                      ol: ({children}) => <ol style={{paddingLeft: '25px', marginBottom: '10px', color: 'var(--text-primary)'}}>{children}</ol>,
                      blockquote: ({children}) => (
                        <blockquote style={{
                          borderLeft: '4px solid var(--accent-primary)',
                          paddingLeft: '16px',
                          margin: '10px 0',
                          color: 'var(--text-secondary)',
                          background: 'var(--bg-tertiary)',
                          borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                          padding: '12px 16px'
                        }}>
                          {children}
                        </blockquote>
                      )
                    }}
                  >
                    {content || ''}
                  </ReactMarkdown>
                </MarkdownErrorBoundary>
                {!isFullView && needsToggle && (
                  <div style={{ textAlign: 'center', padding: '10px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                    ... {t('messageDetail.attachments.contentTruncated')} ...
                  </div>
                )}
              </div>
            ) : isCode ? (
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
                {getFileExtension(attachment.file_name) === 'md' ? '📝' :
                 getFileExtension(attachment.file_name) === 'docx' ? '📄' :
                 getFileExtension(attachment.file_name) === 'pdf' ? '📕' : '📎'}
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
        if (format !== 'claude' && format !== 'claude_code' && format !== 'chatgpt' && format !== 'jsonl_chat' && format !== 'grok' && format) {
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

      default:
        return <div className="placeholder">{t('messageDetail.placeholder.selectTab')}</div>;
    }
  };

  return (
    <div className="message-detail" ref={contentRef}>
      {showTabs && availableTabs.length > 1 && (
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
