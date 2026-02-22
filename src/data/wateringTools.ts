export interface WateringTool {
  id: string;
  name: string;
  cost: number; // purchase price (0 = free/starting)
  maxCharges: number;
  waterDuration: number; // seconds of watered boost per use
  refillRate: number; // charges per second
}

export const WATERING_TOOLS: WateringTool[] = [
  {
    id: 'cup',
    name: 'Cup',
    cost: 0,
    maxCharges: 3,
    waterDuration: 30,
    refillRate: 1 / 30,
  },
  {
    id: 'watering_can',
    name: 'Watering Can',
    cost: 75,
    maxCharges: 8,
    waterDuration: 90,
    refillRate: 1 / 20,
  },
  {
    id: 'garden_hose',
    name: 'Garden Hose',
    cost: 250,
    maxCharges: 20,
    waterDuration: 240,
    refillRate: 1 / 10,
  },
  {
    id: 'sprinkler',
    name: 'Sprinkler',
    cost: 800,
    maxCharges: 50,
    waterDuration: 600,
    refillRate: 1 / 3,
  },
];

export function getToolById(id: string): WateringTool | undefined {
  return WATERING_TOOLS.find((t) => t.id === id);
}

export function getNextTool(currentId: string): WateringTool | undefined {
  const idx = WATERING_TOOLS.findIndex((t) => t.id === currentId);
  return idx >= 0 && idx < WATERING_TOOLS.length - 1 ? WATERING_TOOLS[idx + 1] : undefined;
}
