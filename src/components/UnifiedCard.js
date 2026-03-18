// components/UnifiedCard.js
// 统一的卡片组件 - 支持重命名功能
/* global chrome */

import React from 'react';
import PlatformIcon from './PlatformIcon';
import FullExportCardFilter from './FullExportCardFilter';
import { DateTimeUtils, FileUtils, PlatformUtils } from '../utils/fileParser';
import { useI18n } from '../index.js';

/**
 * 通用卡片组件
 * 支持文件卡片和对话卡片两种类型
 */
export const Card = React.memo(({
  item,
  isSelected = false,
  isStarred = false,
  onSelect,
  onStar,
  onRemove,
  className = ''
}) => {
  const { t } = useI18n();

  const handleClick = () => {
    if (onSelect) onSelect(item);
  };

  const handleStar = (e) => {
    e.stopPropagation();
    if (onStar) onStar(item.uuid, item.is_starred || false);
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
    ${item.format ? `format-${item.format}` : ''}
    ${className}
  `.trim();

  return (
    <div className={cardClass} onClick={handleClick}>
      <CardHeader 
        title={item.name || t('card.unnamed')}
        isStarred={isStarred}
        onStar={onStar ? handleStar : null}
        onRemove={onRemove ? handleRemove : null}
        t={t}
      />
      
      <CardMeta item={item} />
      
      <CardPreview content={getPreviewContent(item, t)} />
      
      <CardStats stats={getStatsItems(item, t)} />
      
    </div>
  );
});

Card.displayName = 'Card';

/**
 * 卡片头部组件
 */
const CardHeader = React.memo(({ title, isStarred, onStar, onRemove, t }) => (
  <div className="tile-header">
    <div className="tile-title">
      <span>{title}</span>
    </div>
    
    <div className="tile-actions">
      {onStar && (
        <button
          className={`star-btn ${isStarred ? 'starred' : ''}`}
          onClick={onStar}
          title={isStarred ? t('card.unstar') : t('card.star')}
        >
          {isStarred ? '⭐' : '☆'}
        </button>
      )}
      
      {onRemove && (
        <button
          className="file-close-btn"
          onClick={onRemove}
          title={t('card.close')}
        >
          ×
        </button>
      )}
    </div>
  </div>
));

CardHeader.displayName = 'CardHeader';

/**
 * 卡片元数据组件
 */
const CardMeta = ({ item }) => {
  const { t } = useI18n();
  const metaItems = getMetaItems(item, t);
  
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
function getMetaItems(item, t) {
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
  
  // 项目信息
  if (item.project?.name) {
    items.push({
      icon: '📁',
      text: item.project.name
    });
  }

  // 时间信息
  items.push({
    icon: '📅',
    text: DateTimeUtils.formatDate(item.created_at)
  });
  
  // 文件大小
  if (item.size) {
    items.push({
      icon: '📊',
      text: FileUtils.formatFileSize(item.size)
    });
  }

  // 对话数量（文件类型且有多个对话）
  if (item.type === 'file' && item.conversationCount > 1) {
    items.push({
      icon: '✉️',
      text: `${item.conversationCount}${t('card.conversations')}`
    });
  }
  
  return items.filter(Boolean);
}

/**
 * 获取预览内容
 */
function getPreviewContent(item, t) {
  if (item.type === 'file') {
    if (item.format === 'unknown') {
      return t('card.clickToLoad');
    }
    return item.summary || `${t('card.contains')} ${item.conversationCount || 0} ${t('card.conversations')}${t('card.and')}${item.messageCount || 0} ${t('card.messages')}`;
  }
  return item.summary || t('card.clickToView');
}

/**
 * 获取统计项
 */
function getStatsItems(item, t) {
  const stats = [];
  
  if (item.messageCount > 0) {
    stats.push({ icon: '💬', text: `${item.messageCount}${t('card.messages')}` });
  }
  if (item.hasThinking) {
    stats.push({ icon: '💭', text: t('card.hasThinking') });
  }
  if (item.hasArtifacts) {
    stats.push({ icon: '🔧', text: t('card.hasCode') });
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
  filterProps = null,
  sortField = 'created_at', // 排序字段
  sortOrder = 'desc', // 排序方向
  onSortChange = null, // 排序变更回调
  className = ''
}) => {
  // 将 sort props 合并到 filterProps 中
  const mergedFilterProps = filterProps ? {
    ...filterProps,
    sortField,
    sortOrder,
    onSortChange
  } : null;

  return (
    <div className="card-grid-wrapper">
      {mergedFilterProps && <FullExportCardFilter {...mergedFilterProps} />}
      <div className={`conversations-grid ${className}`}>
        {items.map(item => (
          <Card
            key={item.uuid}
            item={item}
            isSelected={selectedItem === item.uuid || item.isCurrentFile}
            isStarred={starredItems.has(item.uuid) ? starredItems.get(item.uuid) : (item.is_starred || false)}
            onSelect={onItemSelect}
            onStar={onItemStar}
            onRemove={onItemRemove}
          />
        ))}

        {onAddItem && <AddCard onClick={onAddItem} />}
      </div>
    </div>
  );
};

/**
 * 添加卡片组件
 */
const AddCard = ({ onClick }) => {
  const { t } = useI18n();

  return (
    <div className="conversation-tile add-file-tile" onClick={onClick}>
      <div className="add-file-content">
        <div className="add-file-icon">+</div>
        <div className="add-file-text">{t('card.addFile')}</div>
        <div className="add-file-hint">{t('card.supportsJson')}</div>
      </div>
    </div>
  );
};

export default CardGrid;