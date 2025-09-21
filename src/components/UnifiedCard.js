// components/UnifiedCard.js
// 统一的卡片组件 - 修正样式版本

import React from 'react';
import PlatformIcon from './PlatformIcon';
import { DateTimeUtils, FileUtils, PlatformUtils } from '../utils/commonUtils';

/**
 * 通用卡片组件
 * 支持文件卡片和对话卡片两种类型
 */
export const Card = ({ 
  item, 
  isSelected = false,
  isStarred = false,
  onSelect,
  onStar,
  onRemove,
  className = ''
}) => {
  const handleClick = () => {
    if (onSelect) onSelect(item);
  };

  const handleStar = (e) => {
    e.stopPropagation();
    if (onStar) onStar(item.uuid, isStarred);
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    if (onRemove) onRemove(item.fileIndex || item.uuid);
  };

  const isFile = item.type === 'file';
  const cardClass = `
    conversation-tile 
    ${isFile ? 'file-card' : 'conversation-card'} 
    ${isSelected ? 'selected' : ''} 
    ${item.isCurrentFile ? 'current-file' : ''}
    ${className}
  `.trim();

  return (
    <div className={cardClass} onClick={handleClick}>
      <CardHeader 
        title={item.name || '未命名'}
        isStarred={isStarred}
        onStar={!isFile && onStar ? handleStar : null}
        onRemove={onRemove ? handleRemove : null}
      />
      
      <CardMeta item={item} />
      
      <CardPreview content={getPreviewContent(item)} />
      
      <CardStats stats={getStatsItems(item)} />
    </div>
  );
};

/**
 * 卡片头部组件
 */
const CardHeader = ({ title, isStarred, onStar, onRemove }) => (
  <div className="tile-header">
    <div className="tile-title">
      <span>{title}</span>
    </div>
    
    <div className="tile-actions">
      {onStar && (
        <button
          className={`star-btn ${isStarred ? 'starred' : ''}`}
          onClick={onStar}
          title={isStarred ? '取消星标' : '添加星标'}
        >
          {isStarred ? '⭐' : '☆'}
        </button>
      )}
      
      {onRemove && (
        <button
          className="file-close-btn"
          onClick={onRemove}
          title="关闭"
        >
          ×
        </button>
      )}
    </div>
  </div>
);

/**
 * 卡片元数据组件
 */
const CardMeta = ({ item }) => {
  const metaItems = getMetaItems(item);
  
  return (
    <div className="tile-meta">
      {metaItems.map((meta, index) => (
        <MetaRow key={index} icon={meta.icon} text={meta.text} />
      ))}
    </div>
  );
};

/**
 * 元数据行组件
 */
const MetaRow = ({ icon, text }) => (
  <div className="meta-row">
    {typeof icon === 'string' ? <span>{icon}</span> : icon}
    <span>{text}</span>
  </div>
);

/**
 * 卡片预览组件
 */
const CardPreview = ({ content }) => (
  <div className="tile-preview">
    {content}
  </div>
);

/**
 * 卡片统计组件
 */
const CardStats = ({ stats }) => {
  if (!stats || stats.length === 0) return null;
  
  return (
    <div className="tile-stats">
      {stats.map((stat, index) => (
        <div key={index} className="stat-item">
          <span>{stat.icon}</span>
          <span>{stat.text}</span>
        </div>
      ))}
    </div>
  );
};

/**
 * 获取元数据项
 */
function getMetaItems(item) {
  const items = [];
  
  // 平台/模型信息
  items.push({
    icon: <PlatformIcon 
      platform={item.platform || 'claude'} 
      format={item.type === 'file' ? item.format : 'claude'} 
      size={16} 
    />,
    text: item.type === 'file' ? 
      FileUtils.getFileTypeText(item.format, item.platform, item.model) :
      PlatformUtils.getModelDisplay(item.model)
  });
  
  // 时间信息
  items.push({
    icon: '📅',
    text: DateTimeUtils.formatDate(item.created_at)
  });
  
  // 文件大小（仅文件类型）
  if (item.type === 'file' && item.size) {
    items.push({
      icon: '📊',
      text: FileUtils.formatFileSize(item.size)
    });
  }
  
  // 项目信息（仅对话类型）
  if (item.type === 'conversation' && item.project?.name) {
    items.push({
      icon: '📁',
      text: item.project.name
    });
  }
  
  // 对话数量（文件类型且有多个对话）
  if (item.type === 'file' && item.conversationCount > 1) {
    items.push({
      icon: '✉️',
      text: `${item.conversationCount}个对话`
    });
  }
  
  return items.filter(Boolean);
}

/**
 * 获取预览内容
 */
function getPreviewContent(item) {
  if (item.type === 'file') {
    if (item.format === 'unknown') {
      return '点击加载文件内容...';
    }
    return item.summary || `包含 ${item.conversationCount || 0} 个对话和 ${item.messageCount || 0} 条消息`;
  }
  return item.summary || '点击查看对话详情...';
}

/**
 * 获取统计项
 */
function getStatsItems(item) {
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
  
  return stats;
}

/**
 * 卡片网格容器组件
 */
export const CardGrid = ({ 
  items = [],
  selectedItem = null,
  starredItems = new Map(),
  onItemSelect,
  onItemStar,
  onItemRemove,
  onAddItem,
  className = ''
}) => {
  return (
    <div className={`conversations-grid ${className}`}>
      {items.map(item => (
        <Card
          key={item.uuid}
          item={item}
          isSelected={selectedItem === item.uuid || item.isCurrentFile}
          isStarred={starredItems.get(item.uuid) || item.is_starred}
          onSelect={onItemSelect}
          onStar={onItemStar}
          onRemove={onItemRemove}
        />
      ))}
      
      {onAddItem && <AddCard onClick={onAddItem} />}
    </div>
  );
};

/**
 * 添加卡片组件
 */
const AddCard = ({ onClick }) => (
  <div className="conversation-tile add-file-tile" onClick={onClick}>
    <div className="add-file-content">
      <div className="add-file-icon">+</div>
      <div className="add-file-text">添加文件</div>
      <div className="add-file-hint">支持JSON格式</div>
    </div>
  </div>
);

export default CardGrid;