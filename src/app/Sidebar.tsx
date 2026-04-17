import type { NodeType } from '../types';
import { useAppStore } from '../store/useAppStore';

const NODE_ENTRIES: { type: NodeType; label: string }[] = [
  { type: 'textPrompt', label: 'Text Prompt' },
  { type: 'promptEnhance', label: 'Prompt Enhance' },
  { type: 'imageGeneration', label: 'Image Generation' },
  { type: 'imageDisplay', label: 'Image Display' },
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
    <div
      className="flex w-56 flex-col gap-2 border-r p-4"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
    >
      <h2
        className="mb-2 text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: 'var(--text-tertiary)' }}
      >
        Nodes
      </h2>
      {NODE_ENTRIES.map((entry) => (
        <button
          key={entry.type}
          className={`rounded-md border px-3 py-2 text-left text-sm font-medium transition-colors ${
            isRunning ? 'cursor-not-allowed opacity-40' : ''
          }`}
          style={{
            background: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
          onMouseEnter={(e) => {
            if (!isRunning) {
              e.currentTarget.style.background = 'var(--bg-surface-hover)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--bg-surface)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
          disabled={isRunning}
          onClick={() => handleAdd(entry.type)}
        >
          {entry.label}
        </button>
      ))}
    </div>
  );
}
