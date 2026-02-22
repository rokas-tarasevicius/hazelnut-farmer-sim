import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TREE_SPECIES } from './data/trees';
import { generateMap, MAP_ROWS, MAP_COLS, getTerrainType, getPlayerStart } from './data/mapTemplate';
import { isTileWalkable } from './data/map';

export type TerrainType = 'grass' | 'forest' | 'river';
export type TileState = 'natural' | 'clearing' | 'empty' | 'planted' | 'growing' | 'harvestable' | 'bridging' | 'bridge';

export interface Tile {
  id: string;
  terrain: TerrainType;
  state: TileState;
  locked: boolean;
  treeType?: string;
  plantedAt?: number;
  clearingAt?: number;
  bridgingAt?: number;
  lastHarvestedAt?: number;
  isWatered?: boolean;    // true = growing at 2x speed
  hasSprinkler?: boolean; // auto-reapplies isWatered every tick
}

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface GameState {
  money: number;
  totalHarvests: number;
  treesPlanted: number;
  grid: Tile[][];
  gridRows: number;
  gridCols: number;
  playerRow: number;
  playerCol: number;
  playerDirection: Direction;
  showDialog: boolean;
  mapSeed: number;
  hasWateringCan: boolean;

  plantTree: (row: number, col: number, treeType: string) => void;
  clearForest: (row: number, col: number) => void;
  buyLand: (row: number, col: number) => void;
  buildBridge: (row: number, col: number) => void;
  harvest: (row: number, col: number) => void;
  buyWateringCan: () => void;
  water: (row: number, col: number) => void;
  placeSprinkler: (row: number, col: number) => void;
  cutDownTree: (row: number, col: number) => void;
  movePlayer: (direction: Direction) => void;
  toggleDialog: () => void;
  tick: () => void;
  resetGame: () => void;
}

export const CLEAR_COST = 15;
export const CLEAR_TIME = 10; // seconds
export const BRIDGE_COST = 100;
export const BRIDGE_TIME = 20; // seconds
export const CUT_DOWN_COST = 20;
export const WATERING_CAN_COST = 40;
export const SPRINKLER_COST = 200;

const SAVE_VERSION = 5;

export function getLandPrice(row: number, col: number): number {
  const start = getPlayerStart();
  const distance = Math.abs(row - start.row) + Math.abs(col - start.col);
  return 50 + distance * 5;
}

function newSeed(): number {
  return Math.floor(Math.random() * 2147483647);
}

function createInitialGrid(seed: number): Tile[][] {
  const template = generateMap(seed);
  return template.map((row, r) =>
    row.map((cell, c) => {
      const terrain = getTerrainType(cell[0]);
      const locked = cell[1] === 1;
      let state: TileState = 'natural';
      if (terrain === 'grass' && !locked) {
        state = 'empty';
      }
      return {
        id: `${r}-${c}`,
        terrain,
        state,
        locked,
      };
    })
  );
}

function freshState() {
  const seed = newSeed();
  const grid = createInitialGrid(seed); // must run before getPlayerStart()
  const start = getPlayerStart();
  return {
    money: 100,
    totalHarvests: 0,
    treesPlanted: 0,
    grid,
    gridRows: MAP_ROWS,
    gridCols: MAP_COLS,
    playerRow: start.row,
    playerCol: start.col,
    playerDirection: 'down' as Direction,
    showDialog: false,
    mapSeed: seed,
    hasWateringCan: false,
  };
}

