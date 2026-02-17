import React, { useMemo, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import PlatformIcon from '../PlatformIcon';
import { useI18n } from '../../index.js';

// Simplified markdown components for card preview
const cardMarkdownComponents = {
  p: ({ children }) => <span>{children} </span>,
  h1: ({ children }) => <strong>{children} </strong>,
  h2: ({ children }) => <strong>{children} </strong>,
  h3: ({ children }) => <strong>{children} </strong>,
  h4: ({ children }) => <strong>{children} </strong>,
  h5: ({ children }) => <strong>{children} </strong>,
  h6: ({ children }) => <strong>{children} </strong>,
  strong: ({ children }) => <strong>{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  code: ({ inline, children }) => inline ?
    <code className="inline-code">{children}</code> :
    <code>{children}</code>,
  pre: ({ children }) => <span>{children}</span>,
  blockquote: ({ children }) => <span style={{ opacity: 0.7, fontStyle: 'italic' }}>" {children} "</span>,
  a: ({ children }) => <span>{children}</span>,
  ul: ({ children }) => <span>{children}</span>,
  ol: ({ children }) => <span>{children}</span>,
  li: ({ children }) => <span>• {children} </span>,
};

// Fix 4a: Size presets — 4 tiers
export const SIZE_PRESETS = {
  default: { width: 280, height: null, previewLen: 80, label: 'S' },
  tall:    { width: 280, height: 320, previewLen: 300, label: 'M' },
  wide:    { width: 480, height: null, previewLen: 200, label: 'W' },
  large:   { width: 480, height: 320, previewLen: 500, label: 'L' },
};
export const PRESET_KEYS = ['default', 'tall', 'wide', 'large'];

const CARD_W = 280;

const WhiteboardCard = ({
  card,
  selected,
  cardSelected,
  searchQuery,
  onMouseDown,
  onToggleSelect,
  onSelect,
  onRemove,
  onResizeStart,
  onSizeChange,
}) => {
  const { t } = useI18n();
  const [hovered, setHovered] = useState(false);

  // Fix 4c: Display text based on size preset
  const displayText = useMemo(() => {
    const presetKey = card.sizePreset || 'default';
    const preset = SIZE_PRESETS[presetKey] || SIZE_PRESETS.default;
    const source = card.fullPreview || card.preview || '';
    if (source.length <= preset.previewLen) return source;
    return source.slice(0, preset.previewLen) + '...';
  }, [card.sizePreset, card.fullPreview, card.preview]);

  // Highlight search terms
  const highlightedContent = useMemo(() => {
    if (!searchQuery) return displayText;
    try {
      const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      const parts = displayText.split(regex);
      return parts.map((part, i) =>
        regex.test(part) ? <mark key={i}>{part}</mark> : part
      );
    } catch {
      return displayText;
    }
  }, [displayText, searchQuery]);

  const handleMouseDown = (e) => {
    if (e.shiftKey) {
      e.stopPropagation();
      onToggleSelect(card.id);
    } else if (e.detail === 2) {
      onSelect(card.id);
    } else {
      onMouseDown(e, card.id);
    }
  };

  const handleRemoveClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    onRemove(card.id);
  };

  // Fix 4c: Apply size preset to rendering
  const preset = SIZE_PRESETS[card.sizePreset || 'default'] || SIZE_PRESETS.default;
  const cardWidth = card.width || preset.width;
  const cardHeight = card.height || preset.height || undefined;
  const accentColor = card.color || 'var(--accent-primary)';

  return (
    <div
      className={[
        'whiteboard-card',
        'canvas-card',
        selected ? 'selected' : '',
        cardSelected ? 'card-selected' : '',
      ].filter(Boolean).join(' ')}
      style={{
        left: card.x,
        top: card.y,
        width: cardWidth,
        height: cardHeight,
        display: cardHeight ? 'flex' : undefined,
        flexDirection: cardHeight ? 'column' : undefined,
        borderColor: selected ? accentColor : undefined,
        boxShadow: selected
            ? `0 0 20px ${accentColor}18, 0 4px 20px rgba(0,0,0,0.3)`
            : undefined,
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Source badge */}
      <div className="canvas-card-source-badge" title={card.sourceFileName}>
        {card.sourceFileName ? card.sourceFileName.replace(/\.(json|jsonl)$/i, '') : 'Unknown'}
      </div>

      {/* Header */}
      <div className="whiteboard-card-header">
        <div className="whiteboard-card-sender">
          <div className={`whiteboard-card-avatar ${card.sender === 'human' ? 'human' : 'assistant'}`}>
            {card.sender === 'human' ? '👤' : (
              <PlatformIcon
                platform={card.platform || 'claude'}
                format={card.format}
                size={16}
                style={{ backgroundColor: 'transparent' }}
              />
            )}
          </div>
          <span className="whiteboard-card-name">{card.senderLabel || (card.sender === 'human' ? 'User' : 'Assistant')}</span>
        </div>
      </div>

      {/* Content — markdown rendered */}
      <div className="whiteboard-card-body" style={cardHeight ? { maxHeight: 'none', flex: 1, overflow: 'auto' } : undefined}>
        {searchQuery ? highlightedContent : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={cardMarkdownComponents}
          >
            {displayText}
          </ReactMarkdown>
        )}
      </div>

      {/* Footer */}
      <div className="whiteboard-card-footer">
        {card.tags && card.tags.map(tag => (
          <span key={tag} className="whiteboard-card-tag">{tag}</span>
        ))}
      </div>

      {/* Hover action buttons: size toggle + remove */}
      {hovered && (
        <>
          <button
            className="canvas-card-size-btn"
            onClick={(e) => {
              e.stopPropagation();
              const cur = card.sizePreset || 'default';
              const idx = PRESET_KEYS.indexOf(cur);
              const next = PRESET_KEYS[(idx + 1) % PRESET_KEYS.length];
              if (onSizeChange) onSizeChange(card.id, next);
            }}
            title={`Size: ${preset.label}`}
          >
            {preset.label}
          </button>
          <button
            className="canvas-card-remove-btn"
            onClick={handleRemoveClick}
            title={t('whiteboard.removeCard') || 'Remove'}
          >
            ✕
          </button>
        </>
      )}

      {/* Resize handles (right edge, bottom edge, bottom-right corner) */}
      {hovered && (
        <>
          <div
            className="canvas-card-resize-handle right"
            onMouseDown={(e) => { e.stopPropagation(); onResizeStart && onResizeStart(e, card.id, 'right'); }}
          />
          <div
            className="canvas-card-resize-handle bottom"
            onMouseDown={(e) => { e.stopPropagation(); onResizeStart && onResizeStart(e, card.id, 'bottom'); }}
          />
          <div
            className="canvas-card-resize-handle corner"
            onMouseDown={(e) => { e.stopPropagation(); onResizeStart && onResizeStart(e, card.id, 'corner'); }}
          />
        </>
      )}

      {/* Selection checkmark */}
      {selected && (
        <div className="whiteboard-card-check" style={{ background: accentColor }}>
          ✓
        </div>
      )}
    </div>
  );
};

export default React.memo(WhiteboardCard, (prev, next) => {
  return prev.card === next.card &&
    prev.selected === next.selected &&
    prev.cardSelected === next.cardSelected &&
    prev.searchQuery === next.searchQuery;
});
