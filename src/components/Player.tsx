import { useGameStore } from '../store';
import styles from '../styles/Player.module.css';

const CELL_SIZE = 68; // 64px tile + 4px gap

export function Player() {
  const playerRow = useGameStore((s) => s.playerRow);
  const playerCol = useGameStore((s) => s.playerCol);
  const direction = useGameStore((s) => s.playerDirection);

  const x = playerCol * CELL_SIZE;
  const y = playerRow * CELL_SIZE;

  const scaleX = direction === 'left' ? -1 : 1;

  return (
    <div
      className={styles.player}
      style={{
        transform: `translate(${x}px, ${y}px) scaleX(${scaleX})`,
      }}
    >
      <img src="/sprites/remigijus.svg" alt="Remigijus" className={styles.sprite} />
    </div>
  );
}
