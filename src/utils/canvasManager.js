/**
 * CanvasManager - Multi-canvas whiteboard data (in-memory, non-persistent)
 *
 * Canvas data is stored in memory only — refreshing the page clears all canvases.
 * Use exportAllData / importAllData for project-level save/restore.
 *
 * Keys (internal):
 * - canvases: canvas registry { canvasList, activeCanvasId }
 * - canvas_{id}: per-canvas data { cards, connections, viewport }
 */

const CANVASES_KEY = 'canvases';
const CANVAS_PREFIX = 'canvas_';

// ── In-memory storage (replaces localStorage — clears on refresh) ──
const memoryStore = {};

function memGet(key, defaultValue) {
  if (key in memoryStore) {
    // Deep clone to prevent external mutation
    return JSON.parse(JSON.stringify(memoryStore[key]));
  }
  return typeof defaultValue === 'object' && defaultValue !== null
    ? JSON.parse(JSON.stringify(defaultValue))
    : defaultValue;
}

function memSet(key, value) {
  memoryStore[key] = JSON.parse(JSON.stringify(value));
}

function memRemove(key) {
  delete memoryStore[key];
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const CanvasManager = {
  // ── Canvas CRUD ──

  getRegistry() {
    return memGet(CANVASES_KEY, { canvasList: [], activeCanvasId: null });
  },

  saveRegistry(registry) {
    memSet(CANVASES_KEY, registry);
  },

  getCanvasList() {
    return this.getRegistry().canvasList;
  },

  getActiveCanvasId() {
    const reg = this.getRegistry();
    // If active canvas no longer exists, reset
    if (reg.activeCanvasId && !reg.canvasList.find(c => c.id === reg.activeCanvasId)) {
      reg.activeCanvasId = reg.canvasList.length > 0 ? reg.canvasList[0].id : null;
      this.saveRegistry(reg);
    }
    return reg.activeCanvasId;
  },

  setActiveCanvasId(id) {
    const reg = this.getRegistry();
    reg.activeCanvasId = id;
    this.saveRegistry(reg);
  },

  createCanvas(name) {
    const reg = this.getRegistry();
    const id = 'canvas-' + generateId();
    const now = new Date().toISOString();
    reg.canvasList.push({ id, name, createdAt: now, updatedAt: now });
    reg.activeCanvasId = id;
    this.saveRegistry(reg);

    // Initialize empty canvas data
    this.saveCanvasData(id, {
      cards: {},
      connections: [],
      viewport: { panX: 60, panY: 20, scale: 1.0 },
    });

    return id;
  },

  renameCanvas(id, newName) {
    const reg = this.getRegistry();
    const canvas = reg.canvasList.find(c => c.id === id);
    if (canvas) {
      canvas.name = newName;
      canvas.updatedAt = new Date().toISOString();
      this.saveRegistry(reg);
    }
  },

  deleteCanvas(id) {
    const reg = this.getRegistry();
    reg.canvasList = reg.canvasList.filter(c => c.id !== id);
    // Remove canvas data
    memRemove(CANVAS_PREFIX + id);
    // If deleted canvas was active, switch to first available or null
    if (reg.activeCanvasId === id) {
      reg.activeCanvasId = reg.canvasList.length > 0 ? reg.canvasList[0].id : null;
    }
    this.saveRegistry(reg);
    return reg.activeCanvasId;
  },

  // ── Canvas Data ──

  getCanvasData(canvasId) {
    return memGet(CANVAS_PREFIX + canvasId, {
      cards: {},
      connections: [],
      viewport: { panX: 60, panY: 20, scale: 1.0 },
    });
  },

  saveCanvasData(canvasId, data) {
    memSet(CANVAS_PREFIX + canvasId, data);
    // Update timestamp
    const reg = this.getRegistry();
    const canvas = reg.canvasList.find(c => c.id === canvasId);
    if (canvas) {
      canvas.updatedAt = new Date().toISOString();
      this.saveRegistry(reg);
    }
  },

  // ── Card Operations ──

  addCard(canvasId, cardData) {
    const data = this.getCanvasData(canvasId);
    // Fix 1: Dedup — if a card with same sourceMessageUuid already exists, return it
    if (cardData.sourceMessageUuid) {
      const existing = Object.values(data.cards).find(
        c => c.sourceMessageUuid === cardData.sourceMessageUuid
      );
      if (existing) return existing.id;
    }
    const id = 'card-' + generateId();
    data.cards[id] = { id, ...cardData };
    this.saveCanvasData(canvasId, data);
    return id;
  },

  updateCardPosition(canvasId, cardId, x, y) {
    const data = this.getCanvasData(canvasId);
    if (data.cards[cardId]) {
      data.cards[cardId].x = x;
      data.cards[cardId].y = y;
      this.saveCanvasData(canvasId, data);
    }
  },

  updateCardPositions(canvasId, updates) {
    const data = this.getCanvasData(canvasId);
    for (const { cardId, x, y } of updates) {
      if (data.cards[cardId]) {
        data.cards[cardId].x = x;
        data.cards[cardId].y = y;
      }
    }
    this.saveCanvasData(canvasId, data);
  },

  // Fix 4b: Generic card field update
  updateCard(canvasId, cardId, updates) {
    const data = this.getCanvasData(canvasId);
    if (data.cards[cardId]) {
      data.cards[cardId] = { ...data.cards[cardId], ...updates };
      this.saveCanvasData(canvasId, data);
    }
  },

  removeCard(canvasId, cardId) {
    const data = this.getCanvasData(canvasId);
    delete data.cards[cardId];
    // Remove connections involving this card
    data.connections = data.connections.filter(
      c => c.fromCardId !== cardId && c.toCardId !== cardId
    );
    this.saveCanvasData(canvasId, data);
  },

  // ── Connection Operations ──

  addConnection(canvasId, fromCardId, toCardId, color = '#6BA5E7') {
    const data = this.getCanvasData(canvasId);
    // Avoid duplicate connections
    const exists = data.connections.some(
      c => (c.fromCardId === fromCardId && c.toCardId === toCardId) ||
           (c.fromCardId === toCardId && c.toCardId === fromCardId)
    );
    if (exists) return null;

    const id = 'conn-' + generateId();
    data.connections.push({ id, fromCardId, toCardId, color, label: '' });
    this.saveCanvasData(canvasId, data);
    return id;
  },

  removeConnection(canvasId, connId) {
    const data = this.getCanvasData(canvasId);
    data.connections = data.connections.filter(c => c.id !== connId);
    this.saveCanvasData(canvasId, data);
  },

  // ── Viewport ──

  saveViewport(canvasId, panX, panY, scale) {
    const data = this.getCanvasData(canvasId);
    data.viewport = { panX, panY, scale };
    this.saveCanvasData(canvasId, data);
  },

  getViewport(canvasId) {
    const data = this.getCanvasData(canvasId);
    return data.viewport || { panX: 60, panY: 20, scale: 1.0 };
  },

  // ── Export / Import (for project save/restore) ──

  exportAllData() {
    const registry = this.getRegistry();
    const canvasDataMap = {};
    registry.canvasList.forEach(canvas => {
      canvasDataMap[canvas.id] = this.getCanvasData(canvas.id);
    });
    return { registry, canvasDataMap };
  },

  importAllData(exported) {
    if (!exported || !exported.registry) return;
    memSet(CANVASES_KEY, exported.registry);
    if (exported.canvasDataMap) {
      Object.entries(exported.canvasDataMap).forEach(([canvasId, data]) => {
        memSet(CANVAS_PREFIX + canvasId, data);
      });
    }
  },

  // ── Utility ──

  generateId,

  /**
   * Ensure at least one canvas exists. Returns the active canvas ID.
   */
  ensureDefaultCanvas(defaultName = 'Canvas 1') {
    const reg = this.getRegistry();
    if (reg.canvasList.length === 0) {
      return this.createCanvas(defaultName);
    }
    if (!reg.activeCanvasId) {
      reg.activeCanvasId = reg.canvasList[0].id;
      this.saveRegistry(reg);
    }
    return reg.activeCanvasId;
  },
};

export default CanvasManager;
