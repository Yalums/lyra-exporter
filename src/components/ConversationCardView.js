// components/ConversationCardView.js
// 整合了ConversationGrid和FileCardManager的统一卡片视图组件
import React, { useState } from 'react';
import PlatformIcon from './PlatformIcon';

const ConversationCardView = ({ 
  // 通用属性
  items = [],                    // 卡片项目（文件或对话）
  viewType = 'grid',            // 视图类型: 'grid' | 'file-manager'
  onItemSelect,                  // 选择项目回调
  onItemRemove,                  // 移除项目回调
  onAddItem,                     // 添加项目回调
  selectedItem = null,           // 当前选中项
  
  // 星标相关
  onStarToggle = null,           // 星标切换回调
  starredItems = new Map(),      // 星标状态映射
  
  // 文件管理相关
  currentFileIndex = null,       // 当前文件索引
  onFileReorder = null,          // 文件重排序回调
  processedData = null,          // 处理后的数据
  
  // 配置选项
  showFileManagement = false,    // 是否显示文件管理功能
  enableDragDrop = false,        // 是否启用拖拽排序
  className = ''
}) => {
  // 拖拽状态（仅文件管理器视图）
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // ==================== 工具函数 ====================
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '未知时间';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const getModelDisplay = (model) => {
    if (!model || model === '未知模型') return 'Claude Sonnet';
    if (model.includes('opus-4') || model.includes('opus4')) {
      return 'Claude Opus 4';
    }
    if (model.includes('claude-3-opus') || model.includes('opus-3') || model.includes('opus3')) {
      return 'Claude Opus 3';
    }
    if (model.includes('sonnet-4') || model.includes('sonnet4')) {
      return 'Claude Sonnet 4';
    }
    if (model.includes('haiku')) {
      return 'Claude Haiku';
    }
    return model;
  };

  const getFileSize = (file) => {
    if (!file?.size) return '';
    const size = file.size;
    if (size < 1024) return `${size}B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
    return `${(size / (1024 * 1024)).toFixed(1)}MB`;
  };

  const getFileTypeText = (format, platform, model) => {
    switch (format) {
      case 'claude':
        return getModelDisplay(model);
      case 'claude_conversations':
        return '对话列表';
      case 'claude_full_export':
        return '完整导出';
      case 'gemini_notebooklm':
        if (platform === 'notebooklm') return 'NotebookLM';
        if (platform === 'aistudio') return 'Google AI Studio';
        return 'Gemini';
      default:
        return '未知格式';
    }
  };

  const isStarred = (item) => {
    if (starredItems.has(item.uuid)) {
      return starredItems.get(item.uuid);
    }
    return item.is_starred || false;
  };

  // ==================== 拖拽处理函数（文件管理器） ====================
  
  const handleDragStart = (e, index) => {
    if (!enableDragDrop) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
  };

  const handleDragOver = (e, index) => {
    if (!enableDragDrop) return;
    e.preventDefault();
    setDragOverIndex(index);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    if (!enableDragDrop) return;
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex && onFileReorder) {
      onFileReorder(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // ==================== 获取项目数据 ====================
  
  const getItemMetaData = (item) => {
    const firstMeta = {
      icon: <PlatformIcon 
        platform={item.platform || 'claude'} 
        format={item.type === 'file' ? item.format : 'claude'} 
        size={16} 
      />,
      text: item.type === 'file' ? 
        getFileTypeText(item.format, item.platform, item.model) :
        getModelDisplay(item.model)
    };

    const thirdMeta = item.type === 'file' ? 
      (item.conversationCount > 1 ? {
        icon: '✉️',
        text: `${item.conversationCount}个对话`
      } : null) :
      (item.project?.name ? {
        icon: '📁',
        text: item.project.name
      } : null);

    return { firstMeta, thirdMeta };
  };

  const getPreviewContent = (item) => {
    if (item.type === 'file') {
      if (item.format === 'unknown') {
        return '点击加载文件内容...';
      }
      return item.summary || `包含 ${item.conversationCount} 个对话和 ${item.messageCount} 条消息`;
    }
    return item.summary || '点击查看对话详情...';
  };

  const getStatsItems = (item) => {
    const stats = [];
    
    if (item.messageCount > 0) {
      stats.push({ icon: '💬', text: `${item.messageCount}条消息` });
    }
    if (item.hasThinking) {
      stats.push({ icon: '💭', text: '含思考' });
    }
    if (item.hasArtifacts) {
      stats.push({ icon: '🔧', text: '含代码' });
    }
    if (item.type === 'file' && item.conversationCount > 1) {
      stats.push({ icon: '📋', text: `${item.conversationCount}个对话` });
    }

    return stats;
  };

  // ==================== 渲染网格卡片 ====================
  
  const renderGridCard = (item) => {
    const { firstMeta, thirdMeta } = getItemMetaData(item);
    const previewContent = getPreviewContent(item);
    const statsItems = getStatsItems(item);
    const starred = isStarred(item);
    const isSelected = item.type === 'file' ? 
      item.isCurrentFile : 
      (selectedItem === item.uuid);

    return (
      <div 
        key={item.uuid}
        className={`conversation-tile ${item.type === 'file' ? 'file-tile' : ''} 
          ${item.isCurrentFile ? 'current-file' : ''} 
          ${isSelected ? 'selected' : ''}`}
        onClick={() => onItemSelect(item)}
      >
        <div className="tile-header">
          <div className="tile-title">
            <span>{item.name || '未命名'}</span>
          </div>
          
          <div className="tile-actions">
            {/* 星标按钮 */}
            {item.type === 'conversation' && onStarToggle && (
              <button
                className={`star-btn ${starred ? 'starred' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onStarToggle(item.uuid, item.is_starred);
                }}
                title={starred ? '取消星标' : '添加星标'}
              >
                {starred ? '⭐' : '☆'}
              </button>
            )}
            
            {/* 关闭按钮 */}
            {onItemRemove && (item.type === 'file' || showFileManagement) && (
              <button
                className="file-close-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onItemRemove(item.fileIndex);
                }}
                title={item.type === 'file' ? '关闭文件' : '关闭当前文件'}
              >
                ×
              </button>
            )}
          </div>
        </div>
        
        <div className="tile-meta">
          <div className="meta-row">
            {firstMeta.icon}
            <span>{firstMeta.text}</span>
          </div>
          
          <div className="meta-row">
            <span>📅</span>
            <span>{formatDate(item.created_at)}</span>
          </div>
          
          {thirdMeta && (
            <div className="meta-row">
              <span>{thirdMeta.icon}</span>
              <span>{thirdMeta.text}</span>
            </div>
          )}
        </div>
        
        <div className="tile-preview">
          {previewContent}
        </div>
        
        {statsItems.length > 0 && (
          <div className="tile-stats">
            {statsItems.map((stat, index) => (
              <div key={index} className="stat-item">
                <span>{stat.icon}</span>
                <span>{stat.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ==================== 渲染文件管理卡片 ====================
  
  const renderFileManagerCard = (file, index) => {
    const isActive = index === currentFileIndex;
    const isDragOver = dragOverIndex === index;

    return (
      <div
        key={`${file.name}-${index}`}
        className={`file-card ${isActive ? 'active' : ''} ${isDragOver ? 'drag-over' : ''}`}
        draggable={enableDragDrop}
        onDragStart={(e) => handleDragStart(e, index)}
        onDragOver={(e) => handleDragOver(e, index)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, index)}
        onClick={() => onItemSelect && onItemSelect({ type: 'file', fileIndex: index, ...file })}
      >
        <div className="file-card-header">
          <div className="file-card-title">
            <span className="file-name" title={file.name}>
              {file.name.length > 25 ? file.name.substring(0, 25) + '...' : file.name}
            </span>
            {onItemRemove && (
              <button
                className="file-card-close"
                onClick={(e) => {
                  e.stopPropagation();
                  onItemRemove(index);
                }}
                title="关闭文件"
              >
                ×
              </button>
            )}
          </div>
        </div>
        
        <div className="file-card-meta">
          <div className="meta-row">
            <span>📄</span>
            <span>{isActive && processedData ? 
              getFileTypeText(processedData.format, processedData.platform, processedData.model) : 
              '加载中...'}</span>
          </div>
          <div className="meta-row">
            <span>📅</span>
            <span>{formatDate(file.lastModified ? new Date(file.lastModified).toISOString() : null)}</span>
          </div>
          <div className="meta-row">
            <span>📊</span>
            <span>{getFileSize(file)}</span>
          </div>
        </div>
        
        <div className="file-card-preview">
          {isActive && processedData ? (
            <div className="file-preview-content">
              {processedData.format === 'claude_full_export' ? 
                `${processedData.views?.conversationList?.length || 0}个对话，${processedData.chat_history?.length || 0}条消息` :
                `${processedData.chat_history?.length || 0}条消息`
              }
            </div>
          ) : (
            <div className="file-preview-placeholder">点击加载文件内容...</div>
          )}
        </div>
        
        <div className="file-card-stats">
          {isActive && processedData && (
            <>
              <div className="stat-item">
                <span>💬</span>
                <span>{processedData.chat_history?.length || 0}条消息</span>
              </div>
              {processedData.format === 'claude_full_export' && (
                <div className="stat-item">
                  <span>📋</span>
                  <span>{processedData.views?.conversationList?.length || 0}个对话</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  // ==================== 主渲染函数 ====================
  
  const containerClass = viewType === 'file-manager' ? 
    'file-cards-container' : 
    'conversations-grid';

  return (
    <div className={`unified-card-view ${containerClass} ${className}`}>
      {viewType === 'file-manager' ? (
        <div className="file-cards-wrapper">
          {items.map((file, index) => renderFileManagerCard(file, index))}
          
          {/* 添加文件卡片 */}
          {onAddItem && (
            <div className="file-card add-file-card" onClick={onAddItem}>
              <div className="add-file-content">
                <div className="add-file-icon">+</div>
                <div className="add-file-text">添加文件</div>
                <div className="add-file-hint">支持JSON格式</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {items.map(item => renderGridCard(item))}
          
          {/* 添加文件/对话卡片 */}
          {onAddItem && showFileManagement && (
            <div className="conversation-tile add-file-tile" onClick={onAddItem}>
              <div className="add-file-content">
                <div className="add-file-icon">+</div>
                <div className="add-file-text">
                  {items.some(item => item.type === 'file') ? '添加文件' : '添加/替换文件'}
                </div>
                <div className="add-file-hint">支持JSON格式</div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ConversationCardView;