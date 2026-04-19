import { Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { ImageToImageNode as ImageToImageNodeType } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { StatusBadge } from '../StatusBadge';
import { NodeHandle } from '../NodeHandle';
import { DeleteButton } from '../DeleteButton';
import { EnhanceButton } from '../EnhanceButton';
import { NodeSelect } from '../NodeSelect';
import { SegmentedControl } from '../SegmentedControl';
import { VariationGrid } from '../VariationGrid';

const MODEL_OPTIONS = [
  { value: 'flux-schnell', label: 'flux/schnell' },
  { value: 'flux-dev', label: 'flux/dev' },
];

const VARIATION_OPTIONS = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '4', label: '4' },
];

type ImageToImageNodeProps = NodeProps & { data: ImageToImageNodeType['data'] };

export function ImageToImageNode({ id, data }: ImageToImageNodeProps) {
  const node = useAppStore((s) => s.nodes.find((n) => n.id === id));
  const status = node?.status ?? 'idle';
  const output = node && 'output' in node ? (node.output as ImageToImageNodeType['output']) : undefined;
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
        Image to Image
      </div>

      <div className="mb-2 flex flex-col gap-1.5">
        <NodeSelect
          label="model"
          value={data.model}
          options={MODEL_OPTIONS}
          onChange={(v) => updateNodeData(id, 'imageToImage', { model: v as ImageToImageNodeType['data']['model'] })}
        />
        <div className="nodrag flex items-center gap-2 text-[11px]">
          <span className="font-mono" style={{ color: 'var(--text-tertiary)' }}>strength</span>
          <input
            type="range"
            min={0.2}
            max={0.9}
            step={0.05}
            value={data.strength}
            onChange={(e) => updateNodeData(id, 'imageToImage', { strength: Number(e.target.value) })}
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full"
            style={{ accentColor: 'var(--accent)' }}
          />
          <span className="w-7 text-right font-mono" style={{ color: 'var(--text-secondary)' }}>
            {data.strength.toFixed(2)}
          </span>
        </div>
        <SegmentedControl
          label="count"
          value={String(data.variationCount)}
          options={VARIATION_OPTIONS}
          onChange={(v) => updateNodeData(id, 'imageToImage', { variationCount: Number(v) as ImageToImageNodeType['data']['variationCount'] })}
        />
      </div>

      <textarea
        className="nodrag w-full resize-none rounded border p-2 text-sm transition-colors focus:outline-none"
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
      <EnhanceButton
        text={data.prompt}
        onEnhanced={(enhanced) => updateNodeData(id, 'imageToImage', { prompt: enhanced })}
      />

      {variations && variations.length > 1 ? (
        <VariationGrid
          variations={variations}
          selectedIndex={selectedIndex}
          onSelect={(i) => selectVariation(id, i)}
        />
      ) : output?.output ? (
        <img src={output.output} alt="Transformed" className="mt-2 w-full rounded-md" />
      ) : null}

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
