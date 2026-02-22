// 40x30 map template
// Each cell: [terrain, locked]
// Terrain: 'g' = grass, 'f' = forest, 'r' = river
// Locked: 0 = unlocked, 1 = locked

type CellDef = [terrain: 'g' | 'f' | 'r', locked: 0 | 1];

// Helper shortcuts used in buildMap
const g1: CellDef = ['g', 1];
const f1: CellDef = ['f', 1];
const rv: CellDef = ['r', 0];

// 30 rows x 40 cols
export const MAP_ROWS = 30;
export const MAP_COLS = 40;

export const MAP_TEMPLATE: CellDef[][] = buildMap();

function buildMap(): CellDef[][] {
  // Start with everything locked grass
  const map: CellDef[][] = Array.from({ length: MAP_ROWS }, () =>
    Array.from({ length: MAP_COLS }, () => [...g1] as CellDef)
  );

  // Place forests (locked) scattered across the map
  const forestPatches: [r: number, c: number, w: number, h: number][] = [
    // Starting region forests
    [10, 4, 2, 3],
    [14, 2, 3, 2],
    // Region 2 (east of first river) forests
    [8, 15, 3, 2],
    [12, 18, 2, 3],
    [16, 14, 2, 2],
    // Region 3 (south of second river) forests
    [22, 5, 3, 2],
    [24, 10, 2, 3],
    [23, 2, 2, 2],
    // Region 4 (far east) forests
    [6, 28, 3, 3],
    [10, 30, 2, 2],
    [14, 27, 2, 3],
    [18, 32, 3, 2],
    // Region 5 (far south-east) forests
    [22, 28, 2, 3],
    [25, 32, 3, 2],
    [24, 25, 2, 2],
    // Extra forests
    [3, 3, 2, 2],
    [4, 8, 2, 2],
    [17, 8, 2, 2],
  ];

  for (const [r, c, w, h] of forestPatches) {
    for (let dr = 0; dr < h; dr++) {
      for (let dc = 0; dc < w; dc++) {
        if (r + dr < MAP_ROWS && c + dc < MAP_COLS) {
          map[r + dr][c + dc] = [...f1];
        }
      }
    }
  }

  // River 1: vertical river from top to row ~20 at col 11-12
  // Separates starting region (west) from region 2 (east)
  for (let r = 0; r < 21; r++) {
    map[r][11] = [...rv];
    if (r < 18) map[r][12] = [...rv]; // slightly narrower at bottom
  }
  // River curves east at bottom
  map[20][12] = [...rv];
  map[20][13] = [...rv];

  // River 2: horizontal river from col 0 to col ~25 at row 19-20
  // Separates northern regions from southern regions
  for (let c = 0; c < 24; c++) {
    map[19][c] = [...rv];
    if (c > 3 && c < 20) map[20][c] = [...rv]; // narrower at edges
  }

  // River 3: vertical river at col 24-25, from row 0 down to row 30
  // Separates western regions from far-east regions
  for (let r = 0; r < MAP_ROWS; r++) {
    map[r][24] = [...rv];
    if (r > 5 && r < 25) map[r][25] = [...rv];
  }

  // Starting region: ~6x5 unlocked area around (12, 5)
  for (let r = 10; r < 16; r++) {
    for (let c = 3; c < 10; c++) {
      if (map[r][c][0] !== 'r') {
        // Keep forest terrain but make unlocked, grass stays grass but unlocked
        map[r][c] = [map[r][c][0], 0] as CellDef;
      }
    }
  }

  return map;
}

export function getTerrainType(code: 'g' | 'f' | 'r'): 'grass' | 'forest' | 'river' {
  switch (code) {
    case 'g': return 'grass';
    case 'f': return 'forest';
    case 'r': return 'river';
  }
}
