import { useState, useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { navigate } from '../../app/routerUtils';
import { buildReferenceSetupBlock } from '../../miniDramas/referenceSetup';
import { exportMiniDramaText, downloadTextFile } from '../../miniDramas/exportMiniDrama';
import { TONAL_PRESET_OPTIONS } from '../../miniDramas/tonalPresets';
import type { TonalPreset } from '../../miniDramas/types';
import { EpisodeCard } from './EpisodeCard';
import { CollapsibleBlock } from './CollapsibleBlock';
import { Toast } from '../characterLock/Toast';

interface MiniDramaDetailViewProps {
  dramaId: string;
}

export function MiniDramaDetailView({ dramaId }: MiniDramaDetailViewProps) {
  const drama = useAppStore((s) => s.miniDramas[dramaId]);
  const characters = useAppStore((s) => s.characters);
  const draftEpisode = useAppStore((s) => s.draftEpisode);
  const regenerateActive = useAppStore((s) => s.regenerateActiveAlternative);
  const generateAlternatives = useAppStore((s) => s.generateAlternatives);
  const setActiveAlternative = useAppStore((s) => s.setActiveAlternative);
  const deleteAlternative = useAppStore((s) => s.deleteAlternative);
  const updateMiniDrama = useAppStore((s) => s.updateMiniDrama);
  const generateArcAction = useAppStore((s) => s.generateArc);
  const deleteMiniDrama = useAppStore((s) => s.deleteMiniDrama);

  const character = drama ? characters[drama.characterId] : undefined;

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editPremise, setEditPremise] = useState('');
  const [editTone, setEditTone] = useState<TonalPreset>('vintageField');
  const [editStyle, setEditStyle] = useState('');
  const [editCharId, setEditCharId] = useState('');

  // Toasts
  const [arcToast, setArcToast] = useState(false);
  const [completeToast, setCompleteToast] = useState(false);
  const prevArcStatus = useRef(drama?.arcStatus);
  const prevDraftedCount = useRef(0);

  useEffect(() => {
    if (!drama) return;
    if (prevArcStatus.current === 'pending' && drama.arcStatus === 'generated') {
      setArcToast(true);
    }
    prevArcStatus.current = drama.arcStatus;

    const draftedCount = drama.episodes.filter((e) => e.status === 'drafted').length;
    if (draftedCount === 5 && prevDraftedCount.current < 5 && drama.episodes.length === 5) {
      setCompleteToast(true);
    }
    prevDraftedCount.current = draftedCount;
  }, [drama]);

  const handleStartEdit = useCallback(() => {
    if (!drama) return;
    setEditPremise(drama.premise);
    setEditTone(drama.tonalPreset);
    setEditStyle(drama.visualStyleBlock);
    setEditCharId(drama.characterId);
    setEditing(true);
  }, [drama]);

  const handleSave = useCallback(() => {
    if (!drama) return;
    updateMiniDrama(dramaId, {
      premise: editPremise,
      tonalPreset: editTone,
      visualStyleBlock: editStyle,
      characterId: editCharId,
    });
    setEditing(false);
  }, [dramaId, editPremise, editTone, editStyle, editCharId, drama, updateMiniDrama]);

  const handleSaveAndRegen = useCallback(() => {
    if (!drama) return;
    updateMiniDrama(dramaId, {
      premise: editPremise,
      tonalPreset: editTone,
      visualStyleBlock: editStyle,
      characterId: editCharId,
      episodes: [],
      arcStatus: 'pending',
      arcError: undefined,
    });
    setEditing(false);
    void generateArcAction(dramaId);
  }, [dramaId, editPremise, editTone, editStyle, editCharId, drama, updateMiniDrama, generateArcAction]);

  const handleExport = useCallback(() => {
    if (!drama || !character) return;
    const text = exportMiniDramaText(drama, character);
    const filename = `${character.name.toLowerCase().replace(/\s+/g, '-')}-mini-drama.txt`;
    downloadTextFile(filename, text);
  }, [drama, character]);

  const handleDelete = useCallback(() => {
    deleteMiniDrama(dramaId);
    navigate('/templates/mini-drama');
  }, [dramaId, deleteMiniDrama]);

  if (!drama) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4" style={{ background: 'var(--bg-canvas)', color: 'var(--text-tertiary)' }}>
        <div className="text-sm">Mini-drama not found</div>
        <button className="text-sm underline" style={{ color: 'var(--accent)' }} onClick={() => navigate('/templates/mini-drama')}>
          &larr; Back to list
        </button>
      </div>
    );
  }

  const completeChars = Object.values(characters).filter((c) => c.isComplete);
  const draftedCount = drama.episodes.filter((e) => e.status === 'drafted').length;

  return (
    <div className="flex-1 overflow-y-auto p-8" style={{ background: 'var(--bg-canvas)' }}>
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <button className="mb-2 text-sm" style={{ color: 'var(--text-secondary)' }} onClick={() => navigate('/templates/mini-drama')}>
              &larr; Back
            </button>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {character?.name ?? 'Unknown'} — Mini-drama
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-tertiary)' }}>{drama.premise}</p>
          </div>
          <div className="flex gap-2">
            <button className="rounded border px-3 py-1 text-[11px] font-medium" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }} onClick={handleStartEdit}>
              Edit
            </button>
            <button className="rounded border px-3 py-1 text-[11px] font-medium" style={{ borderColor: 'var(--border-subtle)', color: 'var(--status-error)' }} onClick={handleDelete}>
              Delete
            </button>
          </div>
        </div>

        {/* Edit form */}
        {editing && (
          <div className="mb-6 rounded-lg border p-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>Character</label>
                <select className="w-full rounded border px-3 py-2 text-sm focus:outline-none" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }} value={editCharId} onChange={(e) => setEditCharId(e.target.value)}>
                  {completeChars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>Premise</label>
                <textarea className="w-full resize-none rounded border p-3 text-sm focus:outline-none" style={{ background: 'transparent', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }} rows={2} value={editPremise} onChange={(e) => setEditPremise(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>Tone</label>
                <div className="flex flex-wrap gap-1">
                  {TONAL_PRESET_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button" className="rounded px-3 py-1 text-[11px] font-medium" style={{ background: editTone === opt.value ? 'var(--accent)' : 'transparent', color: editTone === opt.value ? '#fff' : 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }} onClick={() => setEditTone(opt.value)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>Visual style</label>
                <textarea className="w-full resize-none rounded border p-3 text-xs focus:outline-none" style={{ background: 'transparent', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }} rows={3} value={editStyle} onChange={(e) => setEditStyle(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <button className="rounded-md px-3 py-1.5 text-[11px] font-medium" style={{ background: 'var(--accent)', color: '#fff' }} onClick={handleSave}>Save</button>
                <button className="rounded-md border px-3 py-1.5 text-[11px] font-medium" style={{ borderColor: 'var(--border-subtle)', color: 'var(--status-running)' }} onClick={handleSaveAndRegen}>
                  Save & regenerate arc
                </button>
                <span className="self-center text-[10px]" style={{ color: 'var(--text-tertiary)' }}>This will clear drafted episodes.</span>
                <button className="rounded-md px-3 py-1.5 text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }} onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Arc pending */}
        {drama.arcStatus === 'pending' && (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="mb-3 inline-block h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" style={{ color: 'var(--accent)' }} />
            <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Writing arc...</div>
          </div>
        )}

        {/* Arc error */}
        {drama.arcStatus === 'error' && (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <div className="text-sm" style={{ color: 'var(--status-error)' }}>
              {drama.arcError ?? 'Arc generation failed.'}
            </div>
            <button className="rounded px-4 py-1.5 text-sm font-medium" style={{ background: 'var(--accent)', color: '#fff' }} onClick={() => void generateArcAction(dramaId)}>
              Retry arc
            </button>
          </div>
        )}

        {/* Arc generated — show blocks + episodes */}
        {drama.arcStatus === 'generated' && character && (
          <>
            <div className="mb-4 flex flex-col gap-3">
              <CollapsibleBlock title="Reference Setup" content={buildReferenceSetupBlock(character)} />
              <CollapsibleBlock title="Visual Style" content={drama.visualStyleBlock} />
            </div>

            <h2 className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              5 Episodes
            </h2>

            <div className="flex flex-col gap-3">
              {drama.episodes.map((ep) => (
                <EpisodeCard
                  key={ep.episodeNumber}
                  episode={ep}
                  onDraft={() => void draftEpisode(dramaId, ep.episodeNumber)}
                  onRegenerate={() => void regenerateActive(dramaId, ep.episodeNumber)}
                  onGenerateAlternatives={() => void generateAlternatives(dramaId, ep.episodeNumber)}
                  onSetActive={(altId) => setActiveAlternative(dramaId, ep.episodeNumber, altId)}
                  onDeleteAlternative={(altId) => deleteAlternative(dramaId, ep.episodeNumber, altId)}
                />
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {String(draftedCount)} of 5 drafted
              </div>
              <button
                className="rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40"
                style={{ background: 'var(--accent)', color: '#fff' }}
                disabled={draftedCount === 0}
                onClick={handleExport}
              >
                Export all
              </button>
            </div>
          </>
        )}
      </div>

      {arcToast && <Toast message="Arc ready — draft your first episode." onDismiss={() => setArcToast(false)} />}
      {completeToast && <Toast message="Mini-drama complete — export when ready." onDismiss={() => setCompleteToast(false)} />}
    </div>
  );
}
