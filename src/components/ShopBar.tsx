import { useGameStore, WATERING_CAN_COST, SPRINKLER_COST, DRONE_COST } from '../store';
import styles from '../styles/ShopBar.module.css';

interface ShopItem {
  id: string;
  icon: string;
  name: string;
  description: string;
  cost: number;
  badge?: string | number;
  owned?: boolean;
  disabled: boolean;
  onBuy: () => void;
}

export function ShopBar() {
  const money = useGameStore((s) => s.money);
  const hasWateringCan = useGameStore((s) => s.hasWateringCan);
  const droneCount = useGameStore((s) => s.drones.length);
  const sprinklerInventory = useGameStore((s) => s.sprinklerInventory);
  const buyWateringCan = useGameStore((s) => s.buyWateringCan);
  const buyDrone = useGameStore((s) => s.buyDrone);
  const buySprinkler = useGameStore((s) => s.buySprinkler);

  const items: ShopItem[] = [
    {
      id: 'watering-can',
      icon: '💧',
      name: 'Watering Can',
      description: 'Waters trees to double growth speed',
      cost: WATERING_CAN_COST,
      owned: hasWateringCan,
      disabled: hasWateringCan || money < WATERING_CAN_COST,
      onBuy: buyWateringCan,
    },
    {
      id: 'sprinkler',
      icon: '🚿',
      name: 'Sprinkler',
      description: 'Auto-waters a tree tile permanently',
      cost: SPRINKLER_COST,
      badge: sprinklerInventory > 0 ? sprinklerInventory : undefined,
      disabled: money < SPRINKLER_COST,
      onBuy: buySprinkler,
    },
    {
      id: 'drone',
      icon: '🤖',
      name: 'Drone',
      description: 'Autonomous harvester — flies to trees',
      cost: DRONE_COST,
      badge: droneCount > 0 ? droneCount : undefined,
      disabled: money < DRONE_COST,
      onBuy: buyDrone,
    },
  ];

  return (
    <div className={styles.shopBar}>
      <div className={styles.header}>Shop</div>
      <div className={styles.items}>
        {items.map((item) => (
          <button
            key={item.id}
            className={`${styles.item} ${item.owned ? styles.owned : ''}`}
            disabled={item.disabled}
            onClick={item.onBuy}
            title={item.description}
          >
            <div className={styles.iconWrap}>
              <span className={styles.icon}>{item.icon}</span>
              {item.badge !== undefined && (
                <span className={styles.badge}>{item.badge}</span>
              )}
              {item.owned && (
                <span className={styles.ownedMark}>✓</span>
              )}
            </div>
            <div className={styles.itemName}>{item.name}</div>
            <div className={styles.itemDesc}>{item.description}</div>
            <div className={styles.itemCost}>
              {item.owned ? 'Owned' : `$${item.cost}`}
            </div>
          </button>
        ))}
      </div>
      <div className={styles.tip}>Drones are autonomous! Sprinklers: place on trees via interact (Enter)</div>
    </div>
  );
}