const TREE_STATES = new Set<TileState>(['planted', 'growing', 'harvestable']);

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...freshState(),

      plantTree: (row, col, treeType) => {
        const state = get();
        const species = TREE_SPECIES[treeType];
        if (!species || state.money < species.cost) return;

        const tile = state.grid[row]?.[col];
        if (!tile || tile.state !== 'empty') return;

        const newGrid = state.grid.map((r) => r.map((t) => ({ ...t })));
        newGrid[row][col] = {
          ...tile,
          state: 'planted',
          treeType,
          plantedAt: Date.now(),
        };

        set({
          grid: newGrid,
          money: state.money - species.cost,
          treesPlanted: state.treesPlanted + 1,
        });
      },

      clearForest: (row, col) => {
        const state = get();
        if (state.money < CLEAR_COST) return;

        const tile = state.grid[row]?.[col];
        if (!tile || tile.terrain !== 'forest' || tile.state !== 'natural' || tile.locked) return;

        const newGrid = state.grid.map((r) => r.map((t) => ({ ...t })));
        newGrid[row][col] = {
          ...tile,
          state: 'clearing',
          clearingAt: Date.now(),
        };

        set({ grid: newGrid, money: state.money - CLEAR_COST });
      },

      buyLand: (row, col) => {
        const state = get();
        const price = getLandPrice(row, col);
        if (state.money < price) return;

        const tile = state.grid[row]?.[col];
        if (!tile || !tile.locked) return;

        const newGrid = state.grid.map((r) => r.map((t) => ({ ...t })));
        const newState: TileState = tile.terrain === 'forest' ? 'natural' : 'empty';
        newGrid[row][col] = { ...tile, locked: false, state: newState };

        set({ grid: newGrid, money: state.money - price });
      },

      buildBridge: (row, col) => {
        const state = get();
        if (state.money < BRIDGE_COST) return;

        const tile = state.grid[row]?.[col];
        if (!tile || tile.terrain !== 'river' || tile.state !== 'natural') return;

        const newGrid = state.grid.map((r) => r.map((t) => ({ ...t })));
        newGrid[row][col] = { ...tile, state: 'bridging', bridgingAt: Date.now() };

        set({ grid: newGrid, money: state.money - BRIDGE_COST });
      },

      harvest: (row, col) => {
        const state = get();
        const tile = state.grid[row]?.[col];
        if (!tile || tile.state !== 'harvestable' || !tile.treeType) return;

        const species = TREE_SPECIES[tile.treeType];
        if (!species) return;

        const newGrid = state.grid.map((r) => r.map((t) => ({ ...t })));
        newGrid[row][col] = {
          ...tile,
          state: 'growing',
          lastHarvestedAt: Date.now(),
          isWatered: false, // cleared on harvest; sprinkler re-applies next tick
        };

        set({
          grid: newGrid,
          money: state.money + species.sellPrice,
          totalHarvests: state.totalHarvests + 1,
        });
      },

      buyWateringCan: () => {
        const state = get();
        if (state.hasWateringCan || state.money < WATERING_CAN_COST) return;
        set({ money: state.money - WATERING_CAN_COST, hasWateringCan: true });
      },

      water: (row, col) => {
        const state = get();
        if (!state.hasWateringCan) return;

        const tile = state.grid[row]?.[col];
        if (!tile || !TREE_STATES.has(tile.state)) return;

        const newGrid = state.grid.map((r) => r.map((t) => ({ ...t })));
        newGrid[row][col] = { ...tile, isWatered: true };

        set({ grid: newGrid });
      },

      placeSprinkler: (row, col) => {
        const state = get();
        if (state.money < SPRINKLER_COST) return;

        const tile = state.grid[row]?.[col];
        if (!tile || !TREE_STATES.has(tile.state) || tile.hasSprinkler) return;

        const newGrid = state.grid.map((r) => r.map((t) => ({ ...t })));
        newGrid[row][col] = { ...tile, hasSprinkler: true, isWatered: true };

        set({ grid: newGrid, money: state.money - SPRINKLER_COST });
      },

      cutDownTree: (row, col) => {
        const state = get();
        if (state.money < CUT_DOWN_COST) return;

        const tile = state.grid[row]?.[col];
        if (!tile || !TREE_STATES.has(tile.state)) return;

        const newGrid = state.grid.map((r) => r.map((t) => ({ ...t })));
        newGrid[row][col] = {
          id: tile.id,
          terrain: tile.terrain,
          state: 'empty',
          locked: false,
        };

        set({ grid: newGrid, money: state.money - CUT_DOWN_COST });
      },

      movePlayer: (direction) => {
        const state = get();
        const dirMap = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] } as const;
        const [dr, dc] = dirMap[direction];
        const newRow = state.playerRow + dr;
        const newCol = state.playerCol + dc;

        if (newRow < 0 || newRow >= state.gridRows || newCol < 0 || newCol >= state.gridCols) {
          set({ playerDirection: direction });
          return;
        }

        const targetTile = state.grid[newRow][newCol];
        if (!isTileWalkable(targetTile)) {
          set({ playerDirection: direction });
          return;
        }

        set({ playerRow: newRow, playerCol: newCol, playerDirection: direction, showDialog: false });
      },

      toggleDialog: () => {
        set((state) => ({ showDialog: !state.showDialog }));
      },

      tick: () => {
        const state = get();
        const now = Date.now();
        let changed = false;

        const newGrid = state.grid.map((r) =>
          r.map((tile) => {
            // Sprinklers auto-water their tile
            if (tile.hasSprinkler && TREE_STATES.has(tile.state) && !tile.isWatered) {
              tile = { ...tile, isWatered: true };
              changed = true;
            }

            // Check clearing completion
            if (tile.state === 'clearing' && tile.clearingAt) {
              const elapsed = (now - tile.clearingAt) / 1000;
              if (elapsed >= CLEAR_TIME) {
                changed = true;
                return { ...tile, state: 'empty' as TileState, clearingAt: undefined };
              }
            }

            // Watering boost: subtract extra 1000ms from growth timers each tick
            // (1 real second = 2 virtual seconds when watered, cancelling the 2x slowdown)
            if (tile.isWatered) {
              if (tile.state === 'planted' && tile.plantedAt) {
                tile = { ...tile, plantedAt: tile.plantedAt - 1000 };
                changed = true;
              } else if (tile.state === 'growing' && tile.lastHarvestedAt) {
                tile = { ...tile, lastHarvestedAt: tile.lastHarvestedAt - 1000 };
                changed = true;
              }
            }

            // Check initial growth completion (planted → harvestable)
            if (tile.state === 'planted' && tile.treeType && tile.plantedAt) {
              const species = TREE_SPECIES[tile.treeType];
              if (species && (now - tile.plantedAt) / 1000 >= species.growTime) {
                changed = true;
                return { ...tile, state: 'harvestable' as TileState, isWatered: false };
              }
            }

            // Check nut regrowth (growing → harvestable)
            if (tile.state === 'growing' && tile.treeType && tile.lastHarvestedAt) {
              const species = TREE_SPECIES[tile.treeType];
              if (species && (now - tile.lastHarvestedAt) / 1000 >= species.harvestTime) {
                changed = true;
                return { ...tile, state: 'harvestable' as TileState, lastHarvestedAt: undefined, isWatered: false };
              }
            }

            // Check bridge completion
            if (tile.state === 'bridging' && tile.bridgingAt) {
              const elapsed = (now - tile.bridgingAt) / 1000;
              if (elapsed >= BRIDGE_TIME) {
                changed = true;
                return { ...tile, state: 'bridge' as TileState, bridgingAt: undefined };
              }
            }

            return tile;
          })
        );

        if (changed) {
          set({ grid: newGrid });
        }
      },

      resetGame: () => {
        set(freshState());
      },
    }),
    {
      name: 'hazelnut-farm-save',
      version: SAVE_VERSION,
      migrate: (_persisted, version) => {
        if (version < SAVE_VERSION) {
          return freshState();
        }
        return _persisted as object;
      },
    }
  )
);
