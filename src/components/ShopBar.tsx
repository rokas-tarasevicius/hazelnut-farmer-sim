import { useGameStore, WATERING_CAN_COST, WATERING_DRONE_COST, DRONE_COST } from '../store';
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
  isSprite?: boolean;
}

export function ShopBar() {
  const money = useGameStore((s) => s.money);
  const hasWateringCan = useGameStore((s) => s.hasWateringCan);
  const harvestDroneCount = useGameStore((s) => s.drones.filter((d) => d.type === 'harvest').length);
  const waterDroneCount = useGameStore((s) => s.drones.filter((d) => d.type === 'water').length);
  const buyWateringCan = useGameStore((s) => s.buyWateringCan);
  const buyDrone = useGameStore((s) => s.buyDrone);
  const buyWateringDrone = useGameStore((s) => s.buyWateringDrone);

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
      id: 'watering-drone',
      icon: '/sprites/drone_water.svg',
      name: 'Watering Drone',
      description: 'Auto-waters a tree each grow cycle',
      cost: WATERING_DRONE_COST,
      badge: waterDroneCount > 0 ? waterDroneCount : undefined,
      disabled: money < WATERING_DRONE_COST,
      onBuy: buyWateringDrone,
      isSprite: true,
    },
    {
      id: 'drone',
      icon: '/sprites/drone_harvest.svg',
      name: 'Harvest Drone',
      description: 'Autonomous harvester — flies to trees',
      cost: DRONE_COST,
      badge: harvestDroneCount > 0 ? harvestDroneCount : undefined,
      disabled: money < DRONE_COST,
      onBuy: buyDrone,
      isSprite: true,
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
              {item.isSprite
                ? <img src={item.icon} alt={item.name} className={styles.iconSprite} />
                : <span className={styles.icon}>{item.icon}</span>}
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
      <div className={styles.tip}>Both drones fly autonomously tree to tree!</div>
    </div>
  );
}
