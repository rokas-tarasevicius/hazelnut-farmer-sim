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
  isWatered?: boolean;
}

// --- Autonomous drone entities ---
// Each drone is its own object that flies around the map independently.
// "DroneState" is a union type — it can only be one of these three strings.
export type DroneState = 'idle' | 'moving' | 'harvesting';

export interface Drone {
  id: string;               // "drone-0", "drone-1", etc.
  type: 'harvest' | 'water';
  row: number;              // current grid position (can fly over anything)
  col: number;
  state: DroneState;
  targetRow: number | null; // where the drone is heading
  targetCol: number | null;
  harvestingAt: number | null; // timestamp when harvesting/watering started
  lastMoveAt: number;       // timestamp of last movement step
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
  drones: Drone[];          // autonomous flying drones (harvest + water)
  nextDroneId: number;      // counter for generating unique drone IDs

  plantTree: (row: number, col: number, treeType: string) => void;
  clearForest: (row: number, col: number) => void;
  buyLand: (row: number, col: number) => void;
  buildBridge: (row: number, col: number) => void;
  harvest: (row: number, col: number) => void;
  buyWateringCan: () => void;
  water: (row: number, col: number) => void;
  buyDrone: () => void;
  buyWateringDrone: () => void;
  cutDownTree: (row: number, col: number) => void;
  movePlayer: (direction: Direction) => void;
  toggleDialog: () => void;
  tick: () => void;
  resetGame: () => void;
}

export const CLEAR_COST = 15;
export const CLEAR_TIME = 10;
export const BRIDGE_COST = 100;
export const BRIDGE_TIME = 20;
export const CUT_DOWN_COST = 20;
export const WATERING_CAN_COST = 40;
export const WATERING_DRONE_COST = 60;
export const DRONE_COST = 50;
export const DRONE_HARVEST_TIME = 2; // seconds drone takes to harvest/water

const SAVE_VERSION = 10;

