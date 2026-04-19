import { Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { ImageGenerationNode as ImageGenNodeType } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { StatusBadge } from '../StatusBadge';
import { NodeHandle } from '../NodeHandle';
import { DeleteButton } from '../DeleteButton';
import { NodeSelect } from '../NodeSelect';
import { SegmentedControl } from '../SegmentedControl';
import { VariationGrid } from '../VariationGrid';

const MODEL_OPTIONS = [
  { value: 'flux-schnell', label: 'flux/schnell' },
  { value: 'flux-dev', label: 'flux/dev' },
  { value: 'flux-pro-1.1', label: 'flux-pro/1.1' },
];

const ASPECT_OPTIONS = [
  { value: '1:1', label: '1:1' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '4:5', label: '4:5' },
  { value: '2:3', label: '2:3' },
];

const VARIATION_OPTIONS = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '4', label: '4' },
];

type ImageGenNodeProps = NodeProps & { data: ImageGenNodeType['data'] };

export function ImageGenerationNode({ id, data }: ImageGenNodeProps) {
  const node = useAppStore((s) => s.nodes.find((n) => n.id === id));
  const status = node?.status ?? 'idle';
  const output = node && 'output' in node ? (node.output as ImageGenNodeType['output']) : undefined;
  const error = node?.error;
  const updateNodeData = useAppStore((s) => s.updateNodeData);
  const selectVariation = useAppStore((s) => s.selectVariation);

  const variations = output?.variations;
  const selectedIndex = data.selectedVariationIndex ?? 0;

  return (
    <div
      className="group relative min-w-[280px] rounded-lg border p-3"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
    >
      <StatusBadge status={status} />
      <DeleteButton nodeId={id} />
      <div className="mb-1 mt-6 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
        Image Generation
      </div>

      <div className="mb-2 flex flex-col gap-1.5">
        <NodeSelect
          label="model"
          value={data.model}
          options={MODEL_OPTIONS}
          onChange={(v) => updateNodeData(id, 'imageGeneration', { model: v as ImageGenNodeType['data']['model'] })}
        />
        <NodeSelect
          label="ratio"
          value={data.aspectRatio}
          options={ASPECT_OPTIONS}
          onChange={(v) => updateNodeData(id, 'imageGeneration', { aspectRatio: v as ImageGenNodeType['data']['aspectRatio'] })}
        />
        <SegmentedControl
          label="count"
          value={String(data.variationCount)}
          options={VARIATION_OPTIONS}
          onChange={(v) => updateNodeData(id, 'imageGeneration', { variationCount: Number(v) as ImageGenNodeType['data']['variationCount'] })}
        />
      </div>

      {variations && variations.length > 1 ? (
        <VariationGrid
          variations={variations}
          selectedIndex={selectedIndex}
          onSelect={(i) => selectVariation(id, i)}
        />
      ) : output?.image ? (
        <img src={output.image} alt="Generated" className="mt-2 w-full rounded-md" />
      ) : null}

      {!output && status === 'success' && (
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
