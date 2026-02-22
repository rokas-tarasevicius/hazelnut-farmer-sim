export interface TreeSpecies {
  id: string;
  name: string;
  cost: number;
  growTime: number; // seconds — initial growth to maturity
  harvestTime: number; // seconds — time to regrow nuts after harvest
  sellPrice: number; // per harvest
  description: string;
  color: string; // fallback color if sprite missing
}

export const TREE_SPECIES: Record<string, TreeSpecies> = {
  common_hazelnut: {
    id: 'common_hazelnut',
    name: 'Common Hazelnut',
    cost: 30,
    growTime: 60,
    harvestTime: 20,
    sellPrice: 8,
    description: 'Cheap to plant, quick nut cycles.',
    color: '#8B6914',
  },
  turkish_hazelnut: {
    id: 'turkish_hazelnut',
    name: 'Turkish Hazelnut',
    cost: 75,
    growTime: 120,
    harvestTime: 35,
    sellPrice: 18,
    description: 'Better yield per harvest.',
    color: '#A0522D',
  },
  almond: {
    id: 'almond',
    name: 'Almond',
    cost: 150,
    growTime: 180,
    harvestTime: 50,
    sellPrice: 30,
    description: 'Premium nuts. Steady income.',
    color: '#DEB887',
  },
  walnut: {
    id: 'walnut',
    name: 'Walnut',
    cost: 300,
    growTime: 300,
    harvestTime: 75,
    sellPrice: 55,
    description: 'Expensive investment. Best long-term.',
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
