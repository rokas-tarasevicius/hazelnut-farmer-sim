import { useEffect } from 'react';
import { useGameStore } from '../store';

export function useGameTick() {
  const tick = useGameStore((s) => s.tick);

  useEffect(() => {
    // Run tick immediately on mount (catches up growth from offline time)
    tick();

    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [tick]);
}
