import { Position, useNodeConnections } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { VideoDisplayNode as VideoDisplayNodeType } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { NodeHandle } from '../NodeHandle';
import { DeleteButton } from '../DeleteButton';

type VideoDisplayNodeProps = NodeProps & { data: VideoDisplayNodeType['data'] };

export function VideoDisplayNode({ id }: VideoDisplayNodeProps) {
  const connections = useNodeConnections({ handleType: 'target', handleId: 'video' });
  const sourceNodeId = connections[0]?.source;

  const videoUrl = useAppStore((s) => {
    if (!sourceNodeId) return undefined;
    const sourceNode = s.nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode || !('output' in sourceNode)) return undefined;
    const output: unknown = sourceNode.output;
    if (output == null || typeof output !== 'object') return undefined;
    const url = (output as Record<string, unknown>).video;
    return typeof url === 'string' ? url : undefined;
  });

  const status = useAppStore((s) => s.nodes.find((n) => n.id === id)?.status ?? 'idle');

  return (
    <div
      className="group relative min-w-[480px] rounded-lg border p-3"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
    >
      <DeleteButton nodeId={id} />
      <div className="mb-2 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
        Video Display
      </div>
      <div className="p-1">
        {videoUrl ? (
          <video
            src={videoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="w-full rounded-md"
          />
        ) : (
          <div
            className="flex h-32 items-center justify-center rounded-md text-xs"
            style={{ background: 'var(--bg-surface-hover)', color: 'var(--text-tertiary)' }}
          >
            {status === 'idle' ? 'Connect a video source' : 'Waiting for video...'}
          </div>
        )}
      </div>
      <NodeHandle type="target" position={Position.Left} id="video" label="video" />
    </div>
  );
}
