import { useEffect, useRef } from 'react';
import { useGameStore } from '../store';
import type { Direction } from '../store';

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
};

const MOVE_COOLDOWN = 130; // ms

export function usePlayerInput() {
  const lastMoveRef = useRef(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const direction = KEY_TO_DIRECTION[e.key];
      if (direction) {
        e.preventDefault();
        const now = Date.now();
        if (now - lastMoveRef.current < MOVE_COOLDOWN) return;
        lastMoveRef.current = now;
        useGameStore.getState().movePlayer(direction);
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        useGameStore.getState().toggleActionPanel();
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        const state = useGameStore.getState();
        if (state.showActionPanel) {
          useGameStore.setState({ showActionPanel: false });
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
