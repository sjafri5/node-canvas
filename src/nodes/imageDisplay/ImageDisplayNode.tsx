import { Handle, Position, useHandleConnections } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { ImageDisplayNode as ImageDisplayNodeType } from '../../types';
import { useAppStore } from '../../store/useAppStore';

type ImageDisplayNodeProps = NodeProps & { data: ImageDisplayNodeType['data'] };

export function ImageDisplayNode({ id }: ImageDisplayNodeProps) {
  const connections = useHandleConnections({ type: 'target', id: 'image' });
  const sourceNodeId = connections[0]?.source;

  const imageUrl = useAppStore((s) => {
    if (!sourceNodeId) return undefined;
    const sourceNode = s.nodes.find((n) => n.id === sourceNodeId);
    if (sourceNode && 'output' in sourceNode) {
      const output = sourceNode.output as { imageUrl?: string } | undefined;
      return output?.imageUrl;
    }
    return undefined;
  });

  const status = useAppStore((s) => s.nodes.find((n) => n.id === id)?.status ?? 'idle');

  return (
    <div className="relative min-w-[240px] rounded-lg border border-green-300 bg-white p-3 shadow-sm">
      <div className="mb-2 text-xs font-semibold text-green-600">Image Display</div>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="Result"
          className="w-full rounded"
        />
      ) : (
        <div className="flex h-32 items-center justify-center rounded bg-gray-50 text-xs text-gray-400">
          {status === 'idle' ? 'Connect an image source' : 'Waiting for image...'}
        </div>
      )}
      <Handle type="target" position={Position.Left} id="image" className="!bg-green-500" />
    </div>
  );
}
