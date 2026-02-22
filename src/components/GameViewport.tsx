import { useRef, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useGameStore } from '../store';
import styles from '../styles/GameViewport.module.css';

const CELL_SIZE = 68; // 64px tile + 4px gap

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

interface GameViewportProps {
  children: ReactNode;
}

export function GameViewport({ children }: GameViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  const playerRow = useGameStore((s) => s.playerRow);
  const playerCol = useGameStore((s) => s.playerCol);
  const gridRows = useGameStore((s) => s.gridRows);
  const gridCols = useGameStore((s) => s.gridCols);

  const updateSize = useCallback(() => {
    if (containerRef.current) {
      setViewportSize({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    }
  }, []);

  useEffect(() => {
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [updateSize]);

  const mapWidth = gridCols * CELL_SIZE;
  const mapHeight = gridRows * CELL_SIZE;

  const playerX = playerCol * CELL_SIZE + 32;
  const playerY = playerRow * CELL_SIZE + 32;

  const offsetX = clamp(
    viewportSize.width / 2 - playerX,
    viewportSize.width - mapWidth,
    0
  );
  const offsetY = clamp(
    viewportSize.height / 2 - playerY,
    viewportSize.height - mapHeight,
    0
  );

  return (
    <div ref={containerRef} className={styles.viewport}>
      <div
        className={styles.inner}
        style={{
          transform: `translate(${offsetX}px, ${offsetY}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
