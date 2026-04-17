import { Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { ImageToImageNode as ImageToImageNodeType } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { StatusBadge } from '../StatusBadge';
import { NodeHandle } from '../NodeHandle';
import { DeleteButton } from '../DeleteButton';

type ImageToImageNodeProps = NodeProps & { data: ImageToImageNodeType['data'] };

export function ImageToImageNode({ id, data }: ImageToImageNodeProps) {
  const node = useAppStore((s) => s.nodes.find((n) => n.id === id));
  const status = node?.status ?? 'idle';
  const hasOutput = node && 'output' in node && node.output != null;
  const error = node?.error;
  const updateNodeData = useAppStore((s) => s.updateNodeData);

  return (
    <div
      className="group relative min-w-[280px] rounded-lg border p-3"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
    >
      <StatusBadge status={status} />
      <DeleteButton nodeId={id} />
      <div className="mb-1 mt-6 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
        Image to Image
      </div>
      <div className="font-mono text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
        flux/dev img2img
      </div>
      <textarea
        className="nodrag mt-2 w-full resize-none rounded border p-2 text-sm transition-colors focus:outline-none"
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
        rows={2}
        placeholder="Transformation prompt..."
        value={data.prompt}
        onChange={(e) => updateNodeData(id, 'imageToImage', { prompt: e.target.value })}
      />
      {hasOutput && (
        <div className="mt-1 text-xs font-medium" style={{ color: 'var(--status-success)' }}>
          Generated
        </div>
      )}
      {error && (
        <div className="mt-1 text-xs" style={{ color: 'var(--status-error)', overflowWrap: 'break-word' }}>
          {error}
        </div>
      )}
      <NodeHandle type="target" position={Position.Left} id="image" label="image" />
      <NodeHandle type="source" position={Position.Right} id="output" label="output" />
    </div>
  );
}
