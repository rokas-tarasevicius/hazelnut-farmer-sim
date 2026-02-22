import { useEffect } from 'react';
import { useGameStore, getLandPrice, CLEAR_COST, BRIDGE_COST } from '../store';
import { TREE_SPECIES, getGrowthStage } from '../data/trees';
import styles from '../styles/ActionPanel.module.css';

interface Action {
  label: string;
  description: string;
  cost?: string;
  disabled?: boolean;
  handler: () => void;
}

export function ActionPanel() {
  const show = useGameStore((s) => s.showActionPanel);
  const playerRow = useGameStore((s) => s.playerRow);
  const playerCol = useGameStore((s) => s.playerCol);
  const grid = useGameStore((s) => s.grid);
  const money = useGameStore((s) => s.money);
  const plantTree = useGameStore((s) => s.plantTree);
  const clearForest = useGameStore((s) => s.clearForest);
  const buyLand = useGameStore((s) => s.buyLand);
  const buildBridge = useGameStore((s) => s.buildBridge);
  const harvest = useGameStore((s) => s.harvest);

  const tile = grid[playerRow]?.[playerCol];

  useEffect(() => {
    if (!show) return;

    const handleKey = (e: KeyboardEvent) => {
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) {
        e.preventDefault();
        const idx = num - 1;
        if (actions[idx] && !actions[idx].disabled) {
          actions[idx].handler();
          useGameStore.setState({ showActionPanel: false });
        }
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  if (!show || !tile) return null;

  let title = '';
  let description = '';
  const actions: Action[] = [];

  if (tile.locked) {
    const price = getLandPrice(playerRow, playerCol);
    title = 'Locked Land';
    description = 'Purchase this plot to expand your farm.';
    actions.push({
      label: 'Buy Plot',
      description: 'Unlock this land',
      cost: `$${price}`,
      disabled: money < price,
      handler: () => buyLand(playerRow, playerCol),
    });
  } else {
    switch (tile.state) {
      case 'empty':
        title = 'Empty Plot';
        description = 'Choose a species to plant.';
        Object.values(TREE_SPECIES).forEach((species) => {
          actions.push({
            label: species.name,
            description: `${species.description} (${species.growTime}s)`,
            cost: `$${species.cost}`,
            disabled: money < species.cost,
            handler: () => plantTree(playerRow, playerCol, species.id),
          });
        });
        break;

      case 'natural':
        if (tile.terrain === 'forest') {
          title = 'Dense Forest';
          description = 'Clear it to make room for planting.';
          actions.push({
            label: 'Clear Forest',
            description: 'Takes 10 seconds',
            cost: `$${CLEAR_COST}`,
            disabled: money < CLEAR_COST,
            handler: () => clearForest(playerRow, playerCol),
          });
        } else if (tile.terrain === 'river') {
          title = 'River';
          description = 'Build a bridge to cross.';
          actions.push({
            label: 'Build Bridge',
            description: 'Takes 20 seconds',
            cost: `$${BRIDGE_COST}`,
            disabled: money < BRIDGE_COST,
            handler: () => buildBridge(playerRow, playerCol),
          });
        } else {
          title = 'Grass';
          description = 'Nothing to do here.';
        }
        break;

      case 'harvestable': {
        const species = tile.treeType ? TREE_SPECIES[tile.treeType] : null;
        title = 'Ready to Harvest!';
        description = species
          ? `Your ${species.name} is ready.`
          : 'This tree is ready.';
        actions.push({
          label: 'Harvest',
          description: 'Collect and sell',
          cost: `+$${species?.sellPrice ?? 0}`,
          handler: () => harvest(playerRow, playerCol),
        });
        break;
      }

      case 'planted': {
        const species = tile.treeType ? TREE_SPECIES[tile.treeType] : null;
        const stage = tile.plantedAt && species
          ? getGrowthStage(tile.plantedAt, species.growTime)
          : 'seedling';
        title = `${species?.name ?? 'Tree'} Growing`;
        description = `Stage: ${stage}. Check back soon!`;
        break;
      }

      case 'clearing':
        title = 'Clearing in Progress';
        description = 'Workers are clearing this forest...';
        break;

      case 'bridging':
        title = 'Bridge Under Construction';
        description = 'Workers are building a bridge...';
        break;

      case 'bridge':
        title = 'Bridge';
        description = 'A sturdy bridge crosses the river.';
        break;
    }
  }

  const close = () => useGameStore.setState({ showActionPanel: false });

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>{title}</span>
        <button className={styles.closeBtn} onClick={close}>
          Esc
        </button>
      </div>
      <div className={styles.description}>{description}</div>
      {actions.length > 0 && (
        <div className={styles.actions}>
          {actions.map((action, i) => (
            <button
              key={i}
              className={styles.action}
              disabled={action.disabled}
              onClick={() => {
                action.handler();
                close();
              }}
            >
              <span className={styles.actionKey}>{i + 1}</span>
              <div className={styles.actionInfo}>
                <span className={styles.actionLabel}>{action.label}</span>
                <span className={styles.actionDesc}>{action.description}</span>
              </div>
              {action.cost && <span className={styles.actionCost}>{action.cost}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
