import { ReactFlow, Background, Controls } from '@xyflow/react';

export default function App() {
  return (
    <div className="flex h-screen">
      <div className="w-60 border-r border-gray-200 bg-gray-50 p-4">
        <h2 className="mb-4 text-sm font-semibold text-gray-500 uppercase">Nodes</h2>
        <p className="text-sm text-gray-400">Coming soon</p>
      </div>
      <div className="flex-1">
        <ReactFlow>
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
