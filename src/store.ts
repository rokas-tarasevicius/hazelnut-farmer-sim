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
  hasSprinkler?: boolean;
  hasDrone?: boolean;
  droneHarvestingAt?: number;
}

// --- Autonomous drone entities ---
// Each drone is its own object that flies around the map independently.
// "DroneState" is a union type — it can only be one of these three strings.
export type DroneState = 'idle' | 'moving' | 'harvesting';

export interface Drone {
  id: string;               // "drone-0", "drone-1", etc.
  row: number;              // current grid position (can fly over anything)
  col: number;
  state: DroneState;
  targetRow: number | null; // where the drone is heading
  targetCol: number | null;
  harvestingAt: number | null; // timestamp when harvesting started
  lastMoveAt: number;       // timestamp of last movement step (for 500ms cadence)
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
  drones: Drone[];          // autonomous flying drones
  nextDroneId: number;      // counter for generating unique drone IDs
  sprinklerInventory: number;

  plantTree: (row: number, col: number, treeType: string) => void;
  clearForest: (row: number, col: number) => void;
  buyLand: (row: number, col: number) => void;
  buildBridge: (row: number, col: number) => void;
  harvest: (row: number, col: number) => void;
  buyWateringCan: () => void;
  water: (row: number, col: number) => void;
  buyDrone: () => void;
  buySprinkler: () => void;
  cutDownTree: (row: number, col: number) => void;
  placeDrone: (row: number, col: number) => void;
  placeSprinkler: (row: number, col: number) => void;
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
export const SPRINKLER_COST = 75;
export const DRONE_COST = 50;
export const DRONE_HARVEST_TIME = 5; // seconds drone takes to harvest

const SAVE_VERSION = 8;

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
    sprinklerInventory: 0,
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
          droneHarvestingAt: undefined,
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

      buyDrone: () => {
        const state = get();
        if (state.money < DRONE_COST) return;
        set({ money: state.money - DRONE_COST, droneInventory: state.droneInventory + 1 });
      },

      buySprinkler: () => {
        const state = get();
        if (state.money < SPRINKLER_COST) return;
        set({ money: state.money - SPRINKLER_COST, sprinklerInventory: state.sprinklerInventory + 1 });
      },

      placeDrone: (row, col) => {
        const state = get();
        if (state.droneInventory < 1) return;

        const tile = state.grid[row]?.[col];
        if (!tile || !TREE_STATES.has(tile.state) || tile.hasDrone) return;

        const newGrid = state.grid.map((r) => r.map((t) => ({ ...t })));
        newGrid[row][col] = { ...tile, hasDrone: true };

        set({ grid: newGrid, droneInventory: state.droneInventory - 1 });
      },

