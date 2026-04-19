import { useState, useCallback } from 'react';
import type { Episode } from '../../miniDramas/types';
import { getActivePrompt } from '../../miniDramas/exportMiniDrama';

interface EpisodeCardProps {
  episode: Episode;
  onDraft: () => void;
  onRegenerate: () => void;
  onGenerateAlternatives: () => void;
  onSetActive: (alternativeId: string) => void;
  onDeleteAlternative: (alternativeId: string) => void;
}

export function EpisodeCard({
  episode,
  onDraft,
  onRegenerate,
  onGenerateAlternatives,
  onSetActive,
  onDeleteAlternative,
}: EpisodeCardProps) {
  const [copied, setCopied] = useState(false);

  const activePrompt = getActivePrompt(episode);
  const altCount = episode.alternatives.length;
  const activeIndex = episode.alternatives.findIndex(
    (a) => a.id === episode.activeAlternativeId,
  );

  const handleCopy = useCallback(async () => {
    if (!activePrompt) return;
    await navigator.clipboard.writeText(activePrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  }, [activePrompt]);

  const handlePrev = useCallback(() => {
    if (activeIndex <= 0) return;
    const prev = episode.alternatives[activeIndex - 1];
    if (prev) onSetActive(prev.id);
  }, [activeIndex, episode.alternatives, onSetActive]);

  const handleNext = useCallback(() => {
    if (activeIndex >= altCount - 1) return;
    const next = episode.alternatives[activeIndex + 1];
    if (next) onSetActive(next.id);
  }, [activeIndex, altCount, episode.alternatives, onSetActive]);

  const isDrafted = episode.status === 'drafted';
  const isDrafting = episode.status === 'drafting';
  const isError = episode.status === 'error';
  const isGenerating = episode.status === 'generatingAlternatives';

  return (
    <div
      className="rounded-lg border"
      style={{
        background: 'var(--bg-surface)',
        borderColor: isDrafted || isGenerating ? 'var(--accent)' : 'var(--border-subtle)',
        borderWidth: isDrafted || isGenerating ? '2px' : '1px',
      }}
    >
      <div className="p-4">
        <div className="mb-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Episode {String(episode.episodeNumber)} — {episode.title}
        </div>
        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {episode.summary}
        </div>
      </div>

      {isDrafting && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--status-running)' }}>
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Drafting episode prompt...
          </div>
        </div>
      )}

      {(isDrafted || isGenerating) && activePrompt && (
        <div className="px-4 pb-4">
          {/* Alternative indicator */}
          {altCount > 1 && (
            <div className="mb-2 flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              <button
                className="rounded px-1 transition-colors disabled:opacity-30"
                disabled={activeIndex <= 0}
                onClick={handlePrev}
              >
                &larr;
              </button>
              <span>
                Alternative {String(activeIndex + 1)} of {String(altCount)}
              </span>
              <button
                className="rounded px-1 transition-colors disabled:opacity-30"
                disabled={activeIndex >= altCount - 1}
                onClick={handleNext}
              >
                &rarr;
              </button>
            </div>
          )}

          <pre
            className="max-h-64 overflow-auto rounded p-3 text-[11px] leading-relaxed transition-opacity"
            style={{
              background: 'var(--bg-canvas)',
              color: 'var(--text-secondary)',
              fontFamily: 'ui-monospace, monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {activePrompt}
          </pre>

          {/* Generating alternatives skeleton */}
          {isGenerating && (
            <div className="mt-2 flex items-center gap-2 text-[11px]" style={{ color: 'var(--status-running)' }}>
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Generating 3 alternatives...
            </div>
          )}

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              className="rounded border px-3 py-1 text-[11px] font-medium transition-colors"
              style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
              onClick={onRegenerate}
            >
              Regenerate
            </button>
            <button
              className="rounded px-3 py-1 text-[11px] font-medium transition-colors"
              style={{ background: 'var(--accent)', color: '#fff' }}
              onClick={() => void handleCopy()}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            {altCount < 4 && !isGenerating && (
              <button
                className="rounded px-3 py-1 text-[11px] font-medium transition-colors"
                style={{ background: 'var(--accent)', color: '#fff' }}
                onClick={onGenerateAlternatives}
              >
                + Generate 3 alternatives
              </button>
            )}
            {altCount > 1 && (
              <button
                className="rounded px-3 py-1 text-[11px] font-medium transition-colors"
                style={{ color: 'var(--text-tertiary)' }}
                onClick={() => {
                  if (episode.activeAlternativeId) {
                    onDeleteAlternative(episode.activeAlternativeId);
                  }
                }}
              >
                Delete this alternative
              </button>
            )}
          </div>
        </div>
      )}

      {isError && (
        <div className="px-4 pb-4">
          <div className="mb-2 text-xs" style={{ color: 'var(--status-error)' }}>
            {episode.error ?? 'Draft failed.'}
          </div>
          <button
            className="rounded px-3 py-1 text-[11px] font-medium"
            style={{ background: 'var(--accent)', color: '#fff' }}
            onClick={onDraft}
          >
            Retry
          </button>
        </div>
      )}

      {episode.status === 'undrafted' && (
        <div className="px-4 pb-4">
          <button
            className="rounded px-4 py-1.5 text-[11px] font-medium"
            style={{ background: 'var(--accent)', color: '#fff' }}
            onClick={onDraft}
          >
            Draft this episode
          </button>
        </div>
      )}
    </div>
  );
}
