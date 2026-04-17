import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { ImageGenerationNode as ImageGenNodeType } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { StatusBadge } from '../StatusBadge';

type ImageGenNodeProps = NodeProps & { data: ImageGenNodeType['data'] };

export function ImageGenerationNode({ id }: ImageGenNodeProps) {
  const node = useAppStore((s) => s.nodes.find((n) => n.id === id));
  const status = node?.status ?? 'idle';
  const output = node && 'output' in node ? (node.output as { imageUrl: string } | undefined) : undefined;
  const error = node?.error;

  return (
    <div className="relative min-w-[200px] rounded-lg border border-blue-300 bg-white p-3 shadow-sm">
      <StatusBadge status={status} />
      <div className="mb-2 text-xs font-semibold text-blue-600">Image Generation</div>
      <div className="text-xs text-gray-400">flux/schnell</div>
      {output?.imageUrl && (
        <img
          src={output.imageUrl}
          alt="Generated"
          className="mt-2 max-h-32 w-full rounded object-cover"
        />
      )}
      {error && <div className="mt-2 text-xs text-red-500">{error}</div>}
      <Handle type="target" position={Position.Left} id="prompt" className="!bg-blue-500" />
      <Handle type="source" position={Position.Right} id="image" className="!bg-blue-500" />
    </div>
  );
}
