import { Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { TextPromptNode as TextPromptNodeType } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { StatusBadge } from '../StatusBadge';
import { NodeHandle } from '../NodeHandle';
import { DeleteButton } from '../DeleteButton';

type TextPromptNodeProps = NodeProps & { data: TextPromptNodeType['data'] };

export function TextPromptNode({ id, data }: TextPromptNodeProps) {
  const status = useAppStore((s) => s.nodes.find((n) => n.id === id)?.status ?? 'idle');
  const updateNodeData = useAppStore((s) => s.updateNodeData);

  return (
    <div
      className="group relative min-w-[280px] rounded-lg border p-3"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
    >
      <StatusBadge status={status} />
      <DeleteButton nodeId={id} />
      <div
        className="mb-2 mt-4 text-xs font-semibold"
        style={{ color: 'var(--text-primary)' }}
      >
        Text Prompt
      </div>
      <textarea
        className="nodrag w-full resize-none rounded border p-2 text-sm transition-colors focus:outline-none"
        style={{
          background: 'transparent',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-primary)',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-subtle)';
        }}
        rows={3}
        placeholder="Enter your prompt..."
        value={data.prompt}
        onChange={(e) => updateNodeData(id, 'textPrompt', { prompt: e.target.value })}
      />
      <NodeHandle type="source" position={Position.Right} id="text" label="text" />
    </div>
  );
}
