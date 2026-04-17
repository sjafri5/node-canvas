import { Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { ImageGenerationNode as ImageGenNodeType } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { StatusBadge } from '../StatusBadge';
import { NodeHandle } from '../NodeHandle';
import { DeleteButton } from '../DeleteButton';

type ImageGenNodeProps = NodeProps & { data: ImageGenNodeType['data'] };

export function ImageGenerationNode({ id }: ImageGenNodeProps) {
  const node = useAppStore((s) => s.nodes.find((n) => n.id === id));
  const status = node?.status ?? 'idle';
  const hasOutput = node && 'output' in node && node.output != null;
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
        Image Generation
      </div>
      <div className="font-mono text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
        flux/schnell
      </div>
      {hasOutput && (
        <div className="mt-2 text-xs font-medium" style={{ color: 'var(--status-success)' }}>
          Generated
        </div>
      )}
      {error && (
        <div className="mt-2 text-xs" style={{ color: 'var(--status-error)', overflowWrap: 'break-word' }}>
          {error}
        </div>
      )}
      <NodeHandle type="target" position={Position.Left} id="prompt" label="prompt" />
      <NodeHandle type="source" position={Position.Right} id="image" label="image" />
    </div>
  );
}
