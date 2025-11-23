/**
 * MiniMap Component
 *
 * Renders a small, read-only SVG representation of a scenario's hex map.
 */
import { useMemo } from 'react';
import type { MapLayout } from '../../../../shared/types/entities';
import { axialToScreen, HEX_WIDTH, HEX_HEIGHT } from '../../game/hex-utils';
import styles from './MiniMap.module.css';

interface MiniMapProps {
  mapLayout: MapLayout;
}

const MINI_HEX_SIZE = 12;
const MINI_HEX_WIDTH = Math.sqrt(3) * MINI_HEX_SIZE;
const MINI_HEX_HEIGHT = 2 * MINI_HEX_SIZE;

const TERRAIN_COLORS: Record<MapLayout[0]['terrain'], string> = {
  normal: '#4a4a4a',
  difficult: '#8b4513',
  hazardous: '#b22222',
  obstacle: '#2b2b2b',
};

export function MiniMap({ mapLayout }: MiniMapProps) {
  const { hexes, viewBox } = useMemo(() => {
    if (!mapLayout || mapLayout.length === 0) {
      return { hexes: [], viewBox: '0 0 100 100' };
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    const hexes = mapLayout.map(tile => {
      const { q, r } = tile.coordinates;
      const x = MINI_HEX_SIZE * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
      const y = MINI_HEX_SIZE * (3 / 2 * r);

      const points = [
        [x + MINI_HEX_SIZE * Math.cos(0), y + MINI_HEX_SIZE * Math.sin(0)],
        [x + MINI_HEX_SIZE * Math.cos(Math.PI / 3), y + MINI_HEX_SIZE * Math.sin(Math.PI / 3)],
        [x + MINI_HEX_SIZE * Math.cos(2 * Math.PI / 3), y + MINI_HEX_SIZE * Math.sin(2 * Math.PI / 3)],
        [x + MINI_HEX_SIZE, y],
        [x + MINI_HEX_SIZE * Math.cos(4 * Math.PI / 3), y + MINI_HEX_SIZE * Math.sin(4 * Math.PI / 3)],
        [x + MINI_HEX_SIZE * Math.cos(5 * Math.PI / 3), y + MINI_HEX_SIZE * Math.sin(5 * Math.PI / 3)],
      ].map(p => {
        minX = Math.min(minX, p[0]);
        minY = Math.min(minY, p[1]);
        maxX = Math.max(maxX, p[0]);
        maxY = Math.max(maxY, p[1]);
        return `${p[0]},${p[1]}`;
      }).join(' ');

      return {
        key: `${q},${r}`,
        points,
        fill: TERRAIN_COLORS[tile.terrain] || '#cccccc',
      };
    });

    const padding = MINI_HEX_SIZE;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;
    const viewBox = `${minX - padding} ${minY - padding} ${width} ${height}`;

    return { hexes, viewBox };
  }, [mapLayout]);

  return (
    <div className={styles.miniMap} data-testid="mini-map">
      <svg width="100%" height="100%" viewBox={viewBox} preserveAspectRatio="xMidYMid meet">
        <g>
          {hexes.map(hex => (
            <polygon key={hex.key} points={hex.points} fill={hex.fill} stroke="#1c1c1c" strokeWidth="1" />
          ))}
        </g>
      </svg>
    </div>
  );
}
