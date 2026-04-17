import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { TextPromptNode as TextPromptNodeType } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { StatusBadge } from '../StatusBadge';

type TextPromptNodeProps = NodeProps & { data: TextPromptNodeType['data'] };

export function TextPromptNode({ id, data }: TextPromptNodeProps) {
  const status = useAppStore((s) => s.nodes.find((n) => n.id === id)?.status ?? 'idle');
  const updateNodeData = useAppStore((s) => s.updateNodeData);

  return (
    <div className="relative min-w-[200px] rounded-lg border border-purple-300 bg-white p-3 shadow-sm">
      <StatusBadge status={status} />
      <div className="mb-2 text-xs font-semibold text-purple-600">Text Prompt</div>
      <textarea
        className="nodrag w-full resize-none rounded border border-gray-200 p-2 text-sm focus:border-purple-400 focus:outline-none"
        rows={3}
        placeholder="Enter your prompt..."
        value={data.prompt}
        onChange={(e) => updateNodeData(id, 'textPrompt', { prompt: e.target.value })}
      />
      <Handle type="source" position={Position.Right} id="text" className="!bg-purple-500" />
    </div>
  );
}
