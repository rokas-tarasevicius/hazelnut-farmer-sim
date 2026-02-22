import { StatsBar } from './components/StatsBar';
import { Grid } from './components/Grid';
import { GameViewport } from './components/GameViewport';
import { ActionPanel } from './components/ActionPanel';
import { ShopBar } from './components/ShopBar';
import { useGameTick } from './hooks/useGameTick';
import { usePlayerInput } from './hooks/usePlayerInput';

function App() {
  useGameTick();
  usePlayerInput();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <StatsBar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <GameViewport>
          <Grid />
        </GameViewport>
        <ShopBar />
      </div>
      <ActionPanel />
    </div>
  );
}

export default App;
