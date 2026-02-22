import type { Tile } from '../store';

export function isTileWalkable(tile: Tile): boolean {
  if (tile.terrain === 'river' && tile.state !== 'bridge') return false;
  return true;
}

export function getAdjacentRiverTiles(
  grid: Tile[][],
  row: number,
  col: number,
): { row: number; col: number; tile: Tile }[] {
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const results: { row: number; col: number; tile: Tile }[] = [];

  for (const [dr, dc] of directions) {
    const r = row + dr;
    const c = col + dc;
    if (r >= 0 && r < grid.length && c >= 0 && c < grid[0].length) {
      const tile = grid[r][c];
      if (tile.terrain === 'river' && tile.state === 'natural') {
        results.push({ row: r, col: c, tile });
      }
    }
  }

  return results;
}
