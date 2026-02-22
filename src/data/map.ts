import type { Tile } from '../store';

export function isTileWalkable(tile: Tile): boolean {
  if (tile.locked) return false;
  if (tile.terrain === 'river' && tile.state !== 'bridge') return false;
  return true;
}
