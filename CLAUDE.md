# CLAUDE.md — Hazelnut Farmer Simulator

## About this project

This is a tile-based farming simulator built with React, TypeScript, and Vite.
The player walks around a procedurally generated map, plants hazelnut (and other nut) trees,
harvests them for money, expands their land, clears forests, and builds bridges across rivers.

## Who is building this

The main developer is a **7th grader learning to code**. When making changes or explaining
decisions, keep these things in mind:

- **Teach as you go.** When you write or change code, explain _why_ — not just what the code
  does, but the reasoning behind the approach. Think of it as a mini lesson each time.
- **Use plain language.** Avoid jargon without explaining it first. If you mention something
  like "destructuring" or "memoization", briefly explain what it means.
- **Point out patterns.** When you use a common programming pattern (like a loop, a callback,
  or a ternary), call it out so the developer learns to recognize it in the wild.
- **Celebrate good structure.** When the existing code already does something well (like
  separating concerns into different files), mention it so the developer knows to keep doing it.
- **Keep it encouraging.** Learning to code is hard. Be supportive and frame mistakes as
  learning opportunities, not failures.

## Tech stack

| Layer            | Tool                    |
|------------------|-------------------------|
| UI framework     | React 19                |
| Language         | TypeScript (strict)     |
| Build tool       | Vite 7                  |
| State management | Zustand (with persist)  |
| Styling          | CSS Modules + CSS vars  |
| Testing          | Vitest + Testing Library|
| Linting          | ESLint + typescript-eslint |

## Commands

```bash
npm run dev          # Start the dev server with hot reload
npm run build        # Type-check and build for production
npm run preview      # Preview the production build locally
npm run lint         # Run the linter
npm run test         # Run tests once
npm run test:watch   # Run tests in watch mode
```

## Project structure

```
src/
├── components/       # React components (Tile, Grid, Player, ActionPanel, etc.)
│   └── __tests__/    # Component tests
├── data/             # Game data — map utilities, tree definitions, sprites
├── hooks/            # Custom React hooks (game tick, player input)
├── styles/           # CSS Modules and global styles
├── store.ts          # Zustand store — all game state and actions live here
├── store.test.ts     # Unit tests for game mechanics
├── App.tsx           # Root component
└── main.tsx          # Entry point
public/
└── sprites/          # SVG art assets (tiles, trees, player character)
```

## Key architecture decisions

- **Zustand store is the single source of truth.** All game state (grid, player position,
  money, etc.) and all actions (planting, harvesting, moving) live in `src/store.ts`.
  Components read from the store using selectors and dispatch actions from it.
- **Procedural map generation** uses a seeded PRNG (`mapTemplate.ts`) so the same seed
  always produces the same map. The seed is stored in the save file.
- **CSS Modules** keep styles scoped to each component so class names never collide.
- **Game state persists to localStorage** via Zustand's `persist` middleware, saved under
  the key `hazelnut-farm-save`.

## Git workflow — IMPORTANT

### Conventional commits

Always use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
feat: add walnut tree species
fix: prevent walking through rivers without a bridge
docs: update CLAUDE.md with testing instructions
refactor: extract tile interaction logic into helper
test: add unit tests for bridge building
chore: update dependencies
```

The type must be lowercase. The description should be imperative mood ("add", not "added").

### Branch naming

Use conventional branch names. The format is `<type>/<short-description>`:

```
feat/walnut-trees
fix/river-collision
refactor/tile-helpers
test/bridge-building
chore/update-deps
```

### Development workflow

Every time you start working on a new feature or fix, follow these steps **in order**:

1. **Create a new branch** off of `master`:
   ```bash
   git checkout master
   git pull origin master
   git checkout -b feat/my-new-feature
   ```

2. **Develop on that branch.** Make small, focused commits as you go.

3. **Before opening a pull request**, rebase onto the latest `master` to make sure
   your branch is up to date and there are no conflicts:
   ```bash
   git fetch origin
   git rebase origin/master
   ```

4. **If there are merge conflicts during rebase:**
   - Do NOT silently pick one side. Instead, explain the conflict to the user in plain
     language (what the two versions are, and why they differ).
   - Ask the user how they want to resolve it.
   - Only after the user decides, resolve it and continue the rebase.

5. **If there are breaking changes** (something that would change how the game works for
   players, like altering tree growth times or changing prices), ask the user before
   proceeding. Explain what would break and let them decide.

6. **Push and open a PR** against `master`.

### Never do these without asking

- Force push (`git push --force`)
- Reset or discard uncommitted work (`git reset --hard`, `git checkout .`)
- Delete branches that aren't yours
- Amend published commits

## Coding conventions

- **TypeScript strict mode is on.** Do not use `any` — find the correct type.
- **CSS Modules** for all component styles. Name the file `ComponentName.module.css`.
- **Functional components only.** No class components.
- **Zustand selectors** to subscribe to store state (avoids unnecessary re-renders).
- Keep game logic in `store.ts`, keep rendering logic in components.
- Keep files small and focused. If a file is getting long, consider splitting it.

## Testing

- Run `npm run test` before committing to make sure nothing is broken.
- Game mechanics are tested in `src/store.test.ts`.
- Component rendering is tested in `src/components/__tests__/`.
- When adding new game features, add corresponding tests for the store logic.

## Game design notes

- **Tile size:** 64px with 4px gaps.
- **Grid size:** 20 columns x 25 rows, procedurally generated each new game.
- **Starting money:** $100.
- **Tree species:** Common Hazelnut, Turkish Hazelnut, Almond, Walnut — each with
  different costs, growth times, and harvest values.
- **Growth stages:** 6 stages per tree (seedling through mature/harvestable).
- **The game loop:** plant → wait for growth → harvest → nuts regrow → harvest again.