const TREE_STATES = new Set<TileState>(['planted', 'growing', 'harvestable']);

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
    drones: [],
    nextDroneId: 0,
  };
}

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
        newGrid[row][col] = { ...tile, state: 'clearing', clearingAt: Date.now() };

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
          isWatered: false,
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
        if (!tile || !TREE_STATES.has(tile.state) || tile.isWatered) return;

        const newGrid = state.grid.map((r) => r.map((t) => ({ ...t })));
        newGrid[row][col] = { ...tile, isWatered: true };

        set({ grid: newGrid });
      },

      buyDrone: () => {
        const state = get();
        if (state.money < DRONE_COST) return;
        const newDrone: Drone = {
          id: `drone-${state.nextDroneId}`,
          type: 'harvest',
          row: state.playerRow,
          col: state.playerCol,
          state: 'idle',
          targetRow: null,
          targetCol: null,
          harvestingAt: null,
          lastMoveAt: Date.now(),
        };
        set({
          money: state.money - DRONE_COST,
          drones: [...state.drones, newDrone],
          nextDroneId: state.nextDroneId + 1,
        });
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

      buyWateringDrone: () => {
        const state = get();
        if (state.money < WATERING_DRONE_COST) return;
        const newDrone: Drone = {
          id: `drone-${state.nextDroneId}`,
          type: 'water',
          row: state.playerRow,
          col: state.playerCol,
          state: 'idle',
          targetRow: null,
          targetCol: null,
          harvestingAt: null,
          lastMoveAt: Date.now(),
        };
        set({
          money: state.money - WATERING_DRONE_COST,
          drones: [...state.drones, newDrone],
          nextDroneId: state.nextDroneId + 1,
        });
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
        let gridChanged = false;
        let moneyEarned = 0;
        let harvestsGained = 0;

        // --- Phase 1: Update tiles (growth, bridges) ---
        const newGrid = state.grid.map((r) =>
          r.map((tile) => {
            // Watering speed boost: advance timers by an extra second each tick
            if (tile.isWatered) {
              if (tile.state === 'planted' && tile.plantedAt) {
                tile = { ...tile, plantedAt: tile.plantedAt - 1000 };
                gridChanged = true;
              } else if (tile.state === 'growing' && tile.lastHarvestedAt) {
                tile = { ...tile, lastHarvestedAt: tile.lastHarvestedAt - 1000 };
                gridChanged = true;
              }
            }

            // Check clearing completion
            if (tile.state === 'clearing' && tile.clearingAt) {
              if ((now - tile.clearingAt) / 1000 >= CLEAR_TIME) {
                gridChanged = true;
                tile = { ...tile, state: 'empty' as TileState, clearingAt: undefined };
              }
            }

            // Check initial growth (planted → harvestable)
            if (tile.state === 'planted' && tile.treeType && tile.plantedAt) {
              const species = TREE_SPECIES[tile.treeType];
              if (species && (now - tile.plantedAt) / 1000 >= species.growTime) {
                gridChanged = true;
                tile = { ...tile, state: 'harvestable' as TileState, isWatered: false };
              }
            }

            // Check nut regrowth (growing → harvestable)
            if (tile.state === 'growing' && tile.treeType && tile.lastHarvestedAt) {
              const species = TREE_SPECIES[tile.treeType];
              if (species && (now - tile.lastHarvestedAt) / 1000 >= species.harvestTime) {
                gridChanged = true;
                tile = { ...tile, state: 'harvestable' as TileState, lastHarvestedAt: undefined, isWatered: false };
              }
            }

            // Check bridge completion
            if (tile.state === 'bridging' && tile.bridgingAt) {
              if ((now - tile.bridgingAt) / 1000 >= BRIDGE_TIME) {
                gridChanged = true;
                return { ...tile, state: 'bridge' as TileState, bridgingAt: undefined };
              }
            }

            return tile;
          })
        );

        // --- Phase 2: Drone AI ---
        // Separate claimed sets prevent two drones of the same type targeting the same tile.
        const claimedHarvestTiles = new Set<string>();
        const claimedWaterTiles = new Set<string>();
        let dronesChanged = false;

        // First pass: register already-claimed tiles
        for (const drone of state.drones) {
          if (drone.targetRow !== null && drone.targetCol !== null &&
              (drone.state === 'moving' || drone.state === 'harvesting')) {
            if (drone.type === 'harvest') claimedHarvestTiles.add(`${drone.targetRow}-${drone.targetCol}`);
            else claimedWaterTiles.add(`${drone.targetRow}-${drone.targetCol}`);
          }
        }

        function findNearestHarvestable(fromRow: number, fromCol: number): { row: number; col: number } | null {
          let best: { row: number; col: number } | null = null;
          let bestDist = Infinity;
          for (let r = 0; r < newGrid.length; r++) {
            for (let c = 0; c < newGrid[r].length; c++) {
              if (newGrid[r][c].state === 'harvestable' && !claimedHarvestTiles.has(`${r}-${c}`)) {
                const dist = Math.abs(r - fromRow) + Math.abs(c - fromCol);
                if (dist < bestDist) { bestDist = dist; best = { row: r, col: c }; }
              }
            }
          }
          return best;
        }

        function findNearestUnwatered(fromRow: number, fromCol: number): { row: number; col: number } | null {
          let best: { row: number; col: number } | null = null;
          let bestDist = Infinity;
          for (let r = 0; r < newGrid.length; r++) {
            for (let c = 0; c < newGrid[r].length; c++) {
              const t = newGrid[r][c];
              if ((t.state === 'planted' || t.state === 'growing') && !t.isWatered && !claimedWaterTiles.has(`${r}-${c}`)) {
                const dist = Math.abs(r - fromRow) + Math.abs(c - fromCol);
                if (dist < bestDist) { bestDist = dist; best = { row: r, col: c }; }
              }
            }
          }
          return best;
        }

        const newDrones = state.drones.map((drone) => {
          let d = { ...drone };
          const claimed = d.type === 'harvest' ? claimedHarvestTiles : claimedWaterTiles;

          // If the target is no longer valid, go idle
          if (d.targetRow !== null && d.targetCol !== null) {
            const targetTile = newGrid[d.targetRow]?.[d.targetCol];
            const valid = d.type === 'harvest'
              ? targetTile?.state === 'harvestable'
              : (targetTile?.state === 'planted' || targetTile?.state === 'growing') && !targetTile.isWatered;
            if (!valid) {
              claimed.delete(`${d.targetRow}-${d.targetCol}`);
              d = { ...d, state: 'idle', targetRow: null, targetCol: null, harvestingAt: null };
              dronesChanged = true;
            }
          }

          // STATE: idle → find a target
          if (d.state === 'idle') {
            const target = d.type === 'harvest'
              ? findNearestHarvestable(d.row, d.col)
              : findNearestUnwatered(d.row, d.col);
            if (target) {
              claimed.add(`${target.row}-${target.col}`);
              d = { ...d, state: 'moving', targetRow: target.row, targetCol: target.col, lastMoveAt: now };
              dronesChanged = true;
            }
          }

          // STATE: moving → step toward target (up to 4 steps per tick at 250ms cadence)
          if (d.state === 'moving' && d.targetRow !== null && d.targetCol !== null) {
            const tRow = d.targetRow;
            const tCol = d.targetCol;
            const steps = Math.min(Math.floor((now - d.lastMoveAt) / 250), 4);

            for (let i = 0; i < steps; i++) {
              if (d.row === tRow && d.col === tCol) break;
              if (d.row < tRow) d = { ...d, row: d.row + 1 };
              else if (d.row > tRow) d = { ...d, row: d.row - 1 };
              else if (d.col < tCol) d = { ...d, col: d.col + 1 };
              else if (d.col > tCol) d = { ...d, col: d.col - 1 };
              dronesChanged = true;
            }
            if (steps > 0) d = { ...d, lastMoveAt: now };

            if (d.row === tRow && d.col === tCol) {
              d = { ...d, state: 'harvesting', harvestingAt: now };
              dronesChanged = true;
            }
          }

          // STATE: harvesting → complete task after DRONE_HARVEST_TIME seconds
          if (d.state === 'harvesting' && d.harvestingAt !== null &&
              d.targetRow !== null && d.targetCol !== null) {
            if ((now - d.harvestingAt) / 1000 >= DRONE_HARVEST_TIME) {
              const tile = newGrid[d.targetRow]?.[d.targetCol];
              if (d.type === 'harvest') {
                if (tile && tile.state === 'harvestable' && tile.treeType) {
                  const species = TREE_SPECIES[tile.treeType];
                  if (species) {
                    moneyEarned += species.sellPrice;
                    harvestsGained += 1;
                    newGrid[d.targetRow][d.targetCol] = {
                      ...tile, state: 'growing' as TileState, lastHarvestedAt: now, isWatered: false,
                    };
                    gridChanged = true;
                  }
                }
              } else {
                // water drone — set isWatered on the tile
                if (tile && (tile.state === 'planted' || tile.state === 'growing') && !tile.isWatered) {
                  newGrid[d.targetRow][d.targetCol] = { ...tile, isWatered: true };
                  gridChanged = true;
                }
              }
              claimed.delete(`${d.targetRow}-${d.targetCol}`);
              d = { ...d, state: 'idle', targetRow: null, targetCol: null, harvestingAt: null };
              dronesChanged = true;
            }
          }

          return d;
        });

        // Only update state if something actually changed
        if (gridChanged || dronesChanged) {
          const updates: Partial<GameState> = {};
          if (gridChanged) updates.grid = newGrid;
          if (dronesChanged) updates.drones = newDrones;
          updates.money = state.money + moneyEarned;
          updates.totalHarvests = state.totalHarvests + harvestsGained;
          set(updates);
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
