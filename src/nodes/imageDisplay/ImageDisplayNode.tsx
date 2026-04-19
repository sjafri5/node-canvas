import { Position, useNodeConnections } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { ImageDisplayNode as ImageDisplayNodeType } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { NodeHandle } from '../NodeHandle';
import { DeleteButton } from '../DeleteButton';

type ImageDisplayNodeProps = NodeProps & { data: ImageDisplayNodeType['data'] };

export function ImageDisplayNode({ id }: ImageDisplayNodeProps) {
  const connections = useNodeConnections({ handleType: 'target', handleId: 'image' });
  const sourceNodeId = connections[0]?.source;

  const imageUrl = useAppStore((s) => {
    if (!sourceNodeId) return undefined;
    const sourceNode = s.nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode || !('output' in sourceNode)) return undefined;
    const output: unknown = sourceNode.output;
    if (output == null || typeof output !== 'object') return undefined;
    const url = (output as Record<string, unknown>).image ?? (output as Record<string, unknown>).output;
    return typeof url === 'string' ? url : undefined;
  });

  const status = useAppStore((s) => s.nodes.find((n) => n.id === id)?.status ?? 'idle');

  return (
    <div
      className="group relative min-w-[480px] rounded-lg border p-3"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
    >
      <DeleteButton nodeId={id} />
      <div
        className="mb-2 text-xs font-semibold"
        style={{ color: 'var(--text-primary)' }}
      >
        Image Display
      </div>
      <div className="p-1">
        {imageUrl ? (
          <img src={imageUrl} alt="Result" className="w-full rounded-md" />
        ) : (
          <div
            className="flex h-32 items-center justify-center rounded-md text-xs"
            style={{ background: 'var(--bg-surface-hover)', color: 'var(--text-tertiary)' }}
          >
            {status === 'idle' ? 'Connect an image source' : 'Waiting for image...'}
          </div>
        )}
      </div>
      <NodeHandle type="target" position={Position.Left} id="image" label="image" />
    </div>
  );
}
