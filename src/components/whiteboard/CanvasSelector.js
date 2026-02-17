import React, { useState, useRef, useEffect } from 'react';
import { useI18n } from '../../index.js';

const CanvasSelector = ({
  canvasList,
  activeCanvasId,
  onSwitch,
  onCreate,
  onRename,
  onDelete,
}) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const activeCanvas = canvasList.find(c => c.id === activeCanvasId);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
        setRenamingId(null);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [open]);

  // Focus rename input
  useEffect(() => {
    if (renamingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renamingId]);

  const handleCreate = () => {
    const num = canvasList.length + 1;
    const name = (t('whiteboard.canvas.defaultName') || 'Canvas {{num}}').replace('{{num}}', num);
    onCreate(name);
    setOpen(false);
  };

  const handleRenameSubmit = (id) => {
    if (renameValue.trim()) {
      onRename(id, renameValue.trim());
    }
    setRenamingId(null);
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (canvasList.length <= 1) return;
    if (window.confirm(t('whiteboard.deleteCanvasConfirm') || 'Delete this canvas?')) {
      onDelete(id);
    }
  };

  return (
    <div className="canvas-selector" ref={dropdownRef}>
      <button
        className="canvas-selector-trigger"
        onClick={() => setOpen(!open)}
      >
        <span className="canvas-selector-name">{activeCanvas?.name || 'Canvas'}</span>
        <span className="canvas-selector-arrow">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="canvas-selector-dropdown">
          {canvasList.map(canvas => (
            <div
              key={canvas.id}
              className={`canvas-selector-item ${canvas.id === activeCanvasId ? 'active' : ''}`}
              onClick={() => {
                if (renamingId === canvas.id) return;
                onSwitch(canvas.id);
                setOpen(false);
              }}
            >
              {renamingId === canvas.id ? (
                <input
                  ref={inputRef}
                  className="canvas-selector-rename-input"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameSubmit(canvas.id);
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  onBlur={() => handleRenameSubmit(canvas.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <span
                    className="canvas-selector-item-name"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setRenamingId(canvas.id);
                      setRenameValue(canvas.name);
                    }}
                  >
                    {canvas.name}
                  </span>
                  <div className="canvas-selector-item-actions">
                    <button
                      className="canvas-selector-item-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenamingId(canvas.id);
                        setRenameValue(canvas.name);
                      }}
                      title={t('whiteboard.renameCanvas') || 'Rename'}
                    >
                      ✏️
                    </button>
                    {canvasList.length > 1 && (
                      <button
                        className="canvas-selector-item-btn delete"
                        onClick={(e) => handleDelete(e, canvas.id)}
                        title={t('whiteboard.deleteCanvas') || 'Delete'}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
          <div className="canvas-selector-create" onClick={handleCreate}>
            + {t('whiteboard.newCanvas') || 'New Canvas'}
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(CanvasSelector);
