// components/MessageDetail.js - 修复版
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getImageDisplayData } from '../utils/fileParser';

import remarkMath from 'remark-math'; // 增加LaTex渲染
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const MessageDetail = ({ 
  processedData, 
  selectedMessageIndex, 
  activeTab = 'content', // 提供默认值
  searchQuery,
  format, 
  onTabChange, // 可选的标签页切换回调
  showTabs = true // 新增属性，控制是否显示标签页
}) => {
  const contentRef = useRef(null);
  const [imageLoadErrors, setImageLoadErrors] = useState({});
  const [internalActiveTab, setInternalActiveTab] = useState(activeTab);
  const [expandedAttachments, setExpandedAttachments] = useState(new Set());
  const [attachmentViewMode, setAttachmentViewMode] = useState({}); // 'preview' or 'full' for each attachment
  
  // 使用内部状态管理activeTab，如果没有提供onTabChange
  const currentActiveTab = onTabChange ? activeTab : internalActiveTab;
  const handleTabChange = onTabChange || setInternalActiveTab;
  
  // 获取当前选中的消息
  const getCurrentMessage = () => {
    if (!processedData?.chat_history || selectedMessageIndex === null) {
      return null;
    }
    return processedData.chat_history.find(msg => msg.index === selectedMessageIndex);
  };

  const currentMessage = getCurrentMessage();

  // 过滤图片引用的工具函数（增强版）
  const filterImageReferences = (text) => {
    if (!text) return '';
    return text
      .replace(/\[(?:图片|附件|图像|image|attachment)\d*\s*[:：]\s*[^\]]+\]/gi, '')
      .replace(/\[(?:图片|附件|图像|image|attachment)\d+\]/gi, '')
      .replace(/\[图片1\]/gi, '')
      .replace(/\[图片2\]/gi, '')
      .replace(/\[图片3\]/gi, '')
      .replace(/\[图片4\]/gi, '')
      .replace(/\[图片5\]/gi, '')
      .trim();
  };

  // 根据格式决定显示哪些标签页
  const getAvailableTabs = () => {
    const baseTabs = [{ id: 'content', label: '内容' }];
    
    // 如果没有选中消息，返回基础标签
    if (!currentMessage) {
      return baseTabs;
    }
    
    // 人类消息的处理
    if (currentMessage.sender === 'human') {
      // 人类消息不显示思考过程和Artifacts
      // 但如果有附件，显示附件选项卡
      if (currentMessage.attachments && currentMessage.attachments.length > 0) {
        baseTabs.push({ id: 'attachments', label: '附加文件' });
      }
    } else {
      // 助手消息的处理（仅Claude格式显示思考过程和Artifacts）
      if (format === 'claude' || format === 'claude_full_export' || !format) {
        if (currentMessage.thinking) {
          baseTabs.push({ id: 'thinking', label: '思考过程' });
        }
        if (currentMessage.artifacts && currentMessage.artifacts.length > 0) {
          baseTabs.push({ id: 'artifacts', label: 'Artifacts' });
        }
      }
    }
    
    return baseTabs;
  };

  const availableTabs = getAvailableTabs();

  // 自动调整activeTab，确保它在可用标签中
  useEffect(() => {
    const availableTabIds = availableTabs.map(tab => tab.id);
    if (availableTabIds.length > 0 && !availableTabIds.includes(currentActiveTab)) {
      handleTabChange('content'); // 默认切换到内容标签
    }
  }, [availableTabs, currentActiveTab, handleTabChange]);

  // 清除图片错误状态当消息改变时
  useEffect(() => {
    setImageLoadErrors({});
    setExpandedAttachments(new Set());
    setAttachmentViewMode({});
  }, [selectedMessageIndex]);

  // 自定义渲染组件，用于搜索高亮
  const MarkdownComponents = {
    // ... 保持原有的MarkdownComponents不变
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

    blockquote: ({ children, ...props }) => (
      <blockquote {...props}>{children}</blockquote>
    ),

    table: ({ children, ...props }) => (
      <div style={{ overflowX: 'auto' }}>
        <table {...props}>{children}</table>
      </div>
    )
  };

  // 搜索高亮功能
  const highlightSearchText = (text, query) => {
    if (!query || !text) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  };

  // 渲染图片
  const renderImages = (images) => {
    if (!images || images.length === 0) {
      return null;
    }

    return (
      <div className="message-images">
        <h4>图片附件 ({images.length})</h4>
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
                      <span className="error-text">图片加载失败</span>
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
                  {image.embedded_image && image.embedded_image.size && (
                    <span className="image-size">
                      {(image.embedded_image.size / 1024).toFixed(1)} KB
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

  // 渲染Artifacts
  const renderArtifacts = (artifacts) => {
    if (!artifacts || artifacts.length === 0) {
      return <div className="placeholder">此消息没有使用Artifacts</div>;
    }

    return artifacts.map((artifact, index) => (
      <div key={index} className="artifact-item">
        <h4>Artifact {index + 1}: {artifact.title || '无标题'}</h4>
        <div className="artifact-meta">
          <span>ID: {artifact.id || '未知'}</span>
          <span>类型: {artifact.type || '未知'}</span>
          <span>操作: {artifact.command || '未知'}</span>
        </div>
        
        {artifact.command === 'create' && (
          <div className="artifact-content">
            {artifact.language && (
              <div className="language-tag">语言: {artifact.language}</div>
            )}
            <pre className="artifact-code">
              <code>{artifact.content || ''}</code>
            </pre>
          </div>
        )}
        
        {(artifact.command === 'update' || artifact.command === 'rewrite') && (
          <div className="artifact-content">
            <div className="artifact-change">
              <h5>原始文本:</h5>
              <pre><code>{artifact.old_str || ''}</code></pre>
            </div>
            <div className="artifact-change">
              <h5>新文本:</h5>
              <pre><code>{artifact.new_str || ''}</code></pre>
            </div>
          </div>
        )}
      </div>
    ));
  };

  // 渲染附件
  const renderAttachments = (attachments) => {
    if (!attachments || attachments.length === 0) {
      return <div className="placeholder">此消息没有附件</div>;
    }

    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const toggleExpanded = (index) => {
      const newExpanded = new Set(expandedAttachments);
      if (newExpanded.has(index)) {
        newExpanded.delete(index);
      } else {
        newExpanded.add(index);
      }
      setExpandedAttachments(newExpanded);
    };

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

      const isExpanded = expandedAttachments.has(index);
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
              {isFullView ? '完整内容' : '内容预览'}
              {attachment.extracted_content.length > 50 && (
                <span className="content-length"> ({attachment.extracted_content.length} 字符)</span>
              )}
            </h5>
            {needsToggle && (
              <button 
                className="toggle-view-btn"
                onClick={() => toggleViewMode(index)}
              >
                {isFullView ? '显示预览' : '显示全部'}
              </button>
            )}
          </div>
          
          <div 
            className="content-body"
            style={{
              maxHeight: isExpanded ? 'none' : '300px',
              overflow: isExpanded ? 'visible' : 'hidden'
            }}
          >
            {isMarkdown ? (
              <div className="markdown-content">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm, remarkMath]}  // 添加 remarkMath
                  rehypePlugins={[rehypeKatex]}  // 添加 rehypeKatex
                  components={{
                    // 自定义代码块样式
                    code: ({node, inline, className, children, ...props}) => {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <pre style={{
                          background: '#2d2d2d',
                          color: '#f8f8f2',
                          padding: '10px',
                          borderRadius: '4px',
                          overflow: 'auto'
                        }}>
                          <code className={className} {...props}>
                            {children}
                          </code>
                        </pre>
                      ) : (
                        <code style={{
                          background: '#f6f8fa',
                          padding: '2px 4px',
                          borderRadius: '3px',
                          fontSize: '85%'
                        }} {...props}>
                          {children}
                        </code>
                      );
                    },
                    // 自定义标题样式
                    h1: ({children}) => <h1 style={{fontSize: '1.8em', marginTop: '20px', marginBottom: '10px'}}>{children}</h1>,
                    h2: ({children}) => <h2 style={{fontSize: '1.5em', marginTop: '18px', marginBottom: '8px'}}>{children}</h2>,
                    h3: ({children}) => <h3 style={{fontSize: '1.3em', marginTop: '16px', marginBottom: '6px'}}>{children}</h3>,
                    // 自定义列表样式
                    ul: ({children}) => <ul style={{paddingLeft: '25px', marginBottom: '10px'}}>{children}</ul>,
                    ol: ({children}) => <ol style={{paddingLeft: '25px', marginBottom: '10px'}}>{children}</ol>,
                    // 自定义引用块
                    blockquote: ({children}) => (
                      <blockquote style={{
                        borderLeft: '4px solid #dfe2e5',
                        paddingLeft: '16px',
                        margin: '10px 0',
                        color: '#6a737d'
                      }}>
                        {children}
                      </blockquote>
                    )
                  }}
                >
                  {content}
                </ReactMarkdown>
                {!isFullView && needsToggle && (
                  <div style={{
                    textAlign: 'center',
                    padding: '10px',
                    color: 'var(--text-secondary)',
                    fontSize: '14px'
                  }}>
                    ... 内容已截断 ...
                  </div>
                )}
              </div>
            ) : isCode ? (
              <pre className="code-content">
                <code>{content}</code>
                {!isFullView && needsToggle && (
                  <div style={{color: 'var(--text-secondary)', marginTop: '10px'}}>
                    ... 代码已截断 ...
                  </div>
                )}
              </pre>
            ) : (
              <pre className="text-content">
                {content}
                {!isFullView && needsToggle && '...'}
              </pre>
            )}
            
            {/* 渐变遮罩效果 */}
            {!isExpanded && attachment.extracted_content.length > 300 && (
              <div className="gradient-overlay" />
            )}
          </div>
          
          {attachment.extracted_content.length > 300 && (
            <button 
              className="expand-btn"
              onClick={() => toggleExpanded(index)}
            >
              {isExpanded ? '⬆ 收起内容' : '⬇ 展开显示更多'}
            </button>
          )}
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
              <span className="attachment-name">{attachment.file_name || '未知文件'}</span>
              <span className="attachment-size">({formatFileSize(attachment.file_size)})</span>
            </div>
            
            {attachment.file_type && (
              <div className="attachment-meta">
                <span>类型: {attachment.file_type || getFileExtension(attachment.file_name)}</span>
              </div>
            )}
            
            {renderFileContent(attachment, index)}
            
            {attachment.created_at && (
              <div className="attachment-timestamp">
                创建时间: {attachment.created_at}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // 渲染工具使用记录
  const renderTools = (tools) => {
    if (!tools || tools.length === 0) {
      return null;
    }

    return tools.map((tool, index) => (
      <div key={index} className="tool-item">
        <h4>工具: {tool.name}</h4>
        
        {tool.query && (
          <div className="tool-query">
            <strong>搜索查询:</strong> {tool.query}
          </div>
        )}
        
        {tool.input && (
          <div className="tool-input">
            <strong>输入参数:</strong>
            <pre><code>{JSON.stringify(tool.input, null, 2)}</code></pre>
          </div>
        )}
        
        {tool.result && (
          <div className="tool-result">
            <strong>结果:</strong>
            {tool.result.is_error && (
              <div className="error-notice">⚠️ 工具执行出错</div>
            )}
            
            {tool.name === 'web_search' && tool.result.content && (
              <div className="search-results">
                {tool.result.content.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="search-result-item">
                    <a href={item.url || '#'} target="_blank" rel="noopener noreferrer">
                      {item.title || '无标题'}
                    </a>
                  </div>
                ))}
                {tool.result.content.length > 5 && (
                  <div className="more-results">
                    ...还有 {tool.result.content.length - 5} 个结果
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    ));
  };

  // 渲染引用
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

  // 主要渲染逻辑
  const renderTabContent = () => {
    if (!currentMessage) {
      return <div className="placeholder">选择一条消息查看详情</div>;
    }

    switch (currentActiveTab) {
      case 'content':
        return (
          <div className="message-content">
            {renderImages(currentMessage.images || currentMessage.attachments)}
            
            <div className="message-text">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm, remarkMath]}  // 添加 remarkMath
                rehypePlugins={[rehypeKatex]}  // 添加 rehypeKatex
                components={MarkdownComponents}
              >
                {filterImageReferences(currentMessage.display_text || '')}
              </ReactMarkdown>
            </div>
            
            {renderTools(currentMessage.tools)}
            {renderCitations(currentMessage.citations)}
          </div>
        );

      case 'thinking':
        if (format !== 'claude' && format !== 'claude_full_export' && format) {
          return <div className="placeholder">此格式不支持思考过程</div>;
        }
        return (
          <div className="thinking-content">
            {currentMessage.thinking ? (
              <div className="thinking-text">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm, remarkMath]}  // 添加 remarkMath
                  rehypePlugins={[rehypeKatex]}  // 添加 rehypeKatex
                  components={MarkdownComponents}
                >
                  {filterImageReferences(currentMessage.thinking)}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="placeholder">此消息没有思考过程记录</div>
            )}
          </div>
        );

      case 'artifacts':
        if (format !== 'claude' && format !== 'claude_full_export' && format) {
          return <div className="placeholder">此格式不支持Artifacts</div>;
        }
        return (
          <div className="artifacts-content">
            {renderArtifacts(currentMessage.artifacts)}
          </div>
        );

      case 'attachments':
        return (
          <div className="attachments-content">
            {renderAttachments(currentMessage.attachments)}
          </div>
        );

      default:
        return <div className="placeholder">请选择一个标签页</div>;
    }
  };

  return (
    <div className="message-detail" ref={contentRef}>
      {/* 标签页 - 只在showTabs为true且有多个可用标签时才显示 */}
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
      
      {/* 标签页内容 */}
      <div className="tab-content">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default MessageDetail;