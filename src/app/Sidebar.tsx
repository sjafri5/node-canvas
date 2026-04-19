import type { NodeType } from '../types';
import { useAppStore } from '../store/useAppStore';
import { navigate, useRoute } from './routerUtils';

const NODE_ENTRIES: { type: NodeType; label: string }[] = [
  { type: 'textPrompt', label: 'Text Prompt' },
  { type: 'imageGeneration', label: 'Image Generation' },
  { type: 'imageDisplay', label: 'Image Display' },
  { type: 'referenceImage', label: 'Reference Image' },
  { type: 'imageToImage', label: 'Image to Image' },
  { type: 'imageToVideo', label: 'Image to Video' },
  { type: 'videoDisplay', label: 'Video Display' },
];

export function Sidebar() {
  const addNode = useAppStore((s) => s.addNode);
  const nodeCount = useAppStore((s) => s.nodes.length);
  const isRunning = useAppStore((s) => s.isRunning);
  const completeCount = useAppStore(
    (s) => Object.values(s.characters).filter((c) => c.isComplete).length,
  );
  const dramaCount = useAppStore((s) => Object.keys(s.miniDramas).length);
  const hasCompleteChars = completeCount > 0;
  const route = useRoute();
  const isCanvas = route.path === '/';

  function handleAdd(type: NodeType) {
    if (!isCanvas) navigate('/');
    const offset = nodeCount * 40;
    addNode(type, { x: 250 + offset, y: 150 + offset });
  }

  return (
    <div
      className="flex w-56 shrink-0 flex-col gap-2 overflow-y-auto border-r p-4"
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

      <h2
        className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: 'var(--text-tertiary)' }}
      >
        Templates
      </h2>
      <button
        className="rounded-md border px-3 py-2 text-left text-sm font-medium transition-colors"
        style={{
          background: route.path.startsWith('/templates/character-lock')
            ? 'var(--bg-surface-hover)'
            : 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
          color: route.path.startsWith('/templates/character-lock')
            ? 'var(--text-primary)'
            : 'var(--text-secondary)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--bg-surface-hover)';
          e.currentTarget.style.color = 'var(--text-primary)';
        }}
        onMouseLeave={(e) => {
          if (!route.path.startsWith('/templates/character-lock')) {
            e.currentTarget.style.background = 'var(--bg-surface)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }
        }}
        onClick={() => navigate('/templates/character-lock')}
      >
        Character Lock
        {completeCount > 0 && (
          <span
            className="ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {completeCount}
          </span>
        )}
      </button>
      <button
        className={`rounded-md border px-3 py-2 text-left text-sm font-medium transition-colors ${
          !hasCompleteChars ? 'cursor-not-allowed opacity-50' : ''
        }`}
        style={{
          background: route.path.startsWith('/templates/mini-drama')
            ? 'var(--bg-surface-hover)'
            : 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
          color: route.path.startsWith('/templates/mini-drama')
            ? 'var(--text-primary)'
            : 'var(--text-secondary)',
        }}
        onMouseEnter={(e) => {
          if (hasCompleteChars) {
            e.currentTarget.style.background = 'var(--bg-surface-hover)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }
        }}
        onMouseLeave={(e) => {
          if (!route.path.startsWith('/templates/mini-drama')) {
            e.currentTarget.style.background = 'var(--bg-surface)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }
        }}
        disabled={!hasCompleteChars}
        onClick={() => navigate('/templates/mini-drama')}
      >
        Mini-drama
        {dramaCount > 0 && (
          <span
            className="ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {dramaCount}
          </span>
        )}
      </button>
      {!hasCompleteChars && (
        <div className="px-1 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
          Lock a character first.
        </div>
      )}
    </div>
  );
}
