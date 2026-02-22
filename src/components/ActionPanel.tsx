import { useState, useEffect, useCallback } from 'react';
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
  const show = useGameStore((s) => s.showDialog);
  const playerRow = useGameStore((s) => s.playerRow);
  const playerCol = useGameStore((s) => s.playerCol);
  const grid = useGameStore((s) => s.grid);
  const money = useGameStore((s) => s.money);
  const plantTree = useGameStore((s) => s.plantTree);
  const clearForest = useGameStore((s) => s.clearForest);
  const buyLand = useGameStore((s) => s.buyLand);
  const buildBridge = useGameStore((s) => s.buildBridge);
  const harvest = useGameStore((s) => s.harvest);

  const [selectedIndex, setSelectedIndex] = useState(0);

  const tile = grid[playerRow]?.[playerCol];

  // Build actions list
  let title = '';
  let description = '';
  const actions: Action[] = [];

  if (tile && show) {
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
            ? `Your ${species.name} has ripe nuts.`
            : 'Nuts are ready to pick.';
          actions.push({
            label: 'Harvest Nuts',
            description: `Collect and sell — regrows in ${species?.harvestTime ?? '?'}s`,
            cost: `+$${species?.sellPrice ?? 0}`,
            handler: () => harvest(playerRow, playerCol),
          });
          break;
        }

        case 'planted': {
          const species = tile.treeType ? TREE_SPECIES[tile.treeType] : null;
          const stage = tile.plantedAt && species
            ? getGrowthStage(tile.plantedAt, species.growTime)
            : 'sprout';
          title = `${species?.name ?? 'Tree'} Growing`;
          description = `Stage: ${stage}. First harvest once mature.`;
          break;
        }

        case 'growing': {
          const species = tile.treeType ? TREE_SPECIES[tile.treeType] : null;
          title = `${species?.name ?? 'Tree'}`;
          description = 'Regrowing nuts... Check back soon!';
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
  }

  // Reset selection when dialog opens or actions change
  useEffect(() => {
    setSelectedIndex(0);
  }, [show, playerRow, playerCol]);

  const close = useCallback(() => {
    useGameStore.setState({ showDialog: false });
  }, []);

  useEffect(() => {
    if (!show || actions.length === 0) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) => (prev - 1 + actions.length) % actions.length);
      } else if (e.key === 'ArrowDown' || e.key === 's') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) => (prev + 1) % actions.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        const action = actions[selectedIndex];
        if (action && !action.disabled) {
          action.handler();
          close();
        }
      }
    };

    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  });

  if (!show || !tile) return null;

  return (
    <div className={styles.overlay} onClick={close}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.title}>{title}</div>
        <div className={styles.description}>{description}</div>
        {actions.length > 0 && (
          <div className={styles.actions}>
            {actions.map((action, i) => (
              <button
                key={i}
                className={`${styles.action} ${i === selectedIndex ? styles.selected : ''}`}
                disabled={action.disabled}
                onClick={() => {
                  if (!action.disabled) {
                    action.handler();
                    close();
                  }
                }}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <div className={styles.actionInfo}>
                  <span className={styles.actionLabel}>{action.label}</span>
                  <span className={styles.actionDesc}>{action.description}</span>
                </div>
                {action.cost && <span className={styles.actionCost}>{action.cost}</span>}
              </button>
            ))}
          </div>
        )}
        <div className={styles.hint}>Arrow keys to navigate, Enter to select, Esc to close</div>
      </div>
    </div>
  );
}
