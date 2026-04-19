import { Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { ImageGenerationNode as ImageGenNodeType, ImageModel } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { StatusBadge } from '../StatusBadge';
import { NodeHandle } from '../NodeHandle';
import { DeleteButton } from '../DeleteButton';
import { SegmentedControl } from '../SegmentedControl';
import { VariationGrid } from '../VariationGrid';

const MODEL_INFO: Record<string, string> = {
  'flux-schnell': 'Fast iteration — $0.003/img',
  'nano-banana-pro': 'Google — best realism & subject identity',
  'flux-dev': 'High quality — $0.025/img',
  'recraft-v4-pro': 'Best typography & design — $0.04/img',
};

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
        <label className="nodrag flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
          <span className="font-mono" style={{ color: 'var(--text-tertiary)' }}>model</span>
          <select
            className="rounded border px-1.5 py-0.5 text-[11px] focus:outline-none"
            style={{
              background: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
            value={data.model}
            onChange={(e) => updateNodeData(id, 'imageGeneration', { model: e.target.value as ImageModel })}
          >
            <optgroup label="Fast">
              <option value="flux-schnell">flux/schnell — $0.003</option>
            </optgroup>
            <optgroup label="Quality">
              <option value="nano-banana-pro">nano-banana-pro — $0.04</option>
              <option value="flux-dev">flux/dev — $0.025</option>
              <option value="recraft-v4-pro">recraft-v4/pro — $0.04</option>
            </optgroup>
          </select>
        </label>
        <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
          {MODEL_INFO[data.model] ?? ''}
        </div>
        <SegmentedControl
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
