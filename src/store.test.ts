import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './store';

function getState() {
  return useGameStore.getState();
}

// Find first tile matching criteria
function findTile(pred: (t: { terrain: string; state: string; locked: boolean }) => boolean) {
  const grid = getState().grid;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (pred(grid[r][c])) return { row: r, col: c, tile: grid[r][c] };
    }
  }
  return null;
}

describe('store', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  describe('plantTree', () => {
    it('plants a tree on an empty tile and deducts money', () => {
      const emptyTile = findTile((t) => t.state === 'empty' && t.terrain === 'grass');
      expect(emptyTile).not.toBeNull();

      const before = getState();
      expect(before.money).toBe(100);

      before.plantTree(emptyTile!.row, emptyTile!.col, 'common_hazelnut');

      const after = getState();
      expect(after.money).toBe(90);
      expect(after.grid[emptyTile!.row][emptyTile!.col].state).toBe('planted');
      expect(after.grid[emptyTile!.row][emptyTile!.col].treeType).toBe('common_hazelnut');
      expect(after.grid[emptyTile!.row][emptyTile!.col].plantedAt).toBeDefined();
    });

    it('does not plant if insufficient money', () => {
      useGameStore.setState({ money: 5 });
      const emptyTile = findTile((t) => t.state === 'empty');
      expect(emptyTile).not.toBeNull();

      getState().plantTree(emptyTile!.row, emptyTile!.col, 'common_hazelnut');

      expect(getState().grid[emptyTile!.row][emptyTile!.col].state).toBe('empty');
      expect(getState().money).toBe(5);
    });

    it('does not plant on non-empty tile', () => {
      const emptyTile = findTile((t) => t.state === 'empty');
      expect(emptyTile).not.toBeNull();

      getState().plantTree(emptyTile!.row, emptyTile!.col, 'common_hazelnut');
      const moneyAfterFirst = getState().money;

      getState().plantTree(emptyTile!.row, emptyTile!.col, 'turkish_hazelnut');

      expect(getState().money).toBe(moneyAfterFirst);
      expect(getState().grid[emptyTile!.row][emptyTile!.col].treeType).toBe('common_hazelnut');
    });
  });

  describe('harvest', () => {
    it('harvests a harvestable tree and adds money', () => {
      const emptyTile = findTile((t) => t.state === 'empty');
      expect(emptyTile).not.toBeNull();

      getState().plantTree(emptyTile!.row, emptyTile!.col, 'common_hazelnut');
      const grid = getState().grid.map((r) => r.map((t) => ({ ...t })));
      grid[emptyTile!.row][emptyTile!.col].state = 'harvestable';
      useGameStore.setState({ grid });

      const moneyBefore = getState().money;
      getState().harvest(emptyTile!.row, emptyTile!.col);

      expect(getState().money).toBe(moneyBefore + 25);
      expect(getState().grid[emptyTile!.row][emptyTile!.col].state).toBe('empty');
      expect(getState().grid[emptyTile!.row][emptyTile!.col].treeType).toBeUndefined();
      expect(getState().totalHarvests).toBe(1);
    });
  });

  describe('clearForest', () => {
    it('starts clearing an unlocked forest tile and deducts money', () => {
      const forestTile = findTile((t) => t.terrain === 'forest' && t.state === 'natural' && !t.locked);
      expect(forestTile).not.toBeNull();

      getState().clearForest(forestTile!.row, forestTile!.col);

      expect(getState().grid[forestTile!.row][forestTile!.col].state).toBe('clearing');
      expect(getState().grid[forestTile!.row][forestTile!.col].clearingAt).toBeDefined();
      expect(getState().money).toBe(85);
    });
  });

  describe('buyLand', () => {
    it('unlocks a locked tile and deducts money', () => {
      const lockedTile = findTile((t) => t.locked);
      expect(lockedTile).not.toBeNull();

      useGameStore.setState({ money: 500 });
      getState().buyLand(lockedTile!.row, lockedTile!.col);

      expect(getState().grid[lockedTile!.row][lockedTile!.col].locked).toBe(false);
      expect(getState().money).toBeLessThan(500);
    });
  });

  describe('buildBridge', () => {
    it('starts building a bridge on a river tile', () => {
      const riverTile = findTile((t) => t.terrain === 'river' && t.state === 'natural');
      expect(riverTile).not.toBeNull();

      useGameStore.setState({ money: 200 });
      getState().buildBridge(riverTile!.row, riverTile!.col);

      expect(getState().grid[riverTile!.row][riverTile!.col].state).toBe('bridging');
      expect(getState().grid[riverTile!.row][riverTile!.col].bridgingAt).toBeDefined();
      expect(getState().money).toBe(100);
    });
  });

  describe('tick', () => {
    it('transitions clearing to empty after clear time', () => {
      const forestTile = findTile((t) => t.terrain === 'forest' && t.state === 'natural' && !t.locked);
      expect(forestTile).not.toBeNull();

      getState().clearForest(forestTile!.row, forestTile!.col);

      const grid = getState().grid.map((r) => r.map((t) => ({ ...t })));
      grid[forestTile!.row][forestTile!.col].clearingAt = Date.now() - 11000;
      useGameStore.setState({ grid });

      getState().tick();

      expect(getState().grid[forestTile!.row][forestTile!.col].state).toBe('empty');
    });

    it('transitions planted to harvestable after grow time', () => {
      const emptyTile = findTile((t) => t.state === 'empty');
      expect(emptyTile).not.toBeNull();

      getState().plantTree(emptyTile!.row, emptyTile!.col, 'common_hazelnut');

      const grid = getState().grid.map((r) => r.map((t) => ({ ...t })));
      grid[emptyTile!.row][emptyTile!.col].plantedAt = Date.now() - 31000;
      useGameStore.setState({ grid });

      getState().tick();

      expect(getState().grid[emptyTile!.row][emptyTile!.col].state).toBe('harvestable');
    });

    it('transitions bridging to bridge after bridge time', () => {
      const riverTile = findTile((t) => t.terrain === 'river' && t.state === 'natural');
      expect(riverTile).not.toBeNull();

      useGameStore.setState({ money: 200 });
      getState().buildBridge(riverTile!.row, riverTile!.col);

      const grid = getState().grid.map((r) => r.map((t) => ({ ...t })));
      grid[riverTile!.row][riverTile!.col].bridgingAt = Date.now() - 21000;
      useGameStore.setState({ grid });

      getState().tick();

      expect(getState().grid[riverTile!.row][riverTile!.col].state).toBe('bridge');
    });
  });
});
