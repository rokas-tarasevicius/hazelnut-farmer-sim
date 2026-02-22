import { useState, useEffect } from 'react';
import { useGameStore, DRONE_HARVEST_TIME } from '../store';
import styles from '../styles/Drone.module.css';

// Same cell size as Player.tsx — 64px tile + 4px gap = 68px per cell
const CELL_SIZE = 68;

/**
 * Custom hook that returns the current time, updated every second.
 * We use this instead of calling Date.now() directly in the render body
 * because React's linter treats Date.now() as an "impure function call"
 * (it returns different results each time). By putting it in a hook with
 * useEffect + setInterval, React knows it's a side effect and is OK with it.
 */
function useNow() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function Drones() {
  const drones = useGameStore((s) => s.drones);
  const now = useNow();

  return (
    <>
      {drones.map((drone) => {
        const x = drone.col * CELL_SIZE;
        const y = drone.row * CELL_SIZE;

        // Calculate harvest progress (0 to 1) while the drone is harvesting
        let harvestProgress: number | undefined;
        if (drone.state === 'harvesting' && drone.harvestingAt !== null) {
          harvestProgress = Math.min(
            (now - drone.harvestingAt) / (DRONE_HARVEST_TIME * 1000),
            1
          );
        }

        // Pick the right CSS class based on state:
        // - 'moving' → bobbing animation
        // - 'harvesting' → harvesting animation
        // - 'idle' → static
        const stateClass =
          drone.state === 'moving' ? styles.moving :
          drone.state === 'harvesting' ? styles.harvesting :
          '';

        return (
          <div
            key={drone.id}
            className={`${styles.drone} ${stateClass}`}
            style={{ transform: `translate(${x}px, ${y}px)` }}
          >
            <span className={styles.icon}>🤖</span>
            {harvestProgress !== undefined && (
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${harvestProgress * 100}%` }}
                />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
