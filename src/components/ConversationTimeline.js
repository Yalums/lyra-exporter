// components/ConversationTimeline.js
// 增强版时间线组件，整合了分支切换功能
import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MessageDetail from './MessageDetail';
import PlatformIcon from './PlatformIcon';
import '../styles/BranchSwitcher.css';


// ==================== 分支切换器组件（内嵌） ====================
const BranchSwitcher = ({ 
  branchPoint, 
  availableBranches, 
  currentBranchIndex, 
  onBranchChange,
  onShowAllBranches,
  showAllMode = false,
  className = ""
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [switchAnimation, setSwitchAnimation] = useState(false);

  const currentBranch = availableBranches[currentBranchIndex];
  const hasPrevious = currentBranchIndex > 0;
  const hasNext = currentBranchIndex < availableBranches.length - 1;

  const handlePrevious = () => {
    if (hasPrevious) {
      setSwitchAnimation(true);
      setTimeout(() => {
        onBranchChange(currentBranchIndex - 1);
        setSwitchAnimation(false);
      }, 150);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      setSwitchAnimation(true);
      setTimeout(() => {
        onBranchChange(currentBranchIndex + 1);
        setSwitchAnimation(false);
      }, 150);
    }
  };

  const handleDirectSwitch = (index) => {
    if (index !== currentBranchIndex) {
      setSwitchAnimation(true);
      setTimeout(() => {
        onBranchChange(index);
        setSwitchAnimation(false);
        setIsExpanded(false);
      }, 150);
    }
  };

  const getBranchDisplayName = (branch, index) => {
    return index === 0 ? '主分支' : `分支 ${index}`;
  };

  const getBranchPreview = (branch) => {
    return branch?.preview || '...';
  };

  const getBranchCounter = () => {
    if (showAllMode) return `全部/${availableBranches.length}`;
    return `${currentBranchIndex + 1}/${availableBranches.length}`;
  };

  if (!showAllMode && !currentBranch) return null;

  return (
    <div className={`branch-switcher ${className}`}>
      <div className="branch-switcher-main">
        {/* 左箭头 */}
        <button
          className={`branch-arrow branch-arrow-left ${!hasPrevious ? 'disabled' : ''}`}
          onClick={handlePrevious}
          disabled={!hasPrevious}
          title="上一个分支"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M10 12l-4-4 4-4v8z"/>
          </svg>
        </button>

        {/* 分支信息区域 */}
        <div 
          className={`branch-info ${switchAnimation ? 'switching' : ''}`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="branch-info-main">
            <span className="branch-name">
              {getBranchDisplayName(currentBranch, currentBranchIndex)}
            </span>
            <span className="branch-counter">
              {getBranchCounter()}
            </span>
          </div>
          
          <div className="branch-preview">
            {getBranchPreview(currentBranch)}
          </div>

          {/* 展开指示器 */}
          {availableBranches.length > 2 && (
            <div className={`expand-indicator ${isExpanded ? 'expanded' : ''}`}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M6 8L2 4h8l-4 4z"/>
              </svg>
            </div>
          )}
        </div>

        {/* 右箭头 */}
        <button
          className={`branch-arrow branch-arrow-right ${!hasNext ? 'disabled' : ''}`}
          onClick={handleNext}
          disabled={!hasNext}
          title="下一个分支"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6 4l4 4-4 4V4z"/>
          </svg>
        </button>
      </div>

      {/* 展开的分支列表 */}
      {isExpanded && availableBranches.length > 2 && (
        <div className="branch-list">
          {/* 显示全部分支选项 */}
          <div
            className={`branch-option ${showAllMode ? 'active' : ''}`}
            onClick={() => {
              if (onShowAllBranches) onShowAllBranches();
              setIsExpanded(false);
            }}
          >
            <div className="branch-option-header">
              <span className="branch-option-name">显示全部分支</span>
              <span className="branch-option-count">全部消息</span>
            </div>
            <div className="branch-option-preview">显示所有分支的消息</div>
          </div>
          
          {/* 各个分支选项 */}
          {availableBranches.map((branch, index) => (
            <div
              key={`${branchPoint.uuid}-branch-${index}`}
              className={`branch-option ${!showAllMode && index === currentBranchIndex ? 'active' : ''}`}
              onClick={() => handleDirectSwitch(index)}
            >
              <div className="branch-option-header">
                <span className="branch-option-name">
                  {getBranchDisplayName(branch, index)}
                </span>
                <span className="branch-option-count">
                  {branch.messageCount}条消息
                </span>
              </div>
              <div className="branch-option-preview">
                {getBranchPreview(branch)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ==================== 主时间线组件 ====================
const ConversationTimeline = ({ 
  data, 
  messages, 
  marks, 
  onMessageSelect,
  markActions,
  format,
  conversation = null,
  sortActions = null,
  hasCustomSort = false,
  enableSorting = false,
  files = [],
  currentFileIndex = null,
  onFileSwitch = null,
  searchQuery = ''
}) => {
  const [selectedMessageIndex, setSelectedMessageIndex] = useState(null);
  const [activeTab, setActiveTab] = useState('content');
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [branchFilters, setBranchFilters] = useState(new Map());
  const [showAllBranches, setShowAllBranches] = useState(false);
  
  // ==================== 分支分析 ====================
  
  const branchAnalysis = useMemo(() => {
    const findBranchMessages = (startUuid, msgDict, parentChildren) => {
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
    };
    
    const msgDict = {};
    const parentChildren = {};
    const branchPoints = new Map();
    
    // 过滤消息
    let analysisMessages = messages;
    if (format === 'claude_full_export' && conversation?.uuid) {
      const realConversationUuid = conversation.uuid.includes('-') ? 
        conversation.uuid.split('-').slice(1).join('-') : conversation.uuid;
      
      analysisMessages = messages.filter(msg => 
        msg.conversation_uuid === realConversationUuid && 
        !msg.is_conversation_header
      );
    }
    
    analysisMessages.forEach(msg => {
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
    Object.entries(parentChildren).forEach(([parentUuid, children]) => {
      if (children.length > 1 && msgDict[parentUuid]) {
        const branchPoint = msgDict[parentUuid];
        
        const sortedChildren = children
          .map(uuid => msgDict[uuid])
          .filter(msg => msg)
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        const branches = sortedChildren.map((childMsg, branchIndex) => {
          const branchMessages = findBranchMessages(childMsg.uuid, msgDict, parentChildren);
          
          return {
            branchIndex,
            startMessage: childMsg,
            messages: branchMessages,
            messageCount: branchMessages.length,
            path: `branch_${branchPoint.uuid}_${branchIndex}`,
            preview: childMsg.display_text ? 
              (childMsg.display_text.length > 50 ? 
                childMsg.display_text.substring(0, 50) + '...' : 
                childMsg.display_text) :
              '...'
          };
        });
        
        branchPoints.set(parentUuid, {
          branchPoint,
          branches,
          currentBranchIndex: 0
        });
      }
    });
    
    return { branchPoints, msgDict, parentChildren };
  }, [messages, format, conversation]);
  
  // ==================== 状态和副作用 ====================
  
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  useEffect(() => {
    if (branchAnalysis.branchPoints.size > 0 && branchFilters.size === 0 && !showAllBranches) {
      const initialFilters = new Map();
      branchAnalysis.branchPoints.forEach((branchData, branchPointUuid) => {
        initialFilters.set(branchPointUuid, 0);
      });
      setBranchFilters(initialFilters);
    }
  }, [branchAnalysis.branchPoints, branchFilters.size, showAllBranches]);

  useEffect(() => {
    if (isDesktop && messages.length > 0 && !selectedMessageIndex) {
      setSelectedMessageIndex(messages[0].index);
    }
  }, [isDesktop, messages, selectedMessageIndex]);
  
  // ==================== 消息过滤和显示 ====================
  
  const displayMessages = useMemo(() => {
    if (showAllBranches) return messages;
    if (branchAnalysis.branchPoints.size === 0) return messages;
    if (branchFilters.size === 0) return messages;

    const visibleMessages = [];
    
    for (const msg of messages) {
      let shouldShow = true;
      
      for (const [branchPointUuid, selectedBranchIndex] of branchFilters.entries()) {
        const branchData = branchAnalysis.branchPoints.get(branchPointUuid);
        if (!branchData) continue;
        
        const branchPoint = branchData.branchPoint;
        const selectedBranch = branchData.branches[selectedBranchIndex];
        
        if (msg.index > branchPoint.index) {
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
  }, [messages, branchFilters, branchAnalysis, showAllBranches]);
  
  // ==================== 事件处理函数 ====================
  
  const handleBranchSwitch = (branchPointUuid, newBranchIndex) => {
    setShowAllBranches(false);
    setBranchFilters(prev => {
      const newFilters = new Map(prev);
      newFilters.set(branchPointUuid, newBranchIndex);
      return newFilters;
    });
  };

  const handleShowAllBranches = () => {
    const newShowAllBranches = !showAllBranches;
    setShowAllBranches(newShowAllBranches);
    
    if (newShowAllBranches) {
      setBranchFilters(new Map());
    } else if (hasCustomSort && sortActions?.resetSort) {
      sortActions.resetSort();
    }
  };
  
  const handleMessageSelect = (messageIndex) => {
    setSelectedMessageIndex(messageIndex);
    if (!isDesktop) {
      onMessageSelect(messageIndex);
    }
  };
  
  // ==================== 工具函数 ====================
  
  const getLastUpdatedTime = () => {
    if (!displayMessages || displayMessages.length === 0) return '未知时间';
    
    const lastMessage = displayMessages[displayMessages.length - 1];
    if (lastMessage?.timestamp) {
      try {
        const date = new Date(lastMessage.timestamp);
        return date.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch {
        return lastMessage.timestamp;
      }
    }
    return '未知时间';
  };

  const getConversationInfo = () => {
    const lastUpdated = getLastUpdatedTime();
    
    if (conversation) {
      let platformName = 'Claude';
      if (data?.meta_info) {
        if (data.meta_info.platform === 'gemini') platformName = 'Gemini';
        else if (data.meta_info.platform === 'notebooklm') platformName = 'NotebookLM';
        else if (data.meta_info.platform === 'aistudio') platformName = 'Google AI Studio';
      }
      
      return {
        name: conversation.name || '未命名对话',
        model: conversation.model || platformName,
        created_at: conversation.created_at || '未知时间',
        updated_at: lastUpdated,
        is_starred: conversation.is_starred || false,
        messageCount: displayMessages.length,
        platform: platformName
      };
    }
    
    if (!data) return null;
    
    const metaInfo = data.meta_info || {};
    let platformName = 'Claude';
    
    if (metaInfo.platform === 'gemini') platformName = 'Gemini';
    else if (metaInfo.platform === 'notebooklm') platformName = 'NotebookLM';
    else if (metaInfo.platform === 'aistudio') platformName = 'Google AI Studio';
    else if (format === 'gemini_notebooklm') platformName = 'Gemini';
    
    return {
      name: metaInfo.title || '未知对话',
      model: metaInfo.model || platformName,
      created_at: metaInfo.created_at || '未知时间',
      updated_at: lastUpdated,
      is_starred: false,
      messageCount: displayMessages.length,
      platform: platformName
    };
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return timestamp;
    }
  };

  const filterImageReferences = (text) => {
    if (!text) return '';
    return text
      .replace(/\[(?:图片|附件|图像|image|attachment)\d*\s*[:：]\s*[^\]]+\]/gi, '')
      .replace(/\[(?:图片|附件|图像|image|attachment)\d+\]/gi, '')
      .trim();
  };

  const getPreview = (text, maxLength = 200) => {
    if (!text) return '';
    const filteredText = filterImageReferences(text);
    if (filteredText.length <= maxLength) return filteredText;
    return filteredText.substring(0, maxLength) + '...';
  };

  const isMarked = (messageIndex, markType) => {
    return marks[markType]?.has(messageIndex) || false;
  };

  const getPlatformAvatar = (sender, platform) => {
    if (sender === 'human') return '👤';
    
    return (
      <PlatformIcon 
        platform={platform?.toLowerCase() || 'claude'} 
        format={getFormatFromPlatform(platform)} 
        size={20} 
        style={{ backgroundColor: 'transparent' }}
      />
    );
  };
  
  const getFormatFromPlatform = (platform) => {
    switch(platform?.toLowerCase()) {
      case 'gemini':
      case 'google ai studio':
      case 'aistudio':
      case 'notebooklm':
        return 'gemini_notebooklm';
      default:
        return 'claude';
    }
  };

  const getPlatformClass = (platform) => {
    switch (platform?.toLowerCase()) {
      case 'gemini':
        return 'platform-gemini';
      case 'google ai studio':
      case 'aistudio':
        return 'platform-gemini';
      case 'notebooklm':
        return 'platform-notebooklm';
      default:
        return 'platform-claude';
    }
  };
  
  const getFilePreview = (direction) => {
    if (!files || files.length <= 1 || currentFileIndex === null || format === 'claude_full_export') {
      return null;
    }
    
    const targetIndex = direction === 'prev' ? currentFileIndex - 1 : currentFileIndex + 1;
    if (targetIndex < 0 || targetIndex >= files.length) return null;
    
    return {
      file: files[targetIndex],
      index: targetIndex,
      direction
    };
  };
  
  // ==================== 渲染 ====================
  
  const conversationInfo = getConversationInfo();
  const platformClass = getPlatformClass(conversationInfo?.platform);
  const prevFilePreview = getFilePreview('prev');
  const nextFilePreview = getFilePreview('next');

  return (
    <div className={`enhanced-timeline-container ${platformClass} ${isDesktop ? 'desktop-layout' : 'mobile-layout'}`}>
      <div className="timeline-main-content">
        {/* 左侧时间线面板 */}
        <div className="timeline-left-panel">
          {/* 文件切换预览 - 顶部 */}
          {prevFilePreview && isDesktop && (
            <div 
              className="file-preview file-preview-top"
              onClick={() => onFileSwitch && onFileSwitch(prevFilePreview.index)}
            >
              <div className="file-preview-inner">
                <span className="file-preview-arrow">↑</span>
                <span className="file-preview-name">{prevFilePreview.file.name}</span>
                <span className="file-preview-hint">点击切换到上一个文件</span>
              </div>
            </div>
          )}
          
          {/* 对话信息卡片 */}
          {conversationInfo && (
            <div className="conversation-info-card">
              <h2>
                {conversationInfo.name} 
                {conversationInfo.is_starred && ' ⭐'}
                <span className="platform-badge">{conversationInfo.platform}</span>
              </h2>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">模型/平台</span>
                  <span className="info-value">{conversationInfo.model}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">创建时间</span>
                  <span className="info-value">{conversationInfo.created_at}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">显示消息数</span>
                  <span className="info-value">{conversationInfo.messageCount}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">最后更新</span>
                  <span className="info-value">{conversationInfo.updated_at}</span>
                </div>
              </div>
              
              {/* 分支统计和控制 */}
              {branchAnalysis.branchPoints.size > 0 && (
                <div className="export-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>🔀 检测到 {branchAnalysis.branchPoints.size} 个分支点</span>
                  <div className="timeline-controls" style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn-secondary small"
                      onClick={handleShowAllBranches}
                      title={showAllBranches ? "只显示选中分支" : "显示全部分支"}
                    >
                      {showAllBranches ? '🔍 筛选分支' : '📋 显示全部'}
                    </button>
                    {/* 排序控制 */}
                    {showAllBranches && sortActions && (
                      !hasCustomSort ? (
                        <button 
                          className="btn-secondary small"
                          onClick={() => sortActions.enableSort()}
                          title="启用消息排序"
                        >
                          🔄 启用排序
                        </button>
                      ) : (
                        <button 
                          className="btn-secondary small"
                          onClick={() => sortActions.resetSort()}
                          title="重置排序"
                        >
                          🔄 重置排序
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 时间线 */}
          <div className="timeline">
            <div className="timeline-line"></div>
            
            {displayMessages.map((msg, index) => {
              const branchData = branchAnalysis.branchPoints.get(msg.uuid);
              const shouldShowBranchSwitcher = branchData && 
                branchData.branches.length > 1 && 
                !showAllBranches;
              
              return (
                <React.Fragment key={msg.uuid || index}>
                  {/* 消息项 */}
                  <div className="timeline-message">
                    <div className={`timeline-dot ${msg.sender === 'human' ? 'human' : 'assistant'}`}></div>
                    
                    <div 
                      className={`timeline-content ${selectedMessageIndex === msg.index ? 'selected' : ''}`}
                      onClick={() => handleMessageSelect(msg.index)}
                    >
                      <div className="timeline-header">
                        <div className="timeline-sender">
                          <div className={`timeline-avatar ${msg.sender === 'human' ? 'human' : 'assistant'}`}>
                            {getPlatformAvatar(msg.sender, conversationInfo?.platform)}
                          </div>
                          <div className="sender-info">
                            <div className="sender-name">
                              {msg.sender_label}
                              {hasCustomSort && showAllBranches && (
                                <span className="sort-position"> (#{index + 1})</span>
                              )}
                            </div>
                            <div className="sender-time">
                              {formatTime(msg.timestamp)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="timeline-actions">
                          {enableSorting && hasCustomSort && showAllBranches && sortActions && (
                            <div className="sort-controls">
                              <button 
                                className="sort-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  sortActions.moveMessage(index, 'up');
                                }}
                                disabled={index === 0}
                                title="上移"
                              >
                                ↑
                              </button>
                              <button 
                                className="sort-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  sortActions.moveMessage(index, 'down');
                                }}
                                disabled={index === displayMessages.length - 1}
                                title="下移"
                              >
                                ↓
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="timeline-body">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => <span>{children}</span>,
                            h1: ({ children }) => <strong>{children}</strong>,
                            h2: ({ children }) => <strong>{children}</strong>,
                            h3: ({ children }) => <strong>{children}</strong>,
                            h4: ({ children }) => <strong>{children}</strong>,
                            h5: ({ children }) => <strong>{children}</strong>,
                            h6: ({ children }) => <strong>{children}</strong>,
                            strong: ({ children }) => <strong>{children}</strong>,
                            em: ({ children }) => <em>{children}</em>,
                            code: ({ inline, children }) => inline ? 
                              <code className="inline-code">{children}</code> : 
                              <code>{children}</code>,
                            pre: ({ children }) => <span>{children}</span>,
                            blockquote: ({ children }) => <span>" {children} "</span>,
                            a: ({ children }) => <span>{children}</span>,
                            ul: ({ children }) => <span>{children}</span>,
                            ol: ({ children }) => <span>{children}</span>,
                            li: ({ children }) => <span>• {children}</span>
                          }}
                        >
                          {getPreview(msg.display_text)}
                        </ReactMarkdown>
                      </div>
                      
                      {/* 消息标签和标记 */}
                      <div className="timeline-footer">
                        {msg.thinking && (
                          <div className="timeline-tag">
                            <span>💭</span>
                            <span>有思考过程</span>
                          </div>
                        )}
                        {msg.images && msg.images.length > 0 && (
                          <div className="timeline-tag">
                            <span>🖼️</span>
                            <span>{msg.images.length}张图片</span>
                          </div>
                        )}
                        {!msg.images && msg.attachments && msg.attachments.length > 0 && (
                          <div className="timeline-tag">
                            <span>🖼️</span>
                            <span>{msg.attachments.length}个附件</span>
                          </div>
                        )}
                        {msg.artifacts && msg.artifacts.length > 0 && (
                          <div className="timeline-tag">
                            <span>🔧</span>
                            <span>{msg.artifacts.length}个Artifacts</span>
                          </div>
                        )}
                        {msg.tools && msg.tools.length > 0 && (
                          <div className="timeline-tag">
                            <span>🔍</span>
                            <span>使用了工具</span>
                          </div>
                        )}
                        {msg.citations && msg.citations.length > 0 && (
                          <div className="timeline-tag">
                            <span>📎</span>
                            <span>{msg.citations.length}个引用</span>
                          </div>
                        )}
                        
                        {/* 标记状态 */}
                        {isMarked(msg.index, 'completed') && (
                          <div className="timeline-tag completed">
                            <span>✓</span>
                            <span>已完成</span>
                          </div>
                        )}
                        {isMarked(msg.index, 'important') && (
                          <div className="timeline-tag important">
                            <span>⭐</span>
                            <span>重要</span>
                          </div>
                        )}
                        {isMarked(msg.index, 'deleted') && (
                          <div className="timeline-tag deleted">
                            <span>🗑️</span>
                            <span>已删除</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* 分支切换器 */}
                  {shouldShowBranchSwitcher && (
                    <BranchSwitcher
                      key={`branch-${msg.uuid}`}
                      branchPoint={msg}
                      availableBranches={branchData.branches}
                      currentBranchIndex={branchFilters.get(msg.uuid) ?? branchData.currentBranchIndex}
                      onBranchChange={(newIndex) => handleBranchSwitch(msg.uuid, newIndex)}
                      onShowAllBranches={handleShowAllBranches}
                      showAllMode={false}
                      className="timeline-branch-switcher"
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          
          {/* 文件切换预览 - 底部 */}
          {nextFilePreview && isDesktop && (
            <div 
              className="file-preview file-preview-bottom"
              onClick={() => onFileSwitch && onFileSwitch(nextFilePreview.index)}
            >
              <div className="file-preview-inner">
                <span className="file-preview-arrow">↓</span>
                <span className="file-preview-name">{nextFilePreview.file.name}</span>
                <span className="file-preview-hint">点击切换到下一个文件</span>
              </div>
            </div>
          )}
        </div>
        
        {/* 右侧消息详情 - 仅PC端 */}
        {isDesktop && (
          <div className="timeline-right-panel">
            <div className="message-detail-container">
              <div className="detail-content">
                <MessageDetail
                  processedData={data}
                  selectedMessageIndex={selectedMessageIndex}
                  activeTab={activeTab}
                  searchQuery={searchQuery}
                  format={format}
                  onTabChange={setActiveTab}
                />
              </div>
              
              {/* 标记按钮 */}
              {selectedMessageIndex !== null && markActions && (
                <div className="detail-actions">
                  <button 
                    className="btn-secondary"
                    onClick={() => markActions.toggleMark(selectedMessageIndex, 'completed')}
                  >
                    {markActions.isMarked(selectedMessageIndex, 'completed') ? '取消完成' : '标记完成'} ✓
                  </button>
                  <button 
                    className="btn-secondary"
                    onClick={() => markActions.toggleMark(selectedMessageIndex, 'important')}
                  >
                    {markActions.isMarked(selectedMessageIndex, 'important') ? '取消重要' : '标记重要'} ⭐
                  </button>
                  <button 
                    className="btn-secondary"
                    onClick={() => markActions.toggleMark(selectedMessageIndex, 'deleted')}
                  >
                    {markActions.isMarked(selectedMessageIndex, 'deleted') ? '取消删除' : '标记删除'} 🗑️
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationTimeline;