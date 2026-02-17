// components/WhiteboardView.js
// Free-form canvas whiteboard for visualizing messages from multiple conversations
import React, { useState, useRef, useCallback, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import MessageDetail from './MessageDetail';
import { useI18n } from '../index.js';
import { useContextBridge } from '../ai-chat';
import StorageManager from '../utils/storageManager';
import CanvasManager from '../utils/canvasManager';
import CanvasConnections, { getClosestAnchors } from './whiteboard/CanvasConnections';
import WhiteboardCard, { SIZE_PRESETS } from './whiteboard/WhiteboardCard';
import WhiteboardMiniMap from './whiteboard/WhiteboardMiniMap';

import CardPickerPanel from './whiteboard/CardPickerPanel';
import { extractChatData, detectBranches } from '../utils/fileParser';

// Parse JSONL format (shared with CardPickerPanel)
function parseJSONL(text) {
  const lines = text.split('\n').filter(l => l.trim());
  const objects = lines.map(l => JSON.parse(l));
  return objects.length === 1 ? objects[0] : objects;
}

const CARD_W = 280;
const CARD_H = 160;

const WhiteboardView = forwardRef(({
  marks,
  markActions,
  searchQuery = '',
  onHideNavbar = null,
  files = [],
  fileMetadata = {},
  currentFileIndex = 0,
  processedData = null,
  format,
  canvasVersion = 0,
  onCanvasStateChange = null,
}, ref) => {
  const { t } = useI18n();
  const { addMessagesToContext } = useContextBridge();

  // ── Canvas state ──
  const [activeCanvasId, setActiveCanvasId] = useState(() => CanvasManager.ensureDefaultCanvas(t('whiteboard.canvas.defaultName') || 'Canvas 1'));
  const [canvasData, setCanvasData] = useState(() => CanvasManager.getCanvasData(CanvasManager.getActiveCanvasId() || ''));
  const [canvasList, setCanvasList] = useState(() => CanvasManager.getCanvasList());

  // ── Viewport state ──
  const [pan, setPan] = useState(() => {
    const vp = canvasData.viewport || {};
    return { x: vp.panX || 60, y: vp.panY || 20 };
  });
  const [scale, setScale] = useState(() => {
    const vp = canvasData.viewport || {};
    return vp.scale || 1.0;
  });

  // ── Interaction state ──
  const [dragging, setDragging] = useState(null);
  const [panning, setPanning] = useState(false);
  const [selectedCards, setSelectedCards] = useState(new Set());
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState(null);
  // panelMode: null | 'picker' | 'detail' — controls the flip panel
  const [panelMode, setPanelMode] = useState(null);
  const [activeTab, setActiveTab] = useState('content');
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  // Desktop detection
  const [isDesktop, setIsDesktop] = useState(() => {
    const mode = StorageManager.get('device-mode', 'auto');
    if (mode === 'mobile') return false;
    if (mode === 'desktop') return true;
    return window.innerWidth >= 1024;
  });

  // Refs
  const dragRef = useRef(null);
  const panRef = useRef(null);
  const containerRef = useRef(null);
  const rafRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  // Parsed file cache for CardPickerPanel
  const [parsedFilesCache, setParsedFilesCache] = useState({});

  // Resize state
  const [resizing, setResizing] = useState(null); // { cardId, handle, startX, startY, origW, origH }
  const resizeRef = useRef(null);

  // Fix 3: Detail loading state for auto-loading source files
  const [detailLoading, setDetailLoading] = useState(false);

  // ── Effects ──

  useEffect(() => {
    const handleResize = () => {
      const mode = StorageManager.get('device-mode', 'auto');
      if (mode === 'auto') setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setViewportSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (onHideNavbar) onHideNavbar(false);
  }, [onHideNavbar]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // Fix 2d: Reload canvas data after project import
  useEffect(() => {
    if (canvasVersion > 0) {
      const id = CanvasManager.ensureDefaultCanvas(t('whiteboard.canvas.defaultName') || 'Canvas 1');
      setActiveCanvasId(id);
      setCanvasData(CanvasManager.getCanvasData(id));
      setCanvasList(CanvasManager.getCanvasList());
      const vp = CanvasManager.getViewport(id);
      setPan({ x: vp.panX || 60, y: vp.panY || 20 });
      setScale(vp.scale || 1.0);
    }
  }, [canvasVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Debounced save ──
  const debouncedSave = useCallback((canvasId, data) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      CanvasManager.saveCanvasData(canvasId, data);
    }, 300);
  }, []);

  // Save viewport on change
  useEffect(() => {
    if (activeCanvasId) {
      const data = { ...canvasData, viewport: { panX: pan.x, panY: pan.y, scale } };
      debouncedSave(activeCanvasId, data);
    }
  }, [pan, scale]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Canvas switching ──
  const switchCanvas = useCallback((canvasId) => {
    // Save current canvas viewport
    if (activeCanvasId) {
      const currentData = { ...canvasData, viewport: { panX: pan.x, panY: pan.y, scale } };
      CanvasManager.saveCanvasData(activeCanvasId, currentData);
    }
    // Load new canvas
    CanvasManager.setActiveCanvasId(canvasId);
    const newData = CanvasManager.getCanvasData(canvasId);
    setActiveCanvasId(canvasId);
    setCanvasData(newData);
    setPan({ x: newData.viewport?.panX || 60, y: newData.viewport?.panY || 20 });
    setScale(newData.viewport?.scale || 1.0);
    setSelectedCardId(null);
    setSelectedCards(new Set());
    setSelectedConnection(null);
  }, [activeCanvasId, canvasData, pan, scale]);

  const createCanvas = useCallback((name) => {
    const id = CanvasManager.createCanvas(name);
    setCanvasList(CanvasManager.getCanvasList());
    switchCanvas(id);
    return id;
  }, [switchCanvas]);

  const renameCanvas = useCallback((id, name) => {
    CanvasManager.renameCanvas(id, name);
    setCanvasList(CanvasManager.getCanvasList());
  }, []);

  const deleteCanvas = useCallback((id) => {
    const newActiveId = CanvasManager.deleteCanvas(id);
    setCanvasList(CanvasManager.getCanvasList());
    if (newActiveId) {
      switchCanvas(newActiveId);
    } else {
      // All canvases deleted, create a new default
      const newId = CanvasManager.createCanvas(t('whiteboard.canvas.defaultName') || 'Canvas 1');
      setCanvasList(CanvasManager.getCanvasList());
      switchCanvas(newId);
    }
  }, [switchCanvas, t]);

  // ── Expose actions to parent (App.js navbar) ──
  useImperativeHandle(ref, () => ({
    togglePicker: () => {
      if (panelMode === 'picker') {
        setPanelMode(null);
        setShowPicker(false);
      } else {
        setPanelMode('picker');
        setShowPicker(true);
      }
    },
    resetView: () => {
      setPan({ x: 60, y: 20 });
      setScale(1.0);
    },
    switchCanvas,
    createCanvas,
    renameCanvas,
    deleteCanvas,
  }), [panelMode, switchCanvas, createCanvas, renameCanvas, deleteCanvas]);

  // Notify parent of canvas state changes
  useEffect(() => {
    onCanvasStateChange?.({ canvasList, activeCanvasId });
  }, [canvasList, activeCanvasId, onCanvasStateChange]);

  // ── Card positions ──
  const cardPositions = useMemo(() => {
    const result = {};
    Object.values(canvasData.cards || {}).forEach(card => {
      result[card.id] = { x: card.x, y: card.y };
    });
    return result;
  }, [canvasData.cards]);

  // ── Viewport culling ──
  const viewportBounds = useMemo(() => {
    if (!viewportSize.width) return null;
    const PADDING = 400;
    return {
      left: (-pan.x / scale) - PADDING,
      top: (-pan.y / scale) - PADDING,
      right: ((-pan.x + viewportSize.width) / scale) + PADDING,
      bottom: ((-pan.y + viewportSize.height) / scale) + PADDING,
    };
  }, [pan, scale, viewportSize]);

  const visibleCards = useMemo(() => {
    const cards = Object.values(canvasData.cards || {});
    if (!viewportBounds) return cards;
    return cards.filter(card => {
      const cw = card.width || CARD_W;
      const ch = card.height || CARD_H;
      return card.x + cw >= viewportBounds.left &&
             card.x <= viewportBounds.right &&
             card.y + ch >= viewportBounds.top &&
             card.y <= viewportBounds.bottom;
    });
  }, [canvasData.cards, viewportBounds]);

  const visibleConnections = useMemo(() => {
    if (!viewportBounds) return canvasData.connections || [];
    const visibleSet = new Set(visibleCards.map(c => c.id));
    return (canvasData.connections || []).filter(conn =>
      visibleSet.has(conn.fromCardId) || visibleSet.has(conn.toCardId)
    );
  }, [canvasData.connections, visibleCards, viewportBounds]);

  // ── Interaction handlers ──

  // ── Resize handling ──
  const handleResizeStart = useCallback((e, cardId, handle) => {
    e.stopPropagation();
    const card = canvasData.cards[cardId];
    if (!card) return;
    setResizing(cardId);
    resizeRef.current = {
      cardId,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      origW: card.width || CARD_W,
      origH: card.height || CARD_H,
    };
  }, [canvasData.cards]);

  const handleCardDrag = useCallback((e, cardId) => {
    e.stopPropagation();
    setDragging(cardId);
    const card = canvasData.cards[cardId];
    if (card) {
      dragRef.current = { mx: e.clientX, my: e.clientY, ox: card.x, oy: card.y };
    }
  }, [canvasData.cards]);

  const handlePanStart = useCallback((e) => {
    if (e.target === containerRef.current || e.target.dataset?.canvas) {
      setPanning(true);
      panRef.current = { mx: e.clientX, my: e.clientY, ox: pan.x, oy: pan.y };
      // Click on empty canvas: deselect connection
      if (selectedConnection) {
        setSelectedConnection(null);
      }
    }
  }, [pan, selectedConnection]);

  const handleMove = useCallback((e) => {
    // Resize handling
    if (resizing !== null && resizeRef.current) {
      const clientX = e.clientX;
      const clientY = e.clientY;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        if (!resizeRef.current) return;
        const r = resizeRef.current;
        const dx = (clientX - r.startX) / scale;
        const dy = (clientY - r.startY) / scale;
        let newW = r.origW;
        let newH = r.origH;
        if (r.handle === 'right' || r.handle === 'corner') {
          newW = Math.max(180, r.origW + dx);
        }
        if (r.handle === 'bottom' || r.handle === 'corner') {
          newH = Math.max(80, r.origH + dy);
        }
        setCanvasData(prev => {
          const updatedCards = { ...prev.cards };
          const card = updatedCards[r.cardId];
          if (!card) return prev;

          const oldW = card.width || CARD_W;
          const oldH = card.height || CARD_H;
          const deltaW = newW - oldW;
          const deltaH = newH - oldH;
          updatedCards[r.cardId] = { ...card, width: newW, height: newH, sizePreset: null };

          // Push neighboring cards away
          if (deltaW > 0 || deltaH > 0) {
            const cardRight = card.x + newW;
            const cardBottom = card.y + newH;
            Object.keys(updatedCards).forEach(otherId => {
              if (otherId === r.cardId) return;
              const other = updatedCards[otherId];
              const otherW = other.width || CARD_W;
              const otherH = other.height || CARD_H;
              // Push right if overlapping horizontally
              if (deltaW > 0 && other.x < cardRight && other.x + otherW > card.x &&
                  other.y < cardBottom && other.y + otherH > card.y) {
                if (other.x >= card.x) {
                  updatedCards[otherId] = { ...other, x: other.x + deltaW };
                }
              }
              // Push down if overlapping vertically
              if (deltaH > 0 && other.y < cardBottom && other.y + otherH > card.y &&
                  other.x < cardRight && other.x + otherW > card.x) {
                if (other.y >= card.y) {
                  updatedCards[otherId] = { ...other, y: other.y + deltaH };
                }
              }
            });
          }

          return { ...prev, cards: updatedCards };
        });
      });
      return;
    }

    if (dragging !== null && dragRef.current) {
      const clientX = e.clientX;
      const clientY = e.clientY;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        if (!dragRef.current) return;
        const dx = (clientX - dragRef.current.mx) / scale;
        const dy = (clientY - dragRef.current.my) / scale;
        const newX = dragRef.current.ox + dx;
        const newY = dragRef.current.oy + dy;
        setCanvasData(prev => ({
          ...prev,
          cards: {
            ...prev.cards,
            [dragging]: { ...prev.cards[dragging], x: newX, y: newY },
          },
        }));
      });
    } else if (panning && panRef.current) {
      const clientX = e.clientX;
      const clientY = e.clientY;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        if (!panRef.current) return;
        setPan({
          x: panRef.current.ox + clientX - panRef.current.mx,
          y: panRef.current.oy + clientY - panRef.current.my,
        });
      });
    }
  }, [dragging, panning, resizing, scale]);

  // Auto-connect: when a card is dropped overlapping ~40% with another, create a connection
  const handleUp = useCallback(() => {
    if (dragging !== null && activeCanvasId) {
      const draggedCard = canvasData.cards[dragging];
      if (draggedCard) {
        const dw = draggedCard.width || CARD_W;
        const dh = draggedCard.height || CARD_H;
        const draggedArea = dw * dh;
        const existingConns = canvasData.connections || [];
        const newConns = [];

        Object.values(canvasData.cards).forEach(other => {
          if (other.id === dragging) return;
          const ow = other.width || CARD_W;
          const oh = other.height || CARD_H;
          // Calculate overlap area
          const overlapX = Math.max(0, Math.min(draggedCard.x + dw, other.x + ow) - Math.max(draggedCard.x, other.x));
          const overlapY = Math.max(0, Math.min(draggedCard.y + dh, other.y + oh) - Math.max(draggedCard.y, other.y));
          const overlapArea = overlapX * overlapY;
          const smallerArea = Math.min(draggedArea, ow * oh);

          if (overlapArea / smallerArea >= 0.4) {
            // Check if connection already exists
            const alreadyConnected = existingConns.some(
              c => (c.fromCardId === dragging && c.toCardId === other.id) ||
                   (c.fromCardId === other.id && c.toCardId === dragging)
            );
            if (!alreadyConnected) {
              newConns.push({ fromCardId: dragging, toCardId: other.id });
            }
          }
        });
        if (newConns.length > 0) {
          // First save current positions to storage, then add connections
          CanvasManager.saveCanvasData(activeCanvasId, canvasData);
          newConns.forEach(c => CanvasManager.addConnection(activeCanvasId, c.fromCardId, c.toCardId));
          // Reload with both up-to-date positions and new connections
          setCanvasData(CanvasManager.getCanvasData(activeCanvasId));
        } else {
          debouncedSave(activeCanvasId, canvasData);
        }
      } else {
        debouncedSave(activeCanvasId, canvasData);
      }
    }
    if (resizing !== null && activeCanvasId) {
      debouncedSave(activeCanvasId, canvasData);
    }
    setDragging(null);
    setResizing(null);
    setPanning(false);
    dragRef.current = null;
    panRef.current = null;
    resizeRef.current = null;
  }, [dragging, resizing, activeCanvasId, canvasData, debouncedSave]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setScale(s => Math.max(0.25, Math.min(2, s + (e.deltaY > 0 ? -0.05 : 0.05))));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (el) el.addEventListener('wheel', handleWheel, { passive: false });
    return () => { if (el) el.removeEventListener('wheel', handleWheel); };
  }, [handleWheel]);

  // ── Connection handling ──

  const handleDeleteConnection = useCallback(() => {
    if (selectedConnection && activeCanvasId) {
      CanvasManager.removeConnection(activeCanvasId, selectedConnection);
      setCanvasData(CanvasManager.getCanvasData(activeCanvasId));
      setSelectedConnection(null);
    }
  }, [selectedConnection, activeCanvasId]);

  // ── Card actions ──

  const handleAddCard = useCallback((cardData) => {
    if (!activeCanvasId) return;
    const id = CanvasManager.addCard(activeCanvasId, cardData);
    setCanvasData(CanvasManager.getCanvasData(activeCanvasId));
    return id;
  }, [activeCanvasId]);

  // Batch add cards with tree layout + auto connections
  const handleAddCardsWithLayout = useCallback((cardsToAdd, edgesToAdd) => {
    if (!activeCanvasId || cardsToAdd.length === 0) return;
    const data = CanvasManager.getCanvasData(activeCanvasId);
    // Fix 1b: Build existing UUID set and skip duplicates
    const existingUuids = new Set(
      Object.values(data.cards).map(c => c.sourceMessageUuid).filter(Boolean)
    );
    // Add all cards, tracking uuid → cardId mapping
    const uuidToCardId = {};
    cardsToAdd.forEach(cardData => {
      if (existingUuids.has(cardData.sourceMessageUuid)) return; // Skip duplicate
      const id = 'card-' + CanvasManager.generateId();
      data.cards[id] = { id, ...cardData };
      uuidToCardId[cardData.sourceMessageUuid] = id;
      existingUuids.add(cardData.sourceMessageUuid);
    });
    // Add auto connections from edges
    if (edgesToAdd && edgesToAdd.length > 0) {
      edgesToAdd.forEach(edge => {
        const fromCardId = uuidToCardId[edge.fromUuid];
        const toCardId = uuidToCardId[edge.toUuid];
        if (fromCardId && toCardId) {
          // Avoid duplicates
          const exists = data.connections.some(
            c => (c.fromCardId === fromCardId && c.toCardId === toCardId) ||
                 (c.fromCardId === toCardId && c.toCardId === fromCardId)
          );
          if (!exists) {
            data.connections.push({
              id: 'conn-' + CanvasManager.generateId(),
              fromCardId,
              toCardId,
              color: edge.color || '#6BA5E7',
              label: '',
            });
          }
        }
      });
    }
    CanvasManager.saveCanvasData(activeCanvasId, data);
    setCanvasData({ ...data });
  }, [activeCanvasId]);

  const handleRemoveCard = useCallback((cardId) => {
    if (!activeCanvasId) return;
    CanvasManager.removeCard(activeCanvasId, cardId);
    setCanvasData(CanvasManager.getCanvasData(activeCanvasId));
    if (selectedCardId === cardId) setSelectedCardId(null);
    setSelectedCards(prev => {
      const next = new Set(prev);
      next.delete(cardId);
      return next;
    });
  }, [activeCanvasId, selectedCardId]);

  const toggleSelect = useCallback((cardId) => {
    setSelectedCards(prev => {
      const next = new Set(prev);
      next.has(cardId) ? next.delete(cardId) : next.add(cardId);
      return next;
    });
  }, []);

  const handleCardSelect = useCallback((cardId) => {
    setSelectedCardId(cardId);
    setActiveTab('content');
    setPanelMode('detail');
  }, []);

  // Fix 4d: Size preset change handler — expand from center
  const handleSizeChange = useCallback((cardId, newPreset) => {
    if (!activeCanvasId) return;
    const preset = SIZE_PRESETS[newPreset] || SIZE_PRESETS.default;
    setCanvasData(prev => {
      const card = prev.cards[cardId];
      if (!card) return prev;
      const oldW = card.width || CARD_W;
      const oldH = card.height || CARD_H;
      const newW = preset.width || CARD_W;
      const newH = preset.height || CARD_H;
      const dx = (oldW - newW) / 2;
      const dy = (oldH - newH) / 2;
      const updated = {
        ...card,
        sizePreset: newPreset,
        width: preset.width,
        height: preset.height,
        x: card.x + dx,
        y: card.y + dy,
      };
      const newData = { ...prev, cards: { ...prev.cards, [cardId]: updated } };
      debouncedSave(activeCanvasId, newData);
      return newData;
    });
  }, [activeCanvasId, debouncedSave]);

  // Reset view
  const resetView = useCallback(() => {
    setPan({ x: 60, y: 20 });
    setScale(1.0);
  }, []);

  // Jump to position (from minimap)
  const jumpTo = useCallback((cx, cy) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPan({
      x: -(cx * scale - rect.width / 2),
      y: -(cy * scale - rect.height / 2),
    });
  }, [scale]);

  // Get source data for detail panel (may be from a different file)
  const detailSourceData = useMemo(() => {
    if (!selectedCardId) return null;
    const card = canvasData.cards[selectedCardId];
    if (!card) return null;
    // First: try current processedData
    if (processedData) {
      const history = processedData.chat_history || [];
      const msg = history.find(m => m.uuid === card.sourceMessageUuid);
      if (msg) return { data: processedData, message: msg };
    }
    // Second: try parsedFilesCache
    if (card.sourceFileName && parsedFilesCache[card.sourceFileName]) {
      const cachedData = parsedFilesCache[card.sourceFileName];
      const history = cachedData.chat_history || [];
      const msg = history.find(m => m.uuid === card.sourceMessageUuid);
      if (msg) return { data: cachedData, message: msg };
    }
    return null;
  }, [selectedCardId, processedData, canvasData.cards, parsedFilesCache]);

  // Fix 3a: Auto-load source file when detail data is missing
  useEffect(() => {
    if (!selectedCardId || detailSourceData) return;
    const card = canvasData.cards[selectedCardId];
    if (!card?.sourceFileName) return;
    if (parsedFilesCache[card.sourceFileName]) return; // Already cached but message not found

    const fileIdx = files.findIndex(f => f.name === card.sourceFileName);
    if (fileIdx === -1) return;

    setDetailLoading(true);
    const file = files[fileIdx];
    (async () => {
      try {
        if (file._mergedProcessedData) {
          setParsedFilesCache(prev => ({ ...prev, [file.name]: file._mergedProcessedData }));
          return;
        }
        const text = await file.text();
        const isJSONL = file.name.endsWith('.jsonl') || (text.includes('\n{') && !text.trim().startsWith('['));
        const jsonData = isJSONL ? parseJSONL(text) : JSON.parse(text);
        let data = extractChatData(jsonData, file.name);
        data = detectBranches(data);
        setParsedFilesCache(prev => ({ ...prev, [file.name]: data }));
      } catch (err) {
        console.warn('[WhiteboardView] Auto-load source file failed:', err);
      } finally {
        setDetailLoading(false);
      }
    })();
  }, [selectedCardId, detailSourceData, canvasData.cards, files, parsedFilesCache]); // eslint-disable-line react-hooks/exhaustive-deps

  const detailMessage = detailSourceData?.message ?? null;
  const detailProcessedData = detailSourceData?.data ?? processedData;
  const detailMessageIndex = detailMessage?.index ?? null;

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (selectedConnection) {
          setSelectedConnection(null);
        } else if (panelMode) {
          setPanelMode(null);
          setShowPicker(false);
          setSelectedCardId(null);
        }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedConnection && !showPicker) {
          e.preventDefault();
          handleDeleteConnection();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedConnection, showPicker, handleDeleteConnection, panelMode]);

  // Mobile fallback
  if (!isDesktop) {
    return (
      <div className="whiteboard-mobile-warning">
        <div className="whiteboard-mobile-warning-icon">🖥️</div>
        <h3>{t('whiteboard.mobileWarning')}</h3>
      </div>
    );
  }

  const allCards = Object.values(canvasData.cards || {});
  const hasCards = allCards.length > 0;

  return (
    <div className="whiteboard-view">
      {/* Canvas Area */}
      <div className="whiteboard-canvas-area">
        {/* Canvas */}
        <div
          ref={containerRef}
          data-canvas="true"
          className={`whiteboard-canvas-wrapper ${panning ? 'panning' : ''}`}
          onMouseDown={handlePanStart}
          onMouseMove={handleMove}
          onMouseUp={handleUp}
          onMouseLeave={handleUp}
        >
          {/* Dot grid background */}
          <div
            className="whiteboard-dot-grid"
            style={{
              backgroundSize: `${28 * scale}px ${28 * scale}px`,
              backgroundPosition: `${pan.x}px ${pan.y}px`,
            }}
          />

          {/* Transform layer */}
          <div
            className="whiteboard-transform-layer"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            }}
          >
            {/* Connection lines */}
            <CanvasConnections
              connections={visibleConnections}
              cards={canvasData.cards || {}}
              selectedConnection={selectedConnection}
              onSelectConnection={setSelectedConnection}
            />

            {/* Cards */}
            {visibleCards.map(card => (
              <WhiteboardCard
                key={card.id}
                card={card}
                selected={selectedCards.has(card.id)}
                cardSelected={selectedCardId === card.id}
                searchQuery={searchQuery}
                onMouseDown={handleCardDrag}
                onToggleSelect={toggleSelect}
                onSelect={handleCardSelect}
                onRemove={handleRemoveCard}
                onResizeStart={handleResizeStart}
                onSizeChange={handleSizeChange}
              />
            ))}
          </div>

          {/* Empty state */}
          {!hasCards && (
            <div className="whiteboard-empty-state" data-canvas="true">
              <div className="whiteboard-empty-icon">📋</div>
              <p>{t('whiteboard.canvas.empty')}</p>
              <button className="whiteboard-empty-btn" onClick={() => { setPanelMode('picker'); setShowPicker(true); }}>
                {t('whiteboard.addCard')}
              </button>
            </div>
          )}
        </div>

        {/* Selected connection delete — positioned near the line midpoint */}
        {selectedConnection && (() => {
          const conn = (canvasData.connections || []).find(c => c.id === selectedConnection);
          if (!conn) return null;
          const cardA = (canvasData.cards || {})[conn.fromCardId];
          const cardB = (canvasData.cards || {})[conn.toCardId];
          if (!cardA || !cardB) return null;
          const { from: anchorA, to: anchorB } = getClosestAnchors(cardA, cardB);
          if (!anchorA || !anchorB) return null;
          const midX = (anchorA.x + anchorB.x) / 2;
          const midY = (anchorA.y + anchorB.y) / 2;
          // Convert canvas coords to screen coords
          const screenX = midX * scale + pan.x;
          const screenY = midY * scale + pan.y + 48; // 48px toolbar offset
          return (
            <div
              className="whiteboard-connection-actions"
              style={{ position: 'absolute', left: screenX, top: screenY, transform: 'translate(-50%, -50%)' }}
            >
              <button onClick={handleDeleteConnection}>
                ✕
              </button>
            </div>
          );
        })()}

        {/* Hints */}
        {hasCards && (
          <div className="whiteboard-hints">
            <span><b>{t('whiteboard.hints.drag')}</b> {t('whiteboard.hints.dragDesc')}</span>
            <span><b>Shift+{t('whiteboard.hints.click')}</b> {t('whiteboard.hints.select')}</span>
            <span><b>{t('whiteboard.hints.dblclick')}</b> {t('whiteboard.hints.detail')}</span>
            <span><b>{t('whiteboard.hints.wheel')}</b> {t('whiteboard.hints.zoom')}</span>
          </div>
        )}

        {/* MiniMap */}
        {!panelMode && hasCards && (
          <WhiteboardMiniMap
            positions={cardPositions}
            cards={canvasData.cards || {}}
            pan={pan}
            scale={scale}
            viewW={containerRef.current?.clientWidth || window.innerWidth}
            viewH={containerRef.current?.clientHeight || window.innerHeight}
            onJump={jumpTo}
          />
        )}
      </div>

      {/* Flip Panel — picker and detail share the same slot with flip animation */}
      {panelMode && (
        <div className={`whiteboard-flip-panel ${panelMode === 'detail' ? 'flipped' : ''}`}>
          <div className="whiteboard-flip-inner">
            {/* Front face: Card Picker */}
            <div className="whiteboard-flip-face whiteboard-flip-front">
              <CardPickerPanel
                files={files}
                fileMetadata={fileMetadata}
                currentFileIndex={currentFileIndex}
                processedData={processedData}
                parsedFilesCache={parsedFilesCache}
                onParsedFilesUpdate={setParsedFilesCache}
                canvasCards={canvasData.cards || {}}
                onAddCard={handleAddCard}
                onAddCardsWithLayout={handleAddCardsWithLayout}
                onClose={() => { setPanelMode(null); setShowPicker(false); }}
                pan={pan}
                scale={scale}
                viewportWidth={viewportSize.width}
                viewportHeight={viewportSize.height}
              />
            </div>
            {/* Back face: Detail Panel */}
            <div className="whiteboard-flip-face whiteboard-flip-back">
              <div className="whiteboard-detail-panel">
                <div className="message-detail-container">
                  <div className="whiteboard-detail-header">
                    <span className="whiteboard-detail-source">
                      {selectedCardId && canvasData.cards[selectedCardId]?.sourceFileName || ''}
                    </span>
                    <button className="whiteboard-detail-close" onClick={() => { setSelectedCardId(null); setPanelMode(null); }}>✕</button>
                  </div>
                  <div className="detail-content">
                    {detailLoading ? (
                      <div className="whiteboard-detail-loading" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                        Loading...
                      </div>
                    ) : detailMessage ? (
                      <MessageDetail
                        processedData={detailProcessedData}
                        selectedMessageIndex={detailMessageIndex}
                        activeTab={activeTab}
                        searchQuery={searchQuery}
                        format={detailProcessedData?.format || format}
                        onTabChange={setActiveTab}
                        showTabs={true}
                      />
                    ) : (
                      <div className="whiteboard-detail-unavailable" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                        {selectedCardId && (canvasData.cards[selectedCardId]?.fullPreview || canvasData.cards[selectedCardId]?.preview) || '消息不可用'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default WhiteboardView;
