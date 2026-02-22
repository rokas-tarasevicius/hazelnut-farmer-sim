import type { GrowthStage } from './trees';
import { getGrowthStageIndex } from './trees';

export function getTreeSpritePath(speciesId: string, stage: GrowthStage): string {
  const stageNum = getGrowthStageIndex(stage);
  return `/sprites/trees/${speciesId}/stage${stageNum}.svg`;
}

export function getTerrainSpritePath(terrain: string): string {
  return `/sprites/${terrain}.svg`;
}
