export interface TreeSpecies {
  id: string;
  name: string;
  cost: number;
  growTime: number; // seconds
  sellPrice: number;
  description: string;
  color: string; // fallback color if sprite missing
}

export const TREE_SPECIES: Record<string, TreeSpecies> = {
  common_hazelnut: {
    id: 'common_hazelnut',
    name: 'Common Hazelnut',
    cost: 10,
    growTime: 30,
    sellPrice: 25,
    description: 'Reliable starter tree. Quick to grow.',
    color: '#8B6914',
  },
  turkish_hazelnut: {
    id: 'turkish_hazelnut',
    name: 'Turkish Hazelnut',
    cost: 25,
    growTime: 60,
    sellPrice: 70,
    description: 'Better margins. Worth the wait.',
    color: '#A0522D',
  },
  almond: {
    id: 'almond',
    name: 'Almond',
    cost: 40,
    growTime: 90,
    sellPrice: 120,
    description: 'High value nut. Takes patience.',
    color: '#DEB887',
  },
  walnut: {
    id: 'walnut',
    name: 'Walnut',
    cost: 80,
    growTime: 180,
    sellPrice: 250,
    description: 'Premium tree. Slow but lucrative.',
    color: '#654321',
  },
};

export const GROWTH_STAGES = [
  'sprout',
  'seedling',
  'sapling',
  'young',
  'mature',
  'harvestable',
] as const;
export type GrowthStage = (typeof GROWTH_STAGES)[number];

export function getGrowthStage(plantedAt: number, growTime: number): GrowthStage {
  const elapsed = (Date.now() - plantedAt) / 1000;
  const progress = Math.min(elapsed / growTime, 1);
  if (progress >= 1) return 'harvestable';
  if (progress >= 0.75) return 'mature';
  if (progress >= 0.50) return 'young';
  if (progress >= 0.33) return 'sapling';
  if (progress >= 0.16) return 'seedling';
  return 'sprout';
}

export function getGrowthProgress(plantedAt: number, growTime: number): number {
  const elapsed = (Date.now() - plantedAt) / 1000;
  return Math.min(elapsed / growTime, 1);
}

export function getGrowthStageIndex(stage: GrowthStage): number {
  return GROWTH_STAGES.indexOf(stage) + 1;
}
