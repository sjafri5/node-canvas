import { useCallback, useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { navigate } from '../../app/routerUtils';
import { VIEW_IDS } from '../../characters/types';
import { ViewCard } from './ViewCard';
import { Toast } from './Toast';

interface CharacterLockDetailViewProps {
  characterId: string;
}

export function CharacterLockDetailView({ characterId }: CharacterLockDetailViewProps) {
  const character = useAppStore((s) => s.characters[characterId]);
  const lockView = useAppStore((s) => s.lockView);
  const regenerateView = useAppStore((s) => s.regenerateView);

  const [showToast, setShowToast] = useState(false);
  const wasCompleteRef = useRef(false);

  const lockedCount = character
    ? VIEW_IDS.filter((v) => character.views[v]?.status === 'locked').length
    : 0;
  const anyPending = character
    ? VIEW_IDS.some((v) => character.views[v]?.status === 'pending')
    : false;

  // Show toast when character becomes complete for the first time
  useEffect(() => {
    if (character?.isComplete && !wasCompleteRef.current) {
      setShowToast(true);
    }
    wasCompleteRef.current = character?.isComplete ?? false;
  }, [character?.isComplete]);

  const handleRegenerate = useCallback(
    (viewId: string) => {
      void regenerateView(characterId, viewId as typeof VIEW_IDS[number]);
    },
    [characterId, regenerateView],
  );

  if (!character) {
    return (
      <div
        className="flex flex-1 flex-col items-center justify-center gap-4"
        style={{ background: 'var(--bg-canvas)', color: 'var(--text-tertiary)' }}
      >
        <div className="text-sm">Character not found</div>
        <button
          className="text-sm underline"
          style={{ color: 'var(--accent)' }}
          onClick={() => navigate('/templates/character-lock')}
        >
          Back to list
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex-1 overflow-y-auto p-8"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center gap-4">
          <button
            className="text-sm transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onClick={() => navigate('/templates/character-lock')}
          >
            &larr; Back
          </button>
          <h1
            className="text-xl font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {character.name}
          </h1>
        </div>

        {anyPending && (
          <div
            className="mb-4 text-xs"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Generating 8 views — usually ~30 seconds. Lock or regenerate as they arrive.
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {VIEW_IDS.map((viewId) => (
            <ViewCard
              key={viewId}
              view={character.views[viewId]!}
              onLock={() => lockView(characterId, viewId)}
              onRegenerate={() => handleRegenerate(viewId)}
            />
          ))}
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span style={{ color: 'var(--text-secondary)' }}>
              {String(lockedCount)} of 8 locked
            </span>
            {character.isComplete && (
              <span style={{ color: 'var(--status-success)' }}>Complete</span>
            )}
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full"
            style={{ background: 'var(--bg-surface-hover)' }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${String((lockedCount / 8) * 100)}%`,
                background: character.isComplete ? 'var(--status-success)' : 'var(--accent)',
              }}
            />
          </div>
        </div>
      </div>

      {showToast && (
        <Toast
          message={`${character.name} is ready to use.`}
          onDismiss={() => setShowToast(false)}
        />
      )}
    </div>
  );
}
