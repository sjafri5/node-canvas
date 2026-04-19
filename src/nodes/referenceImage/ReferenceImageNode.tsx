import { useCallback, useRef, useState } from 'react';
import { Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { ReferenceImageNode as ReferenceImageNodeType, ReferenceLabel } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { StatusBadge } from '../StatusBadge';
import { NodeHandle } from '../NodeHandle';
import { DeleteButton } from '../DeleteButton';
import { NodeSelect } from '../NodeSelect';
import { SegmentedControl } from '../SegmentedControl';
import { VIEW_IDS, VIEW_LABELS } from '../../characters/types';
import type { ViewId } from '../../characters/types';

const LABEL_OPTIONS = [
  { value: 'other', label: 'other' },
  { value: 'character', label: 'character' },
  { value: 'location', label: 'location' },
  { value: 'style', label: 'style' },
];

const SOURCE_OPTIONS = [
  { value: 'upload', label: 'Upload' },
  { value: 'character', label: 'From character' },
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
  const completeCharacters = useAppStore(
    (s) => Object.values(s.characters).filter((c) => c.isComplete),
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<'upload' | 'character'>('upload');
  const [selectedCharId, setSelectedCharId] = useState('');
  const [selectedViewId, setSelectedViewId] = useState<ViewId>('front');

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

  const handleCharacterSelect = useCallback(
    (charId: string) => {
      setSelectedCharId(charId);
      const char = completeCharacters.find((c) => c.id === charId);
      if (!char) return;
      // Default to first locked view
      const firstLocked = VIEW_IDS.find((v) => char.views[v]?.status === 'locked');
      if (firstLocked) {
        setSelectedViewId(firstLocked);
        const imageUrl = char.views[firstLocked]?.imageUrl;
        if (imageUrl) {
          updateNodeData(id, 'referenceImage', { imageDataUrl: imageUrl });
        }
      }
    },
    [completeCharacters, id, updateNodeData],
  );

  const handleViewSelect = useCallback(
    (viewId: string) => {
      const vid = viewId as ViewId;
      setSelectedViewId(vid);
      const char = completeCharacters.find((c) => c.id === selectedCharId);
      if (!char) return;
      const imageUrl = char.views[vid]?.imageUrl;
      if (imageUrl) {
        updateNodeData(id, 'referenceImage', { imageDataUrl: imageUrl });
      }
    },
    [completeCharacters, selectedCharId, id, updateNodeData],
  );

  const label = data.label ?? 'other';
  const hasCompleteChars = completeCharacters.length > 0;

  // Get locked views for the selected character
  const selectedChar = completeCharacters.find((c) => c.id === selectedCharId);
  const lockedViews = selectedChar
    ? VIEW_IDS.filter((v) => selectedChar.views[v]?.status === 'locked').map((v) => ({
        value: v,
        label: VIEW_LABELS[v],
      }))
    : [];

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

      <div className="mb-2 flex flex-col gap-1.5">
        <NodeSelect
          label="label"
          value={label}
          options={LABEL_OPTIONS}
          onChange={(v) => updateNodeData(id, 'referenceImage', { label: v as ReferenceLabel })}
        />
        <SegmentedControl
          label="source"
          value={source}
          options={
            hasCompleteChars
              ? SOURCE_OPTIONS
              : [
                  SOURCE_OPTIONS[0]!,
                  { value: 'character', label: 'From character' },
                ]
          }
          onChange={(v) => setSource(v as 'upload' | 'character')}
        />
      </div>

      {source === 'upload' && (
        <>
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
        </>
      )}

      {source === 'character' && (
        <div className="flex flex-col gap-2">
          {!hasCompleteChars ? (
            <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              Lock a character first.
            </div>
          ) : (
            <>
              <NodeSelect
                label="character"
                value={selectedCharId}
                options={[
                  { value: '', label: 'Select...' },
                  ...completeCharacters.map((c) => ({ value: c.id, label: c.name })),
                ]}
                onChange={handleCharacterSelect}
              />
              {selectedCharId && lockedViews.length > 0 && (
                <NodeSelect
                  label="view"
                  value={selectedViewId}
                  options={lockedViews}
                  onChange={handleViewSelect}
                />
              )}
              {data.imageDataUrl && (
                <img src={data.imageDataUrl} alt="Reference" className="mt-1 w-full rounded-md" />
              )}
            </>
          )}
        </div>
      )}

      <NodeHandle type="source" position={Position.Right} id="image" label="image" />
    </div>
  );
}
