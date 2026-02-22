import { useGameStore } from '../store';
import styles from '../styles/StatsBar.module.css';

export function StatsBar() {
  const money = useGameStore((s) => s.money);
  const totalHarvests = useGameStore((s) => s.totalHarvests);
  const treeCount = useGameStore((s) =>
    s.grid.flat().filter((t) => t.state === 'planted' || t.state === 'growing' || t.state === 'harvestable').length
  );
  const resetGame = useGameStore((s) => s.resetGame);

  return (
    <div className={styles.bar}>
      <span className={styles.title}>Hazelnut Farmer</span>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Money:</span>
          <span className={styles.money}>${money}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Trees:</span>
          <span className={styles.statValue}>{treeCount}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Harvests:</span>
          <span className={styles.statValue}>{totalHarvests}</span>
        </div>
        <span className={styles.hints}>Arrows: Move | Enter: Interact | Esc: Close</span>
        <button className={styles.resetBtn} onClick={resetGame}>
          Reset
        </button>
      </div>
    </div>
  );
}
