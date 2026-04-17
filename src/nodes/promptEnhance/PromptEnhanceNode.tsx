import { Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { PromptEnhanceNode as PromptEnhanceNodeType } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { StatusBadge } from '../StatusBadge';
import { NodeHandle } from '../NodeHandle';
import { DeleteButton } from '../DeleteButton';

type PromptEnhanceNodeProps = NodeProps & { data: PromptEnhanceNodeType['data'] };

export function PromptEnhanceNode({ id }: PromptEnhanceNodeProps) {
  const node = useAppStore((s) => s.nodes.find((n) => n.id === id));
  const status = node?.status ?? 'idle';
  const output = node && 'output' in node ? (node.output as { text: string } | undefined) : undefined;
  const error = node?.error;

  return (
    <div
      className="group relative min-w-[280px] rounded-lg border p-3"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
    >
      <StatusBadge status={status} />
      <DeleteButton nodeId={id} />
      <div
        className="mb-1 mt-6 text-xs font-semibold"
        style={{ color: 'var(--text-primary)' }}
      >
        Prompt Enhance
      </div>
      <div className="font-mono text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
        gpt-4o-mini
      </div>
      {output?.text && (
        <div
          className="mt-2 text-xs"
          style={{ color: 'var(--text-secondary)', overflowWrap: 'break-word' }}
        >
          {output.text.length > 100 ? `${output.text.slice(0, 100)}...` : output.text}
        </div>
      )}
      {error && (
        <div className="mt-2 text-xs" style={{ color: 'var(--status-error)', overflowWrap: 'break-word' }}>
          {error}
        </div>
      )}
      <NodeHandle type="target" position={Position.Left} id="text-in" label="text-in" />
      <NodeHandle type="source" position={Position.Right} id="text" label="text" />
    </div>
  );
}
