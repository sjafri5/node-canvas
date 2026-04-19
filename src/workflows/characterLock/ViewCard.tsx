import type { CharacterView } from '../../characters/types';
import { VIEW_LABELS } from '../../characters/types';

interface ViewCardProps {
  view: CharacterView;
  onLock: () => void;
  onRegenerate: () => void;
}

export function ViewCard({ view, onLock, onRegenerate }: ViewCardProps) {
  const { viewId, status, imageUrl, error } = view;
  const isLocked = status === 'locked';
  const isPending = status === 'pending';
  const isError = status === 'error';
  const isReady = status === 'ready';
  const hasImage = Boolean(imageUrl);

  return (
    <div
      className="flex flex-col overflow-hidden rounded-lg"
      style={{
        background: 'var(--bg-surface)',
        border: isLocked ? '2px solid var(--accent)' : '1px solid var(--border-subtle)',
      }}
    >
      <div
        className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: 'var(--text-tertiary)' }}
      >
        {VIEW_LABELS[viewId]}
      </div>

      <div className="relative aspect-square">
        {isPending && (
          <div
            className="h-full w-full animate-pulse"
            style={{ background: 'var(--bg-surface-hover)' }}
          />
        )}
        {(isReady || isLocked) && hasImage && (
          <img
            src={imageUrl}
            alt={VIEW_LABELS[viewId]}
            className="h-full w-full object-cover"
          />
        )}
        {(isReady || isLocked) && !hasImage && (
          <div
            className="flex h-full w-full items-center justify-center text-[11px]"
            style={{ background: 'var(--bg-surface-hover)', color: 'var(--text-tertiary)' }}
          >
            No image — regenerate
          </div>
        )}
        {isError && (
          <div
            className="flex h-full w-full items-center justify-center text-[11px]"
            style={{ background: 'rgba(239, 68, 68, 0.08)', color: 'var(--status-error)' }}
          >
            Failed
          </div>
        )}
      </div>

      <div className="flex gap-1.5 overflow-hidden px-3 py-2">
        {!isError && (
          <button
            className="flex-1 rounded px-2 py-1 text-[11px] font-medium transition-colors disabled:opacity-30"
            style={{
              background: isLocked ? 'transparent' : 'var(--accent)',
              color: isLocked ? 'var(--text-tertiary)' : '#fff',
            }}
            disabled={isPending || isLocked || !hasImage}
            onClick={onLock}
          >
            {isLocked ? 'Locked' : 'Lock'}
          </button>
        )}
        <button
          className="flex-1 rounded px-2 py-1 text-[11px] font-medium transition-colors disabled:opacity-30"
          style={{
            background: 'transparent',
            border: '1px solid var(--border-subtle)',
            color: isError ? 'var(--accent)' : 'var(--text-secondary)',
          }}
          disabled={isPending}
          onClick={onRegenerate}
        >
          {isError ? 'Retry' : 'Regen'}
        </button>
      </div>

      {error && (
        <div
          className="truncate px-3 pb-2 text-[10px]"
          style={{ color: 'var(--status-error)' }}
          title={error}
        >
          {error}
        </div>
      )}
    </div>
  );
}
