import React from 'react';
import { BRANCH_COLORS, LAYOUT_CONFIG } from '../../utils/whiteboardLayoutEngine';

const ConnectionLines = ({ edges, positions, branchOf, branchPoints }) => {
  const { CARD_W, CARD_H } = LAYOUT_CONFIG;

  return (
    <svg className="whiteboard-connections">
      <defs>
        {BRANCH_COLORS.map((c, i) => (
          <linearGradient key={i} id={`wb-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c} stopOpacity="0.6" />
            <stop offset="100%" stopColor={c} stopOpacity="0.25" />
          </linearGradient>
        ))}
      </defs>

      {edges.map((edge, i) => {
        const fp = positions[edge.from];
        const tp = positions[edge.to];
        if (!fp || !tp) return null;

        const x1 = fp.x + CARD_W / 2;
        const y1 = fp.y + CARD_H;
        const x2 = tp.x + CARD_W / 2;
        const y2 = tp.y;
        const midY = y1 + (y2 - y1) * 0.5;
        const bIdx = (branchOf[edge.to] || 0) % BRANCH_COLORS.length;
        const isBranchEdge = edge.branchChange;
        const pathD = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;

        return (
          <g key={i}>
            {/* Shadow path (no filter - lightweight opacity only) */}
            <path
              d={pathD}
              fill="none"
              stroke={BRANCH_COLORS[bIdx]}
              strokeWidth={isBranchEdge ? 5 : 3.5}
              strokeOpacity={0.06}
            />
            {/* Main path */}
            <path
              d={pathD}
              fill="none"
              stroke={`url(#wb-grad-${bIdx})`}
              strokeWidth={isBranchEdge ? 2.5 : 1.5}
              strokeDasharray={isBranchEdge ? "6 4" : "none"}
            />
            {/* Arrow endpoint */}
            <circle cx={x2} cy={y2 - 2} r={3} fill={BRANCH_COLORS[bIdx]} fillOpacity={0.5} />
          </g>
        );
      })}

      {/* Branch point indicators */}
      {[...branchPoints].map((pid) => {
        const p = positions[pid];
        if (!p) return null;
        const bIdx = (branchOf[pid] || 0) % BRANCH_COLORS.length;
        return (
          <g key={`bp-${pid}`}>
            <circle
              cx={p.x + CARD_W / 2} cy={p.y + CARD_H + 4} r={6}
              fill="none" stroke={BRANCH_COLORS[bIdx]} strokeWidth={2} strokeOpacity={0.6}
            />
            <circle
              cx={p.x + CARD_W / 2} cy={p.y + CARD_H + 4} r={2.5}
              fill={BRANCH_COLORS[bIdx]} fillOpacity={0.8}
            />
          </g>
        );
      })}
    </svg>
  );
};

export default React.memo(ConnectionLines);
