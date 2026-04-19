import { ReactFlowProvider } from '@xyflow/react';
import { Sidebar } from './Sidebar';
import { Canvas } from './Canvas';
import { Router } from './Router';
import { CharacterLockListView } from '../workflows/characterLock/CharacterLockListView';
import { CharacterLockDetailView } from '../workflows/characterLock/CharacterLockDetailView';
import { MiniDramaListView } from '../workflows/miniDrama/MiniDramaListView';
import { MiniDramaDetailView } from '../workflows/miniDrama/MiniDramaDetailView';

export default function App() {
  return (
    <Router>
      {(route) => (
        <div className="flex h-screen">
          <Sidebar />
          {route.path === '/' && (
            <ReactFlowProvider>
              <Canvas />
            </ReactFlowProvider>
          )}
          {route.path === '/templates/character-lock' && (
            <CharacterLockListView />
          )}
          {route.path === '/templates/character-lock/:characterId' && (
            <CharacterLockDetailView characterId={route.params.characterId ?? ''} />
          )}
          {route.path === '/templates/mini-drama' && (
            <MiniDramaListView />
          )}
          {route.path === '/templates/mini-drama/:dramaId' && (
            <MiniDramaDetailView dramaId={route.params.dramaId ?? ''} />
          )}
        </div>
      )}
    </Router>
  );
}
