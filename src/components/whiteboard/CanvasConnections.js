import React from 'react';

const CARD_W = 280;
const CARD_H = 160;

const CONNECTION_COLORS = ['#6BA5E7', '#E8913A', '#8BC78B', '#D47DB6', '#E0D85A'];

export function getAnchorPoints(card) {
  const w = card.width || CARD_W;
  const h = card.height || CARD_H;
  return {
    top:    { x: card.x + w / 2, y: card.y },
    bottom: { x: card.x + w / 2, y: card.y + h },
    left:   { x: card.x,         y: card.y + h / 2 },
    right:  { x: card.x + w,     y: card.y + h / 2 },
  };
}

export function getClosestAnchors(cardA, cardB) {
  const anchorsA = getAnchorPoints(cardA);
  const anchorsB = getAnchorPoints(cardB);
  let minDist = Infinity, bestA = null, bestB = null;
  for (const posA of Object.values(anchorsA)) {
    for (const posB of Object.values(anchorsB)) {
      const dist = Math.hypot(posA.x - posB.x, posA.y - posB.y);
      if (dist < minDist) {
        minDist = dist;
        bestA = posA;
        bestB = posB;
      }
    }
  }
  return { from: bestA, to: bestB };
}

function buildPath(from, to) {
  const dx = to.x - from.x;
  const tension = 0.4;
  const cx1 = from.x + dx * tension;
  const cy1 = from.y;
  const cx2 = to.x - dx * tension;
  const cy2 = to.y;
  return `M ${from.x} ${from.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${to.x} ${to.y}`;
}

const InkConnection = ({ fromPos, toPos, color, isSelected, onClick }) => {
  const pathD = buildPath(fromPos, toPos);
  return (
    <g className={isSelected ? 'ink-connection selected' : 'ink-connection'} onClick={onClick}>
      {/* Wide invisible hit area */}
      <path d={pathD} fill="none" stroke="transparent" strokeWidth={14}
            style={{ cursor: 'pointer' }} />
      {/* Soft glow */}
      <path d={pathD} fill="none" stroke={color} strokeWidth={5} strokeOpacity={0.06} />
      {/* Main ink stroke */}
      <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeOpacity={0.55}
            strokeLinecap="round" />
      {/* Endpoint dots */}
      <circle cx={fromPos.x} cy={fromPos.y} r={4} fill={color} fillOpacity={0.4} />
      <circle cx={toPos.x} cy={toPos.y} r={4} fill={color} fillOpacity={0.4} />
      {isSelected && (
        <>
          <circle cx={fromPos.x} cy={fromPos.y} r={6} fill="none"
                  stroke={color} strokeWidth={1.5} />
          <circle cx={toPos.x} cy={toPos.y} r={6} fill="none"
                  stroke={color} strokeWidth={1.5} />
        </>
      )}
    </g>
  );
};

const CanvasConnections = ({
  connections,
  cards,
  selectedConnection,
  onSelectConnection,
}) => {
  return (
    <svg className="whiteboard-connections canvas-connections-svg">
      {connections.map((conn, i) => {
        const cardA = cards[conn.fromCardId];
        const cardB = cards[conn.toCardId];
        if (!cardA || !cardB) return null;
        const { from, to } = getClosestAnchors(cardA, cardB);
        if (!from || !to) return null;
        const color = conn.color || CONNECTION_COLORS[i % CONNECTION_COLORS.length];
        return (
          <InkConnection
            key={conn.id}
            fromPos={from}
            toPos={to}
            color={color}
            isSelected={selectedConnection === conn.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelectConnection(conn.id);
            }}
          />
        );
      })}
    </svg>
  );
};

export default React.memo(CanvasConnections);
