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
      expect(after.money).toBe(70); // cost 30
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
    it('harvests nuts and tree stays (enters growing state)', () => {
      const emptyTile = findTile((t) => t.state === 'empty');
      expect(emptyTile).not.toBeNull();

      getState().plantTree(emptyTile!.row, emptyTile!.col, 'common_hazelnut');
      // Force harvestable
      const grid = getState().grid.map((r) => r.map((t) => ({ ...t })));
      grid[emptyTile!.row][emptyTile!.col].state = 'harvestable';
      useGameStore.setState({ grid });

      const moneyBefore = getState().money;
      getState().harvest(emptyTile!.row, emptyTile!.col);

      expect(getState().money).toBe(moneyBefore + 8); // sellPrice = 8
      expect(getState().grid[emptyTile!.row][emptyTile!.col].state).toBe('growing');
      expect(getState().grid[emptyTile!.row][emptyTile!.col].treeType).toBe('common_hazelnut');
      expect(getState().grid[emptyTile!.row][emptyTile!.col].lastHarvestedAt).toBeDefined();
      expect(getState().totalHarvests).toBe(1);
    });
  });

  describe('clearForest', () => {
    it('starts clearing an unlocked forest tile and deducts money', () => {
      const forestTile = findTile((t) => t.terrain === 'forest' && t.state === 'natural' && !t.locked);
      if (!forestTile) return; // map seed might not have unlocked forests

      getState().clearForest(forestTile.row, forestTile.col);

      expect(getState().grid[forestTile.row][forestTile.col].state).toBe('clearing');
      expect(getState().grid[forestTile.row][forestTile.col].clearingAt).toBeDefined();
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
      if (!forestTile) return;

      getState().clearForest(forestTile.row, forestTile.col);

      const grid = getState().grid.map((r) => r.map((t) => ({ ...t })));
      grid[forestTile.row][forestTile.col].clearingAt = Date.now() - 11000;
      useGameStore.setState({ grid });

      getState().tick();

      expect(getState().grid[forestTile.row][forestTile.col].state).toBe('empty');
    });

    it('transitions planted to harvestable after grow time', () => {
      const emptyTile = findTile((t) => t.state === 'empty');
      expect(emptyTile).not.toBeNull();

      getState().plantTree(emptyTile!.row, emptyTile!.col, 'common_hazelnut');

      // common_hazelnut growTime = 120s, so we set plantedAt to 121 seconds ago
      const grid = getState().grid.map((r) => r.map((t) => ({ ...t })));
      grid[emptyTile!.row][emptyTile!.col].plantedAt = Date.now() - 121000;
      useGameStore.setState({ grid });

      getState().tick();

      expect(getState().grid[emptyTile!.row][emptyTile!.col].state).toBe('harvestable');
    });

    it('transitions growing to harvestable after harvest time (nut regrowth)', () => {
      const emptyTile = findTile((t) => t.state === 'empty');
      expect(emptyTile).not.toBeNull();

      // Plant, force harvestable, harvest
      getState().plantTree(emptyTile!.row, emptyTile!.col, 'common_hazelnut');
      let grid = getState().grid.map((r) => r.map((t) => ({ ...t })));
      grid[emptyTile!.row][emptyTile!.col].state = 'harvestable';
      useGameStore.setState({ grid });
      getState().harvest(emptyTile!.row, emptyTile!.col);

      // Now it should be 'growing', fast-forward lastHarvestedAt
      // common_hazelnut harvestTime = 40s, so we set lastHarvestedAt to 41 seconds ago
      grid = getState().grid.map((r) => r.map((t) => ({ ...t })));
      grid[emptyTile!.row][emptyTile!.col].lastHarvestedAt = Date.now() - 41000;
      useGameStore.setState({ grid });

      getState().tick();

      expect(getState().grid[emptyTile!.row][emptyTile!.col].state).toBe('harvestable');
      expect(getState().grid[emptyTile!.row][emptyTile!.col].treeType).toBe('common_hazelnut');
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

  describe('resetGame', () => {
    it('generates a different map seed on reset', () => {
      const seed1 = getState().mapSeed;
      getState().resetGame();
      const seed2 = getState().mapSeed;
      // Seeds should differ (astronomically unlikely to collide)
      expect(seed2).not.toBe(seed1);
    });
  });

  // --- Autonomous drone tests ---
  // These test the new flying-drone system where drones are standalone entities
  // that find, fly to, and harvest trees on their own.
  describe('drones', () => {
    // Helper: create a harvestable tree at a specific position and return its location
    function makeHarvestable(row: number, col: number) {
      const grid = getState().grid.map((r) => r.map((t) => ({ ...t })));
      grid[row][col] = {
        ...grid[row][col],
        state: 'harvestable',
        treeType: 'common_hazelnut',
      };
      useGameStore.setState({ grid });
    }

    it('buyDrone creates a drone entity at the player position', () => {
      useGameStore.setState({ money: 100 });
      getState().buyDrone();

      const state = getState();
      expect(state.drones).toHaveLength(1);
      expect(state.drones[0].id).toBe('drone-0');
      expect(state.drones[0].row).toBe(state.playerRow);
      expect(state.drones[0].col).toBe(state.playerCol);
      expect(state.drones[0].state).toBe('idle');
      expect(state.money).toBe(50); // DRONE_COST = 50
    });

    it('drone finds and moves toward nearest harvestable tree', () => {
      const { playerRow, playerCol } = getState();
      // Place a harvestable tree 3 tiles to the right of the player
      const targetCol = playerCol + 3;
      makeHarvestable(playerRow, targetCol);

      // Buy a drone (spawns at player position)
      useGameStore.setState({ money: 100 });
      getState().buyDrone();

      // First tick: drone transitions idle → moving (sets lastMoveAt to now)
      getState().tick();
      expect(getState().drones[0].state).toBe('moving');
      expect(getState().drones[0].targetRow).toBe(playerRow);
      expect(getState().drones[0].targetCol).toBe(targetCol);

      // Simulate 1 second passing so the drone can take steps on the next tick.
      // We push lastMoveAt back by 1 second to mimic the real 1s tick interval.
      const drones = getState().drones.map((d) => ({ ...d, lastMoveAt: Date.now() - 1000 }));
      useGameStore.setState({ drones });

      // Second tick: drone should step closer to the tree
      getState().tick();

      const drone = getState().drones[0];
      // Drone should have moved closer (up to 2 steps per tick)
      expect(drone.col).toBeGreaterThan(playerCol);
    });

    it('drone harvests after 5 seconds and earns money', () => {
      const { playerRow, playerCol } = getState();
      makeHarvestable(playerRow, playerCol); // tree right under the player

      useGameStore.setState({ money: 100 });
      getState().buyDrone();

      // Manually set the drone to 'harvesting' state at the tree, started 6 seconds ago
      const now = Date.now();
      const drones = getState().drones.map((d) => ({
        ...d,
        state: 'harvesting' as const,
        targetRow: playerRow,
        targetCol: playerCol,
        harvestingAt: now - 6000, // 6 seconds ago (> 5s DRONE_HARVEST_TIME)
      }));
      useGameStore.setState({ drones });

      const moneyBefore = getState().money;
      getState().tick();

      // Drone should have harvested: money increases, tile goes to 'growing', drone goes idle
      expect(getState().money).toBe(moneyBefore + 8); // common_hazelnut sellPrice = 8
      expect(getState().grid[playerRow][playerCol].state).toBe('growing');
      expect(getState().drones[0].state).toBe('idle');
      expect(getState().drones[0].targetRow).toBeNull();
      expect(getState().totalHarvests).toBe(1);
    });

    it('multiple drones target different trees', () => {
      const { playerRow, playerCol } = getState();
      // Create two harvestable trees at different spots
      makeHarvestable(playerRow, playerCol + 2);
      makeHarvestable(playerRow, playerCol + 4);

      // Buy two drones
      useGameStore.setState({ money: 200 });
      getState().buyDrone();
      getState().buyDrone();
      expect(getState().drones).toHaveLength(2);

      // Set lastMoveAt so drones can step
      const drones = getState().drones.map((d) => ({ ...d, lastMoveAt: Date.now() - 1000 }));
      useGameStore.setState({ drones });

      getState().tick();

      // The two drones should have different targets (the "claimed" set prevents overlap)
      const d0 = getState().drones[0];
      const d1 = getState().drones[1];
      const target0 = `${d0.targetRow}-${d0.targetCol}`;
      const target1 = `${d1.targetRow}-${d1.targetCol}`;
      expect(target0).not.toBe(target1);
    });

    it('drone goes idle when no trees are harvestable', () => {
      // No harvestable trees on the map — the drone should stay idle
      useGameStore.setState({ money: 100 });
      getState().buyDrone();

      getState().tick();

      expect(getState().drones[0].state).toBe('idle');
      expect(getState().drones[0].targetRow).toBeNull();
    });

    it('drone re-targets if its tree is harvested by the player', () => {
      const { playerRow, playerCol } = getState();
      makeHarvestable(playerRow, playerCol);

      useGameStore.setState({ money: 100 });
      getState().buyDrone();

      // Drone is moving toward the tree
      const drones = getState().drones.map((d) => ({
        ...d,
        state: 'moving' as const,
        targetRow: playerRow,
        targetCol: playerCol,
        lastMoveAt: Date.now() - 1000,
      }));
      useGameStore.setState({ drones });

      // Player harvests the tree before the drone arrives
      getState().harvest(playerRow, playerCol);
      expect(getState().grid[playerRow][playerCol].state).toBe('growing');

      // Next tick: drone should notice its target is no longer harvestable → go idle
      getState().tick();

      expect(getState().drones[0].state).toBe('idle');
      expect(getState().drones[0].targetRow).toBeNull();
    });
  });
});
