import type { NodeType } from '../types';
import { useAppStore } from '../store/useAppStore';

const NODE_ENTRIES: { type: NodeType; label: string; color: string }[] = [
  { type: 'textPrompt', label: 'Text Prompt', color: 'border-purple-300 hover:bg-purple-50' },
  { type: 'imageGeneration', label: 'Image Generation', color: 'border-blue-300 hover:bg-blue-50' },
  { type: 'imageDisplay', label: 'Image Display', color: 'border-green-300 hover:bg-green-50' },
];

export function Sidebar() {
  const addNode = useAppStore((s) => s.addNode);
  const nodeCount = useAppStore((s) => s.nodes.length);
  const isRunning = useAppStore((s) => s.isRunning);

  function handleAdd(type: NodeType) {
    const offset = nodeCount * 40;
    addNode(type, { x: 250 + offset, y: 150 + offset });
  }

  return (
    <div className="w-60 border-r border-gray-200 bg-gray-50 p-4">
      <h2 className="mb-4 text-sm font-semibold uppercase text-gray-500">Nodes</h2>
      <div className="flex flex-col gap-2">
        {NODE_ENTRIES.map((entry) => (
          <button
            key={entry.type}
            className={`rounded-lg border bg-white px-3 py-2 text-left text-sm font-medium text-gray-700 transition-colors ${entry.color} ${
              isRunning ? 'cursor-not-allowed opacity-50' : ''
            }`}
            disabled={isRunning}
            onClick={() => handleAdd(entry.type)}
          >
            {entry.label}
          </button>
        ))}
      </div>
    </div>
  );
}
