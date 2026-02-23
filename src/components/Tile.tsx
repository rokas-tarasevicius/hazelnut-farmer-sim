import { memo } from 'react';
import type { Tile as TileData } from '../store';
import { getGrowthProgress, getGrowthStage, TREE_SPECIES } from '../data/trees';
import { getTreeSpritePath } from '../data/sprites';
import styles from '../styles/Tile.module.css';

interface TileProps {
  tile: TileData;
  row: number;
  col: number;
  isPlayerHere?: boolean;
}

const TERRAIN_SPRITES: Record<string, string> = {
  grass: '/sprites/grass.svg',
  forest: '/sprites/forest.svg',
  river: '/sprites/river.svg',
};

const STATE_SPRITES: Record<string, string> = {
  clearing: '/sprites/clearing.svg',
  bridge: '/sprites/bridge.svg',
};

function getSpriteUrl(tile: TileData): string | undefined {
  if (tile.locked) return '/sprites/locked.svg';

  if (tile.state === 'planted' && tile.treeType && tile.plantedAt) {
    const species = TREE_SPECIES[tile.treeType];
    if (species) {
      const stage = getGrowthStage(tile.plantedAt, species.growTime);
      return getTreeSpritePath(tile.treeType, stage);
    }
  }

  if (tile.state === 'growing' && tile.treeType) {
    return getTreeSpritePath(tile.treeType, 'mature');
  }

  if (tile.state === 'harvestable' && tile.treeType) {
    return getTreeSpritePath(tile.treeType, 'harvestable');
  }
  if (tile.state === 'clearing') return STATE_SPRITES.clearing;
  if (tile.state === 'bridge') return STATE_SPRITES.bridge;
  if (tile.state === 'bridging') return TERRAIN_SPRITES.river;
  if (tile.state === 'empty') return TERRAIN_SPRITES.grass;

  return TERRAIN_SPRITES[tile.terrain];
}

export const Tile = memo(function Tile({ tile, isPlayerHere }: TileProps) {
  const spriteUrl = getSpriteUrl(tile);
  let progress: number | undefined;

  if (tile.state === 'planted' && tile.treeType && tile.plantedAt) {
    const species = TREE_SPECIES[tile.treeType];
    if (species) {
      progress = getGrowthProgress(tile.plantedAt, species.growTime);
    }
  } else if (tile.state === 'growing' && tile.treeType && tile.lastHarvestedAt) {
    const species = TREE_SPECIES[tile.treeType];
    if (species) {
      const elapsed = (Date.now() - tile.lastHarvestedAt) / 1000;
      progress = Math.min(elapsed / species.harvestTime, 1);
    }
  } else if (tile.state === 'clearing' && tile.clearingAt) {
    progress = Math.min((Date.now() - tile.clearingAt) / (10 * 1000), 1);
  } else if (tile.state === 'bridging' && tile.bridgingAt) {
    progress = Math.min((Date.now() - tile.bridgingAt) / (20 * 1000), 1);
  }

  const stateClass = tile.locked ? styles.locked :
    (tile.state === 'bridging' ? styles.clearing :
      styles[tile.state]) || '';
  const highlightClass = isPlayerHere ? styles.playerHighlight : '';

  return (
    <div className={`${styles.tile} ${stateClass} ${highlightClass}`}>
      {spriteUrl && (
        <img src={spriteUrl} alt={tile.state} className={styles.sprite} />
      )}
      {tile.isWatered && (
        <div className={styles.waterParticles}>
          <div className={styles.p} style={{ left: '18%', top: '68%', animationDelay: '0.0s', width: '3px', height: '3px' }} />
          <div className={styles.p} style={{ left: '48%', top: '72%', animationDelay: '0.6s', width: '2px', height: '2px' }} />
          <div className={styles.p} style={{ left: '72%', top: '60%', animationDelay: '1.1s', width: '3px', height: '3px' }} />
          <div className={styles.p} style={{ left: '30%', top: '55%', animationDelay: '1.6s', width: '2px', height: '2px' }} />
          <div className={styles.p} style={{ left: '62%', top: '75%', animationDelay: '0.3s', width: '2px', height: '2px' }} />
          <div className={styles.p} style={{ left: '82%', top: '50%', animationDelay: '1.3s', width: '3px', height: '3px' }} />
        </div>
      )}
      {progress !== undefined && progress < 1 && (
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}
    </div>
  );
});
