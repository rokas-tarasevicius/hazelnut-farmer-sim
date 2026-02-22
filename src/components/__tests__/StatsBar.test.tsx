import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StatsBar } from '../StatsBar';
import { useGameStore } from '../../store';

function findEmptyTile() {
  const grid = useGameStore.getState().grid;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c].state === 'empty') return { row: r, col: c };
    }
  }
  return null;
}

describe('StatsBar', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('renders money amount', () => {
    render(<StatsBar />);
    expect(screen.getByText('$100')).toBeInTheDocument();
  });

  it('renders tree count as 0 initially', () => {
    render(<StatsBar />);
    expect(screen.getByText('Trees:')).toBeInTheDocument();
    const label = screen.getByText('Trees:');
    const value = label.parentElement?.querySelector('[class*="statValue"]');
    expect(value?.textContent).toBe('0');
  });

  it('renders harvests count', () => {
    render(<StatsBar />);
    expect(screen.getByText('Harvests:')).toBeInTheDocument();
  });

  it('shows correct tree count after planting', () => {
    const empty = findEmptyTile();
    expect(empty).not.toBeNull();
    useGameStore.getState().plantTree(empty!.row, empty!.col, 'common_hazelnut');

    render(<StatsBar />);
    const label = screen.getByText('Trees:');
    const value = label.parentElement?.querySelector('[class*="statValue"]');
    expect(value?.textContent).toBe('1');
  });

  it('tree count stays after harvest (tree regrows)', () => {
    const empty = findEmptyTile();
    expect(empty).not.toBeNull();
    useGameStore.getState().plantTree(empty!.row, empty!.col, 'common_hazelnut');

    // Force harvestable
    const grid = useGameStore.getState().grid.map((r) => r.map((t) => ({ ...t })));
    grid[empty!.row][empty!.col].state = 'harvestable';
    useGameStore.setState({ grid });

    useGameStore.getState().harvest(empty!.row, empty!.col);

    render(<StatsBar />);
    // Tree is now in 'growing' state — still counted
    const label = screen.getByText('Trees:');
    const value = label.parentElement?.querySelector('[class*="statValue"]');
    expect(value?.textContent).toBe('1');
  });
});
