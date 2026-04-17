import { useCallback, useRef } from 'react';
import { Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { ReferenceImageNode as ReferenceImageNodeType } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { StatusBadge } from '../StatusBadge';
import { NodeHandle } from '../NodeHandle';
import { DeleteButton } from '../DeleteButton';

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
      if (dataUrl.length > 2 * 1024 * 1024) {
        // Soft warning — still proceed, but this risks localStorage limits
      }
      updateNodeData(id, 'referenceImage', { imageDataUrl: dataUrl });
      e.target.value = '';
    },
    [id, updateNodeData],
  );

  return (
    <div
      className="group relative min-w-[280px] rounded-lg border p-3"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
    >
      <StatusBadge status={status} />
      <DeleteButton nodeId={id} />
      <div className="mb-2 mt-6 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
        Reference Image
      </div>
      {data.label && (
        <div className="font-mono text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
          {data.label}
        </div>
      )}
      {data.imageDataUrl ? (
        <div className="mt-2">
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
          className="nodrag mt-2 w-full rounded-md border py-3 text-xs transition-colors"
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
