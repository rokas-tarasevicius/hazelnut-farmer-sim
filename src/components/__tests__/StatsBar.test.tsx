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

  it('renders growing count as 0 initially', () => {
    render(<StatsBar />);
    expect(screen.getByText('Growing:')).toBeInTheDocument();
    const growingLabel = screen.getByText('Growing:');
    const growingValue = growingLabel.parentElement?.querySelector('[class*="statValue"]');
    expect(growingValue?.textContent).toBe('0');
  });

  it('renders harvests count', () => {
    render(<StatsBar />);
    expect(screen.getByText('Harvests:')).toBeInTheDocument();
  });

  it('shows correct growing count after planting', () => {
    const empty = findEmptyTile();
    expect(empty).not.toBeNull();
    useGameStore.getState().plantTree(empty!.row, empty!.col, 'common_hazelnut');

    render(<StatsBar />);
    const growingLabel = screen.getByText('Growing:');
    const growingValue = growingLabel.parentElement?.querySelector('[class*="statValue"]');
    expect(growingValue?.textContent).toBe('1');
  });

  it('growing count decreases after harvest', () => {
    const empty = findEmptyTile();
    expect(empty).not.toBeNull();
    useGameStore.getState().plantTree(empty!.row, empty!.col, 'common_hazelnut');

    // Force harvestable
    const grid = useGameStore.getState().grid.map((r) => r.map((t) => ({ ...t })));
    grid[empty!.row][empty!.col].state = 'harvestable';
    useGameStore.setState({ grid });

    useGameStore.getState().harvest(empty!.row, empty!.col);

    render(<StatsBar />);
    const growingLabel = screen.getByText('Growing:');
    const growingValue = growingLabel.parentElement?.querySelector('[class*="statValue"]');
    expect(growingValue?.textContent).toBe('0');
  });
});
