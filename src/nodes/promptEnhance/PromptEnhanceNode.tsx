import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { PromptEnhanceNode as PromptEnhanceNodeType } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { StatusBadge } from '../StatusBadge';

type PromptEnhanceNodeProps = NodeProps & { data: PromptEnhanceNodeType['data'] };

export function PromptEnhanceNode({ id }: PromptEnhanceNodeProps) {
  const node = useAppStore((s) => s.nodes.find((n) => n.id === id));
  const status = node?.status ?? 'idle';
  const output = node && 'output' in node ? (node.output as { text: string } | undefined) : undefined;
  const error = node?.error;

  return (
    <div className="relative min-w-[280px] rounded-lg border border-amber-300 bg-white p-3 shadow-sm">
      <StatusBadge status={status} />
      <div className="mb-2 text-xs font-semibold text-amber-600">Prompt Enhance</div>
      <div className="text-xs text-gray-400">gpt-4o-mini</div>
      {output?.text && (
        <div className="mt-2 text-xs text-gray-600">
          {output.text.length > 100 ? `${output.text.slice(0, 100)}...` : output.text}
        </div>
      )}
      {error && <div className="mt-2 text-xs text-red-500">{error}</div>}
      <Handle type="target" position={Position.Left} id="text-in" className="!bg-amber-500" />
      <Handle type="source" position={Position.Right} id="text" className="!bg-amber-500" />
    </div>
  );
}
