import React from 'react';

const CARD_W = 280;
const CARD_H = 160;
const MINIMAP_COLORS = ['#6BA5E7', '#E8913A', '#8BC78B', '#D47DB6', '#E0D85A'];

const WhiteboardMiniMap = ({ positions, cards, pan, scale, viewW, viewH, onJump }) => {
  const mapW = 180, mapH = 120;

  const allPos = Object.values(positions);
  if (allPos.length === 0) return null;

  const allX = allPos.map(p => p.x);
  const allY = allPos.map(p => p.y);
  const minX = Math.min(...allX) - 50;
  const maxX = Math.max(...allX) + CARD_W + 50;
  const minY = Math.min(...allY) - 50;
  const maxY = Math.max(...allY) + CARD_H + 50;
  const worldW = maxX - minX;
  const worldH = maxY - minY;
  const s = Math.min(mapW / worldW, mapH / worldH);

  const vpX = (-pan.x / scale - minX) * s;
  const vpY = (-pan.y / scale - minY) * s;
  const vpW = (viewW / scale) * s;
  const vpH = (viewH / scale) * s;

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / s + minX;
    const cy = (e.clientY - rect.top) / s + minY;
    onJump(cx, cy);
  };

  // Assign colors based on card index for visual distinction
  const cardIds = Object.keys(positions);

  return (
    <div className="whiteboard-minimap" onClick={handleClick}>
      <svg width={mapW} height={mapH}>
        {cardIds.map((id, i) => {
          const p = positions[id];
          if (!p) return null;
          const color = MINIMAP_COLORS[i % MINIMAP_COLORS.length];
          return (
            <rect
              key={id}
              x={(p.x - minX) * s}
              y={(p.y - minY) * s}
              width={CARD_W * s}
              height={CARD_H * s}
              fill={color}
              fillOpacity={0.5}
              rx={1}
            />
          );
        })}
        <rect
          x={vpX} y={vpY}
          width={vpW} height={vpH}
          fill="none"
          stroke="var(--accent-primary)"
          strokeWidth={1.5}
          strokeOpacity={0.7}
          rx={2}
        />
      </svg>
    </div>
  );
};

export default React.memo(WhiteboardMiniMap);
