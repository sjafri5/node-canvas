import { useCallback, useRef } from 'react';
import { Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { ReferenceImageNode as ReferenceImageNodeType, ReferenceLabel } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { StatusBadge } from '../StatusBadge';
import { NodeHandle } from '../NodeHandle';
import { DeleteButton } from '../DeleteButton';
import { NodeSelect } from '../NodeSelect';

const LABEL_OPTIONS = [
  { value: 'other', label: 'other' },
  { value: 'character', label: 'character' },
  { value: 'location', label: 'location' },
  { value: 'style', label: 'style' },
];

type ReferenceImageNodeProps = NodeProps & { data: ReferenceImageNodeType['data'] };

function compressImage(file: File, maxSize: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

export function ReferenceImageNode({ id, data }: ReferenceImageNodeProps) {
  const status = useAppStore((s) => s.nodes.find((n) => n.id === id)?.status ?? 'idle');
  const updateNodeData = useAppStore((s) => s.updateNodeData);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const dataUrl = await compressImage(file, 1024, 0.8);
      updateNodeData(id, 'referenceImage', { imageDataUrl: dataUrl });
      e.target.value = '';
    },
    [id, updateNodeData],
  );

  const label = data.label ?? 'other';

  return (
    <div
      className="group relative min-w-[280px] rounded-lg border p-3"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
    >
      <StatusBadge status={status} />
      <DeleteButton nodeId={id} />
      <div className="mb-1 mt-6 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
        Reference Image
      </div>

      <div className="mb-2 flex items-center gap-2">
        <NodeSelect
          label="label"
          value={label}
          options={LABEL_OPTIONS}
          onChange={(v) => updateNodeData(id, 'referenceImage', { label: v as ReferenceLabel })}
        />
        {label !== 'other' && (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {label}
          </span>
        )}
      </div>

      {data.imageDataUrl ? (
        <div>
          <img src={data.imageDataUrl} alt="Reference" className="w-full rounded-md" />
          <button
            className="nodrag mt-1 text-[11px] transition-colors hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
            onClick={() => fileInputRef.current?.click()}
          >
            Replace
          </button>
        </div>
      ) : (
        <button
          className="nodrag w-full rounded-md border py-3 text-xs transition-colors"
          style={{
            background: 'var(--bg-surface-hover)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-tertiary)',
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          Upload image
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handleUpload(e)}
      />
      <NodeHandle type="source" position={Position.Right} id="image" label="image" />
    </div>
  );
}
