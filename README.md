# Hazelnut Farmer Simulator

A tile-based farming simulator where you plant nut trees, harvest them for profit, expand your land, clear forests, and build bridges across rivers.

**Play now:** [hazelnut-farmer-sim.vercel.app](https://hazelnut-farmer-sim.vercel.app/)

## How to play

- **Move** with arrow keys or WASD
- **Press Enter** to open the action menu on the tile you're standing on
- **Plant trees**, wait for them to grow, then **harvest** nuts for money
- **Buy land** to expand your farm, **clear forests** for planting space, and **build bridges** to cross rivers
- Progress is saved automatically in your browser

## Tree species

| Tree | Cost | Growth time | Harvest value |
|------|------|-------------|---------------|
| Common Hazelnut | $30 | 60s | $20 |
| Turkish Hazelnut | $75 | 120s | $50 |
| Almond | $150 | 180s | $100 |
| Walnut | $300 | 300s | $200 |

## Development

### Prerequisites

- Node.js 18+
- npm

### Getting started

```bash
npm install
npm run dev
```

### Scripts

```bash
npm run dev          # Start dev server with hot reload
npm run build        # Type-check and build for production
npm run preview      # Preview production build locally
npm run lint         # Run ESLint
npm run test         # Run tests once
npm run test:watch   # Run tests in watch mode
```

### Tech stack

- **React 19** + **TypeScript** (strict mode)
- **Vite** for bundling and dev server
- **Zustand** for state management with localStorage persistence
- **CSS Modules** for scoped styling
- **Vitest** + **Testing Library** for tests
