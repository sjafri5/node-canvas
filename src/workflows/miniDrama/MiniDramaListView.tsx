import { useState, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { navigate } from '../../app/routerUtils';
import { TONAL_PRESETS, TONAL_PRESET_OPTIONS } from '../../miniDramas/tonalPresets';
import type { TonalPreset } from '../../miniDramas/types';

export function MiniDramaListView() {
  const characters = useAppStore((s) => s.characters);
  const miniDramas = useAppStore((s) => s.miniDramas);
  const createMiniDrama = useAppStore((s) => s.createMiniDrama);
  const generateArcAction = useAppStore((s) => s.generateArc);
  const deleteMiniDrama = useAppStore((s) => s.deleteMiniDrama);

  const completeChars = Object.values(characters).filter((c) => c.isComplete);
  const hasCompleteChars = completeChars.length > 0;
  const dramaList = Object.values(miniDramas).sort((a, b) => b.updatedAt - a.updatedAt);

  const [showSetup, setShowSetup] = useState(false);
  const [characterId, setCharacterId] = useState('');
  const [premise, setPremise] = useState('');
  const [tonalPreset, setTonalPreset] = useState<TonalPreset>('vintageField');
  const [visualStyle, setVisualStyle] = useState(TONAL_PRESETS.vintageField.block);
  const [styleEdited, setStyleEdited] = useState(false);
  const [showStyle, setShowStyle] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleToneChange = useCallback(
    (preset: TonalPreset) => {
      setTonalPreset(preset);
      if (!styleEdited) {
        setVisualStyle(TONAL_PRESETS[preset].block);
      }
    },
    [styleEdited],
  );

  const handleCreate = useCallback(async () => {
    if (!characterId || !premise.trim() || isCreating) return;
    setIsCreating(true);
    const id = createMiniDrama({
      characterId,
      premise: premise.trim(),
      tonalPreset,
      visualStyleBlock: visualStyle,
    });
    navigate(`/templates/mini-drama/${id}`);
    void generateArcAction(id);
  }, [characterId, premise, tonalPreset, visualStyle, isCreating, createMiniDrama, generateArcAction]);

  return (
    <div className="flex-1 overflow-y-auto p-8" style={{ background: 'var(--bg-canvas)' }}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Mini-dramas
          </h1>
          {!showSetup && (
            <button
              className="rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40"
              style={{ background: 'var(--accent)', color: '#fff' }}
              disabled={!hasCompleteChars}
              onClick={() => setShowSetup(true)}
            >
              + New mini-drama
            </button>
          )}
        </div>

        {!hasCompleteChars && (
          <div
            className="mb-6 rounded-lg border p-4 text-sm"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-tertiary)' }}
          >
            Lock a character first. Mini-drama needs a locked character to generate scripts.
          </div>
        )}

        {showSetup && (
          <div
            className="mb-8 rounded-lg border p-6"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
          >
            <h2 className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              New mini-drama
            </h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
                  Character
                </label>
                <select
                  className="w-full rounded border px-3 py-2 text-sm focus:outline-none"
                  style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                  value={characterId}
                  onChange={(e) => setCharacterId(e.target.value)}
                >
                  <option value="">Select a character...</option>
                  {completeChars.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
                  Premise
                </label>
                <textarea
                  className="w-full resize-none rounded border p-3 text-sm focus:outline-none"
                  style={{ background: 'transparent', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                  rows={3}
                  placeholder="1-3 sentences. What's the situation? Who wants what?"
                  value={premise}
                  onChange={(e) => setPremise(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
                  Tone
                </label>
                <div className="flex flex-wrap gap-1">
                  {TONAL_PRESET_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className="rounded px-3 py-1 text-[11px] font-medium transition-colors"
                      style={{
                        background: tonalPreset === opt.value ? 'var(--accent)' : 'transparent',
                        color: tonalPreset === opt.value ? '#fff' : 'var(--text-secondary)',
                        border: '1px solid var(--border-subtle)',
                      }}
                      onClick={() => handleToneChange(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <button
                  className="mb-1 text-[11px] font-mono"
                  style={{ color: 'var(--text-tertiary)' }}
                  onClick={() => setShowStyle(!showStyle)}
                >
                  Visual style {showStyle ? '▾' : '▸'}
                </button>
                {showStyle && (
                  <div>
                    <textarea
                      className="w-full resize-none rounded border p-3 text-xs focus:outline-none"
                      style={{ background: 'transparent', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                      rows={4}
                      value={visualStyle}
                      onChange={(e) => {
                        setVisualStyle(e.target.value);
                        setStyleEdited(true);
                      }}
                    />
                    {styleEdited && (
                      <button
                        className="mt-1 text-[10px]"
                        style={{ color: 'var(--accent)' }}
                        onClick={() => {
                          setVisualStyle(TONAL_PRESETS[tonalPreset].block);
                          setStyleEdited(false);
                        }}
                      >
                        Reset to preset
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  className="rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                  disabled={!characterId || !premise.trim() || isCreating}
                  onClick={() => void handleCreate()}
                >
                  {isCreating ? 'Creating...' : 'Generate arc'}
                </button>
                <button
                  className="rounded-md px-4 py-2 text-sm font-medium"
                  style={{ color: 'var(--text-secondary)' }}
                  onClick={() => {
                    setShowSetup(false);
                    setPremise('');
                    setCharacterId('');
                    setStyleEdited(false);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {dramaList.length === 0 && !showSetup && hasCompleteChars && (
          <div
            className="rounded-lg border p-12 text-center text-sm"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-tertiary)' }}
          >
            No mini-dramas yet. Create one to write a 5-episode arc.
          </div>
        )}

        {dramaList.length > 0 && (
          <div className="flex flex-col gap-3">
            {dramaList.map((drama) => {
              const char = characters[drama.characterId];
              const draftedCount = drama.episodes.filter((e) => e.status === 'drafted').length;
              const total = drama.episodes.length;
              const progress =
                drama.arcStatus === 'pending'
                  ? 'Arc generating...'
                  : drama.arcStatus === 'error'
                    ? 'Arc failed'
                    : total > 0 && draftedCount === total
                      ? 'Complete'
                      : `${String(draftedCount)} of ${String(total)} drafted`;

              return (
                <div
                  key={drama.id}
                  className="group relative flex items-center gap-4 rounded-lg border p-4 transition-colors"
                  style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', cursor: 'pointer' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface)'; }}
                  onClick={() => navigate(`/templates/mini-drama/${drama.id}`)}
                >
                  <button
                    className="absolute right-2 top-2 rounded p-1 text-[11px] opacity-0 transition-opacity group-hover:opacity-100"
                    style={{ color: 'var(--text-tertiary)' }}
                    title="Delete"
                    onClick={(e) => { e.stopPropagation(); deleteMiniDrama(drama.id); }}
                  >
                    &times;
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {drama.premise.slice(0, 40)}{drama.premise.length > 40 ? '...' : ''}
                    </div>
                    <div className="mt-1 flex gap-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {char && <span>{char.name}</span>}
                      <span>{progress}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
