import { Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { ImageToVideoNode as ImageToVideoNodeType } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { StatusBadge } from '../StatusBadge';
import { NodeHandle } from '../NodeHandle';
import { DeleteButton } from '../DeleteButton';
import { EnhanceButton } from '../EnhanceButton';
import { NodeSelect } from '../NodeSelect';
import { SegmentedControl } from '../SegmentedControl';

const MODEL_OPTIONS = [
  { value: 'gen-3-turbo', label: 'gen-3 turbo' },
  { value: 'veo-3-fast', label: 'veo3/fast' },
];

const DURATION_BY_MODEL: Record<string, { value: string; label: string }[]> = {
  'veo-3-fast': [
    { value: '4', label: '4s' },
    { value: '6', label: '6s' },
    { value: '8', label: '8s' },
  ],
  'gen-3-turbo': [
    { value: '5', label: '5s' },
    { value: '10', label: '10s' },
  ],
};

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

      <div className="mb-2 flex flex-col gap-1.5">
        <NodeSelect
          label="model"
          value={data.model}
          options={MODEL_OPTIONS}
          onChange={(v) => {
            const newModel = v as ImageToVideoNodeType['data']['model'];
            const durations = DURATION_BY_MODEL[newModel] ?? DURATION_BY_MODEL['veo-3-fast']!;
            const firstDuration = Number(durations[0]!.value);
            updateNodeData(id, 'imageToVideo', { model: newModel, durationSeconds: firstDuration });
          }}
        />
        <SegmentedControl
          label="duration"
          value={String(data.durationSeconds)}
          options={DURATION_BY_MODEL[data.model] ?? DURATION_BY_MODEL['veo-3-fast']!}
          onChange={(v) => updateNodeData(id, 'imageToVideo', { durationSeconds: Number(v) })}
        />
      </div>

      <div className="mb-0.5 font-mono text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
        Camera & motion
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
        placeholder="subtle movement, slight zoom, ambient breathing"
        value={data.motionPrompt ?? ''}
        onChange={(e) => updateNodeData(id, 'imageToVideo', { motionPrompt: e.target.value })}
      />
      <div className="mt-0.5 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
        Describe how the image should animate — camera movement, subtle motion. Don't describe the scene.
      </div>
      <EnhanceButton
        text={data.motionPrompt ?? ''}
        onEnhanced={(enhanced) => updateNodeData(id, 'imageToVideo', { motionPrompt: enhanced })}
      />
      {status === 'running' && (
        <div className="mt-1 text-xs" style={{ color: 'var(--status-running)' }}>
          Rendering...
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
