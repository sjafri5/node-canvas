import { useState, useCallback } from 'react';
import type { Episode } from '../../miniDramas/types';

interface EpisodeCardProps {
  episode: Episode;
  onDraft: () => void;
  onRegenerate: () => void;
}

export function EpisodeCard({ episode, onDraft, onRegenerate }: EpisodeCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!episode.draftedPrompt) return;
    await navigator.clipboard.writeText(episode.draftedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  }, [episode.draftedPrompt]);

  const isDrafted = episode.status === 'drafted';
  const isDrafting = episode.status === 'drafting';
  const isError = episode.status === 'error';

  return (
    <div
      className="rounded-lg border"
      style={{
        background: 'var(--bg-surface)',
        borderColor: isDrafted ? 'var(--accent)' : 'var(--border-subtle)',
        borderWidth: isDrafted ? '2px' : '1px',
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

      {isDrafted && episode.draftedPrompt && (
        <div className="px-4 pb-4">
          <pre
            className="max-h-64 overflow-auto rounded p-3 text-[11px] leading-relaxed"
            style={{
              background: 'var(--bg-canvas)',
              color: 'var(--text-secondary)',
              fontFamily: 'ui-monospace, monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {episode.draftedPrompt}
          </pre>
          <div className="mt-2 flex gap-2">
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
            onClick={onRegenerate}
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
