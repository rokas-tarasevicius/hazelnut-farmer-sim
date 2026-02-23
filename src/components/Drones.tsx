import { useState, useEffect } from 'react';
import { useGameStore, DRONE_HARVEST_TIME } from '../store';
import styles from '../styles/Drone.module.css';

// Same cell size as Player.tsx — 64px tile + 4px gap = 68px per cell
const CELL_SIZE = 68;

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

        let taskProgress: number | undefined;
        if (drone.state === 'harvesting' && drone.harvestingAt !== null) {
          taskProgress = Math.min(
            (now - drone.harvestingAt) / (DRONE_HARVEST_TIME * 1000),
            1
          );
        }

        const stateClass =
          drone.state === 'moving' ? styles.moving :
          drone.state === 'harvesting' ? styles.harvesting :
          '';

        const spriteUrl =
          drone.type === 'water' ? '/sprites/drone_water.svg' :
          drone.type === 'plant' ? '/sprites/drone_plant.svg' :
          '/sprites/drone_harvest.svg';

        const fillClass =
          drone.type === 'water' ? styles.progressFillWater :
          drone.type === 'plant' ? styles.progressFillPlant :
          styles.progressFill;

        return (
          <div
            key={drone.id}
            className={`${styles.drone} ${stateClass}`}
            style={{ transform: `translate(${x}px, ${y}px)` }}
          >
            <img src={spriteUrl} alt={`${drone.type} drone`} className={styles.icon} />
            {taskProgress !== undefined && (
              <div className={styles.progressBar}>
                <div
                  className={fillClass}
                  style={{ width: `${taskProgress * 100}%` }}
                />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
