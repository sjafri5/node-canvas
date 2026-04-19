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

  return (
    <div
      className="flex flex-col rounded-lg border p-3"
      style={{
        background: 'var(--bg-surface)',
        borderColor: isLocked ? 'var(--accent)' : 'var(--border-subtle)',
        borderWidth: isLocked ? '2px' : '1px',
      }}
    >
      <div
        className="mb-2 text-[11px] font-semibold uppercase tracking-wide"
        style={{ color: 'var(--text-tertiary)' }}
      >
        {VIEW_LABELS[viewId]}
      </div>

      <div className="relative mb-3 aspect-square overflow-hidden rounded-md">
        {isPending && (
          <div
            className="h-full w-full animate-pulse rounded-md"
            style={{ background: 'var(--bg-surface-hover)' }}
          />
        )}
        {(isReady || isLocked) && imageUrl && (
          <img
            src={imageUrl}
            alt={VIEW_LABELS[viewId]}
            className="h-full w-full object-cover transition-opacity"
          />
        )}
        {isError && (
          <div
            className="flex h-full w-full items-center justify-center rounded-md text-xs"
            style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-error)' }}
          >
            Generation failed
          </div>
        )}
      </div>

      <div className="mt-auto flex gap-2">
        {!isError && (
          <button
            className="flex-1 rounded px-2 py-1.5 text-[11px] font-medium transition-colors disabled:opacity-40"
            style={{
              background: isLocked ? 'transparent' : 'var(--accent)',
              color: isLocked ? 'var(--text-tertiary)' : '#fff',
              border: isLocked ? '1px solid var(--border-subtle)' : 'none',
            }}
            disabled={isPending || isLocked}
            onClick={onLock}
          >
            {isLocked ? 'Locked' : 'Lock'}
          </button>
        )}
        <button
          className="flex-1 rounded border px-2 py-1.5 text-[11px] font-medium transition-colors disabled:opacity-40"
          style={{
            background: 'transparent',
            borderColor: 'var(--border-subtle)',
            color: isError ? 'var(--accent)' : 'var(--text-secondary)',
          }}
          disabled={isPending}
          onClick={onRegenerate}
        >
          {isError ? 'Retry' : 'Regenerate'}
        </button>
      </div>

      {error && (
        <div
          className="mt-1 truncate text-[10px]"
          style={{ color: 'var(--status-error)' }}
          title={error}
        >
          {error}
        </div>
      )}
    </div>
  );
}
