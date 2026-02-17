/**
 * Whiteboard Layout Engine
 * Tree layout algorithm for positioning conversation nodes on a 2D canvas.
 * Extracted and parameterized from whiteboard-tree.jsx prototype.
 */

// Layout constants
export const LAYOUT_CONFIG = {
  CARD_W: 280,
  CARD_H: 160,
  H_GAP: 40,
  V_GAP: 50,
};

// Branch color palette
export const BRANCH_COLORS = ["#E8913A", "#6BA5E7", "#8BC78B", "#D47DB6", "#E0D85A"];

/**
 * Convert messages array to whiteboard nodes format.
 * Maps from the app's message format to the simplified node format
 * expected by the layout engine.
 *
 * @param {Array} messages - Messages from the file parser
 * @param {Object} marks - Current marks state { completed: {}, important: {}, deleted: {} }
 * @param {Function} formatTime - DateTimeUtils.formatTime
 * @param {Function} getPreview - TextUtils.getPreview
 * @returns {Array} Whiteboard nodes
 */
export function convertMessagesToNodes(messages, marks = {}, formatTime, getPreview) {
  if (!messages || messages.length === 0) return [];

  // Build a map from uuid → index for parent lookup
  const uuidToIndex = new Map();
  messages.forEach((msg) => {
    uuidToIndex.set(msg.uuid, msg.index);
  });

  return messages.map((msg) => {
    // Determine parent index
    let parentIndex = null;
    if (msg.parent_uuid) {
      parentIndex = uuidToIndex.get(msg.parent_uuid) ?? null;
    }

    // Build tags from marks
    const tags = [];
    if (marks.completed && marks.completed[msg.index]) tags.push('completed');
    if (marks.important && marks.important[msg.index]) tags.push('important');
    if (marks.deleted && marks.deleted[msg.index]) tags.push('deleted');
    if (msg.thinking) tags.push('thinking');
    if (msg.artifacts && msg.artifacts.length > 0) tags.push('artifacts');
    if (msg.images && msg.images.length > 0) tags.push('images');

    return {
      id: msg.index,
      uuid: msg.uuid,
      role: msg.sender === 'human' ? 'user' : 'assistant',
      time: formatTime ? formatTime(msg.timestamp) : '',
      content: getPreview ? getPreview(msg.display_text, 55) : (msg.display_text || '').slice(0, 55),
      fullContent: msg.display_text || '',
      tags,
      parent: parentIndex,
      sender_label: msg.sender_label || (msg.sender === 'human' ? 'User' : 'Assistant'),
    };
  });
}

/**
 * Compute tree layout positions for a set of nodes.
 *
 * @param {Array} nodes - Array of { id, parent, ... } objects
 * @param {Object} [config] - Optional layout configuration overrides
 * @returns {{ positions, edges, branchOf, branchPoints, depths, childrenMap }}
 */
export function computeTreeLayout(nodes, config = {}) {
  const CARD_W = config.CARD_W || LAYOUT_CONFIG.CARD_W;
  const CARD_H = config.CARD_H || LAYOUT_CONFIG.CARD_H;
  const H_GAP = config.H_GAP || LAYOUT_CONFIG.H_GAP;
  const V_GAP = config.V_GAP || LAYOUT_CONFIG.V_GAP;

  // Build children map
  const childrenMap = {};
  let root = null;
  nodes.forEach((n) => {
    if (n.parent === null || n.parent === undefined) {
      if (root === null) root = n.id; // First root node
    } else {
      if (!childrenMap[n.parent]) childrenMap[n.parent] = [];
      childrenMap[n.parent].push(n.id);
    }
  });

  // Handle case with no clear root (orphan messages)
  if (root === null && nodes.length > 0) {
    root = nodes[0].id;
  }

  // Assign branch IDs by tracing paths
  const branchOf = {};
  let branchCounter = 0;

  function assignBranches(nodeId, currentBranch) {
    branchOf[nodeId] = currentBranch;
    // Convert nodeId to string to match childrenMap keys
    const children = childrenMap[String(nodeId)] || [];
    children.forEach((cid, i) => {
      if (i === 0) {
        assignBranches(cid, currentBranch);
      } else {
        branchCounter++;
        assignBranches(cid, branchCounter);
      }
    });
  }
  if (root !== null) assignBranches(root, 0);

  // Compute subtree widths
  const subtreeWidth = {};
  function calcWidth(nodeId) {
    // Convert nodeId to string to match childrenMap keys
    const children = childrenMap[String(nodeId)] || [];
    if (children.length === 0) {
      subtreeWidth[nodeId] = CARD_W;
      return CARD_W;
    }
    let total = 0;
    children.forEach((cid, i) => {
      if (i > 0) total += H_GAP;
      total += calcWidth(cid);
    });
    subtreeWidth[nodeId] = Math.max(CARD_W, total);
    return subtreeWidth[nodeId];
  }
  if (root !== null) calcWidth(root);

  // Assign positions
  // Centered layout: children are distributed symmetrically around
  // the parent's center X, so branches spread left AND right.
  const positions = {};
  const depths = {};

  function layout(nodeId, centerX, y, depth) {
    positions[nodeId] = { x: centerX - CARD_W / 2, y };
    depths[nodeId] = depth;
    const children = childrenMap[String(nodeId)] || [];
    if (children.length === 0) return;

    // Total width of all children subtrees with gaps
    let totalChildWidth = 0;
    children.forEach((cid, i) => {
      if (i > 0) totalChildWidth += H_GAP;
      totalChildWidth += subtreeWidth[cid];
    });

    // Start position: center children around parent's center
    let cx = centerX - totalChildWidth / 2;
    children.forEach((cid, i) => {
      if (i > 0) cx += H_GAP;
      const childCenter = cx + subtreeWidth[cid] / 2;
      layout(cid, childCenter, y + CARD_H + V_GAP, depth + 1);
      cx += subtreeWidth[cid];
    });
  }
  // Start layout with root centered at a reasonable position
  const rootCenter = 100 + (subtreeWidth[root] || CARD_W) / 2;
  if (root !== null) layout(root, rootCenter, 100, 0);

  // Build edges
  const edges = [];
  nodes.forEach((n) => {
    if (n.parent !== null && n.parent !== undefined && positions[n.id] && positions[n.parent]) {
      edges.push({
        from: n.parent,
        to: n.id,
        branchChange: branchOf[n.id] !== branchOf[n.parent],
      });
    }
  });

  // Detect branch points
  const branchPoints = new Set();
  Object.entries(childrenMap).forEach(([pid, children]) => {
    if (children.length > 1) branchPoints.add(Number(pid));
  });

  return { positions, edges, branchOf, branchPoints, depths, childrenMap };
}

/**
 * Get unique branch IDs from layout result.
 * @param {Object} branchOf - Map of nodeId → branchId
 * @returns {number[]} Sorted unique branch IDs
 */
export function getUniqueBranches(branchOf) {
  return [...new Set(Object.values(branchOf))].sort((a, b) => a - b);
}

/**
 * Get branch color for a given branch index.
 * @param {number} branchId
 * @returns {string} CSS color
 */
export function getBranchColor(branchId) {
  return BRANCH_COLORS[(branchId || 0) % BRANCH_COLORS.length];
}