      placeSprinkler: (row, col) => {
        const state = get();
        if (state.sprinklerInventory < 1) return;

        const tile = state.grid[row]?.[col];
        if (!tile || !TREE_STATES.has(tile.state) || tile.hasSprinkler) return;

        const newGrid = state.grid.map((r) => r.map((t) => ({ ...t })));
        newGrid[row][col] = { ...tile, hasSprinkler: true, isWatered: true };

        set({ grid: newGrid, sprinklerInventory: state.sprinklerInventory - 1 });
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

        // --- Phase 1: Update tiles (growth, sprinklers, bridges) ---
        const newGrid = state.grid.map((r) =>
          r.map((tile) => {
            // Sprinklers keep tree watered automatically
            if (tile.hasSprinkler && TREE_STATES.has(tile.state) && !tile.isWatered) {
              tile = { ...tile, isWatered: true };
              gridChanged = true;
            }

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

<<<<<<< HEAD
        // --- Phase 2: Drone AI ---
        // Each drone autonomously decides what to do every tick.
        // A "claimed" set prevents two drones from targeting the same tree.
        const claimedTiles = new Set<string>();
        let dronesChanged = false;

        // First pass: register tiles already claimed by drones that are moving or harvesting
        for (const drone of state.drones) {
          if (drone.targetRow !== null && drone.targetCol !== null &&
              (drone.state === 'moving' || drone.state === 'harvesting')) {
            claimedTiles.add(`${drone.targetRow}-${drone.targetCol}`);
          }
        }

        // Helper: find the nearest unclaimed harvestable tree to a position
        function findNearestHarvestable(fromRow: number, fromCol: number): { row: number; col: number } | null {
          let best: { row: number; col: number } | null = null;
          let bestDist = Infinity;
          for (let r = 0; r < newGrid.length; r++) {
            for (let c = 0; c < newGrid[r].length; c++) {
              if (newGrid[r][c].state === 'harvestable' && !claimedTiles.has(`${r}-${c}`)) {
                // Manhattan distance — add up horizontal + vertical steps
                const dist = Math.abs(r - fromRow) + Math.abs(c - fromCol);
                if (dist < bestDist) {
                  bestDist = dist;
                  best = { row: r, col: c };
                }
              }
            }
          }
          return best;
        }

        const newDrones = state.drones.map((drone) => {
          // Make a mutable copy of this drone
          let d = { ...drone };

          // If the drone's target tile is no longer harvestable (player grabbed it,
          // tree was cut, etc.), reset drone to idle so it picks a new target.
          if (d.targetRow !== null && d.targetCol !== null) {
            const targetTile = newGrid[d.targetRow]?.[d.targetCol];
            if (!targetTile || targetTile.state !== 'harvestable') {
              // Un-claim the old target
              claimedTiles.delete(`${d.targetRow}-${d.targetCol}`);
              d = { ...d, state: 'idle', targetRow: null, targetCol: null, harvestingAt: null };
              dronesChanged = true;
            }
          }

          // STATE: idle → find a tree to go to
          if (d.state === 'idle') {
            const target = findNearestHarvestable(d.row, d.col);
            if (target) {
              claimedTiles.add(`${target.row}-${target.col}`);
              d = { ...d, state: 'moving', targetRow: target.row, targetCol: target.col, lastMoveAt: now };
              dronesChanged = true;
            }
          }

          // STATE: moving → step toward the target (up to 2 steps per tick for 500ms cadence)
          if (d.state === 'moving' && d.targetRow !== null && d.targetCol !== null) {
            // Capture the target into local variables so TypeScript knows they're not null.
            // (When we reassign `d` inside the loop, TS loses the narrowing from the if-check above.)
            const tRow = d.targetRow;
            const tCol = d.targetCol;

            // Figure out how many steps the drone can take.
            // With a 1-second tick and 500ms per step, a drone can take up to 2 steps.
            const elapsed = now - d.lastMoveAt;
            const steps = Math.min(Math.floor(elapsed / 500), 2);

            for (let i = 0; i < steps; i++) {
              if (d.row === tRow && d.col === tCol) break;

              // Move one tile closer (prefer row first, then column)
              if (d.row < tRow) d = { ...d, row: d.row + 1 };
              else if (d.row > tRow) d = { ...d, row: d.row - 1 };
              else if (d.col < tCol) d = { ...d, col: d.col + 1 };
              else if (d.col > tCol) d = { ...d, col: d.col - 1 };
              dronesChanged = true;
            }

            if (steps > 0) {
              d = { ...d, lastMoveAt: now };
            }

            // Arrived at the target?
            if (d.row === tRow && d.col === tCol) {
              d = { ...d, state: 'harvesting', harvestingAt: now };
              dronesChanged = true;
            }
          }

          // STATE: harvesting → wait DRONE_HARVEST_TIME seconds, then collect
          if (d.state === 'harvesting' && d.harvestingAt !== null &&
              d.targetRow !== null && d.targetCol !== null) {
            if ((now - d.harvestingAt) / 1000 >= DRONE_HARVEST_TIME) {
              const tile = newGrid[d.targetRow]?.[d.targetCol];
              if (tile && tile.state === 'harvestable' && tile.treeType) {
                const species = TREE_SPECIES[tile.treeType];
                if (species) {
                  moneyEarned += species.sellPrice;
                  harvestsGained += 1;
                  // Transition the tile to 'growing' (same as manual harvest)
                  newGrid[d.targetRow][d.targetCol] = {
                    ...tile,
                    state: 'growing' as TileState,
                    lastHarvestedAt: now,
                    isWatered: false,
                  };
                  gridChanged = true;
                }
              }
              // Un-claim and go idle to find the next tree
              claimedTiles.delete(`${d.targetRow}-${d.targetCol}`);
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
