import { useGameStore } from '../store';
import { Tile } from './Tile';
import { Player } from './Player';
import styles from '../styles/Grid.module.css';

export function Grid() {
  const grid = useGameStore((s) => s.grid);
  const cols = useGameStore((s) => s.gridCols);
  const playerRow = useGameStore((s) => s.playerRow);
  const playerCol = useGameStore((s) => s.playerCol);

  return (
    <div
      className={styles.grid}
      style={{ gridTemplateColumns: `repeat(${cols}, var(--tile-size))` }}
    >
      {grid.flatMap((row, r) =>
        row.map((tile, c) => (
          <Tile
            key={tile.id}
            tile={tile}
            row={r}
            col={c}
            isPlayerHere={r === playerRow && c === playerCol}
          />
        ))
      )}
      <Player />
    </div>
  );
}
