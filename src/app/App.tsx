import { ReactFlowProvider } from '@xyflow/react';
import { Sidebar } from './Sidebar';
import { Canvas } from './Canvas';

export default function App() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <ReactFlowProvider>
        <Canvas />
      </ReactFlowProvider>
    </div>
  );
}
