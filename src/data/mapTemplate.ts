// Procedural map generator with seeded randomness
// Produces a different map each time based on seed

export type CellDef = [terrain: 'g' | 'f' | 'r', locked: 0 | 1];

export const MAP_ROWS = 20;
export const MAP_COLS = 25;

// Simple seeded PRNG (mulberry32)
function createRng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateMap(seed: number): CellDef[][] {
  const rng = createRng(seed);
  const g1: CellDef = ['g', 1];

  // Start with all locked grass
  const map: CellDef[][] = Array.from({ length: MAP_ROWS }, () =>
    Array.from({ length: MAP_COLS }, () => [...g1] as CellDef)
  );

  // --- Place diagonal rivers ---
  // River 1: diagonal from upper-left area to lower-right, separating start region
  const river1StartCol = 7 + Math.floor(rng() * 3); // col 7-9
  const river1Slope = 0.4 + rng() * 0.4; // gentle diagonal
  const river1Dir = rng() > 0.5 ? 1 : -1; // left-leaning or right-leaning

  for (let r = 0; r < MAP_ROWS; r++) {
    const baseCol = river1StartCol + Math.floor((r - MAP_ROWS / 2) * river1Slope * river1Dir);
    const col = Math.max(0, Math.min(MAP_COLS - 1, baseCol));
    if (col >= 0 && col < MAP_COLS) {
      map[r][col] = ['r', 0];
      // Add width variation
      if (rng() > 0.4 && col + 1 < MAP_COLS) {
        map[r][col + 1] = ['r', 0];
      }
    }
  }

  // River 2: roughly horizontal/diagonal, crossing the map
  const river2StartRow = 12 + Math.floor(rng() * 4); // row 12-15
  const river2Slope = 0.2 + rng() * 0.3;
  const river2Dir = rng() > 0.5 ? 1 : -1;

  for (let c = 0; c < MAP_COLS; c++) {
    const baseRow = river2StartRow + Math.floor((c - MAP_COLS / 2) * river2Slope * river2Dir);
    const row = Math.max(0, Math.min(MAP_ROWS - 1, baseRow));
    if (row >= 0 && row < MAP_ROWS) {
      map[row][c] = ['r', 0];
      if (rng() > 0.5 && row + 1 < MAP_ROWS) {
        map[row + 1][c] = ['r', 0];
      }
    }
  }

  // --- Scatter forest patches ---
  const numForests = 12 + Math.floor(rng() * 8);
  for (let i = 0; i < numForests; i++) {
    const fr = Math.floor(rng() * MAP_ROWS);
    const fc = Math.floor(rng() * MAP_COLS);
    const fw = 1 + Math.floor(rng() * 3);
    const fh = 1 + Math.floor(rng() * 3);
    for (let dr = 0; dr < fh; dr++) {
      for (let dc = 0; dc < fw; dc++) {
        const rr = fr + dr;
        const cc = fc + dc;
        if (rr < MAP_ROWS && cc < MAP_COLS && map[rr][cc][0] !== 'r') {
          map[rr][cc] = ['f', 1];
        }
      }
    }
  }

  // --- Starting region: ~5x5 unlocked area near center-left ---
  const startRow = Math.floor(MAP_ROWS / 2) - 2;
  const startCol = 2;
  for (let r = startRow; r < startRow + 5 && r < MAP_ROWS; r++) {
    for (let c = startCol; c < startCol + 6 && c < MAP_COLS; c++) {
      if (map[r][c][0] !== 'r') {
        map[r][c] = [map[r][c][0], 0];
      }
    }
  }

  return map;
}

export function getPlayerStart(): { row: number; col: number } {
  return { row: Math.floor(MAP_ROWS / 2), col: 4 };
}

export function getTerrainType(code: 'g' | 'f' | 'r'): 'grass' | 'forest' | 'river' {
  switch (code) {
    case 'g': return 'grass';
    case 'f': return 'forest';
    case 'r': return 'river';
  }
}
