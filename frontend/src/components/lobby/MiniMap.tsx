/**
 * MiniMap Component
 *
 * Renders a small, read-only SVG representation of a scenario"s hex map.
 */
import { useMemo } from "react";
import type { HexTile } from "../../../../shared/types/entities";
import styles from "./MiniMap.module.css";

interface MiniMapProps {
  mapLayout: HexTile[];
}

const MINI_HEX_SIZE = 12;

const TERRAIN_COLORS: Record<HexTile["terrain"], string> = {
  normal: "#4a4a4a",
  difficult: "#8b4513",
  hazardous: "#b22222",
  obstacle: "#2b2b2b",
};

export function MiniMap({ mapLayout }: MiniMapProps) {
  const { hexes, viewBox } = useMemo(() => {
    if (!mapLayout || mapLayout.length === 0) {
      return { hexes: [], viewBox: "0 0 100 100" };
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    const hexes = mapLayout.map((tile: HexTile) => {
      const { q, r } = tile.coordinates;
      const x = MINI_HEX_SIZE * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
      const y = MINI_HEX_SIZE * (3 / 2 * r);

      const points = Array.from({ length: 6 }).map((_, i) => {
        const angle = (Math.PI / 3) * i;
        const pointX = x + MINI_HEX_SIZE * Math.cos(angle);
        const pointY = y + MINI_HEX_SIZE * Math.sin(angle);
        minX = Math.min(minX, pointX);
        minY = Math.min(minY, pointY);
        maxX = Math.max(maxX, pointX);
        maxY = Math.max(maxY, pointY);
        return `${pointX},${pointY}`;
      }).join(" ");

      return {
        key: `${q},${r}`,
        points,
        fill: TERRAIN_COLORS[tile.terrain] || "#cccccc",
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
          {hexes.map((hex: { key: string; points: string; fill: string }) => (
            <polygon key={hex.key} points={hex.points} fill={hex.fill} stroke="#1c1c1c" strokeWidth="1" />
          ))}
        </g>
      </svg>
    </div>
  );
}
