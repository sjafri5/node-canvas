import { Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { ImageToVideoNode as ImageToVideoNodeType } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { StatusBadge } from '../StatusBadge';
import { NodeHandle } from '../NodeHandle';
import { DeleteButton } from '../DeleteButton';

type ImageToVideoNodeProps = NodeProps & { data: ImageToVideoNodeType['data'] };

export function ImageToVideoNode({ id, data }: ImageToVideoNodeProps) {
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
        Image to Video
      </div>
      <div className="font-mono text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
        runway gen-3 turbo
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
        placeholder="Motion prompt (optional)..."
        value={data.motionPrompt ?? ''}
        onChange={(e) => updateNodeData(id, 'imageToVideo', { motionPrompt: e.target.value })}
      />
      {status === 'running' && (
        <div className="mt-1 text-xs" style={{ color: 'var(--status-running)' }}>
          Rendering ~45s
        </div>
      )}
      {hasOutput && (
        <div className="mt-1 text-xs font-medium" style={{ color: 'var(--status-success)' }}>
          Video ready
        </div>
      )}
      {error && (
        <div className="mt-1 text-xs" style={{ color: 'var(--status-error)', overflowWrap: 'break-word' }}>
          {error}
        </div>
      )}
      <NodeHandle type="target" position={Position.Left} id="image" label="image" />
      <NodeHandle type="source" position={Position.Right} id="video" label="video" />
    </div>
  );
}
