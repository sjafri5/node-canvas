import { ReactFlowProvider } from '@xyflow/react';
import { Sidebar } from './Sidebar';
import { Canvas } from './Canvas';
import { Router } from './Router';
import { CharacterLockListView } from '../workflows/characterLock/CharacterLockListView';
import { CharacterLockDetailView } from '../workflows/characterLock/CharacterLockDetailView';

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
        </div>
      )}
    </Router>
  );
}
