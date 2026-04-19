import { useState, useCallback, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { navigate } from '../../app/routerUtils';
import { VIEW_IDS } from '../../characters/types';

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

export function CharacterLockListView() {
  const characters = useAppStore((s) => s.characters);
  const createCharacter = useAppStore((s) => s.createCharacter);
  const deleteCharacter = useAppStore((s) => s.deleteCharacter);
  const generateAllViews = useAppStore((s) => s.generateAllViews);
  const charCount = Object.keys(characters).length;

  const [showSetup, setShowSetup] = useState(false);
  const [name, setName] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await compressImage(file, 1024, 0.8);
    setImageDataUrl(dataUrl);
    e.target.value = '';
  }, []);

  const handleCreate = useCallback(async () => {
    if (!name.trim() || !imageDataUrl || isCreating) return;
    setIsCreating(true);
    const id = createCharacter(name.trim(), imageDataUrl);
    navigate(`/templates/character-lock/${id}`);
    void generateAllViews(id);
  }, [name, imageDataUrl, isCreating, createCharacter, generateAllViews]);

  const characterList = Object.values(characters).sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );

  return (
    <div
      className="flex-1 overflow-y-auto p-8"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Characters
          </h1>
          {!showSetup && (
            <button
              className="rounded-md px-4 py-2 text-sm font-medium transition-colors"
              style={{ background: 'var(--accent)', color: '#fff' }}
              onClick={() => setShowSetup(true)}
            >
              + New character
            </button>
          )}
        </div>

        {showSetup && (
          <div
            className="mb-8 rounded-lg border p-6"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
          >
            <h2 className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              New character
            </h2>
            <div className="flex gap-6">
              <div className="shrink-0">
                {imageDataUrl ? (
                  <div className="relative">
                    <img
                      src={imageDataUrl}
                      alt="Reference"
                      className="h-32 w-32 rounded-lg object-cover"
                    />
                    <button
                      className="absolute bottom-1 right-1 rounded px-1.5 py-0.5 text-[10px]"
                      style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Replace
                    </button>
                  </div>
                ) : (
                  <button
                    className="flex h-32 w-32 items-center justify-center rounded-lg border text-xs transition-colors"
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
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => void handleUpload(e)}
                />
              </div>
              <div className="flex flex-1 flex-col gap-3">
                <input
                  type="text"
                  placeholder="Character name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded border px-3 py-2 text-sm focus:outline-none"
                  style={{
                    background: 'transparent',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
                {charCount >= 3 && (
                  <div className="text-[11px]" style={{ color: 'var(--status-running)' }}>
                    You have {String(charCount)} characters. Consider exporting and deleting older ones to keep things manageable.
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    className="rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                    disabled={!name.trim() || !imageDataUrl || isCreating}
                    onClick={() => void handleCreate()}
                  >
                    {isCreating ? 'Creating...' : 'Generate 8 views'}
                  </button>
                  <button
                    className="rounded-md px-4 py-2 text-sm font-medium transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                    onClick={() => {
                      setShowSetup(false);
                      setName('');
                      setImageDataUrl('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {characterList.length === 0 && !showSetup && (
          <div
            className="rounded-lg border p-12 text-center text-sm"
            style={{
              background: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-tertiary)',
            }}
          >
            No characters yet. Create your first to start locking in views.
          </div>
        )}

        {characterList.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {characterList.map((char) => {
              const lockedCount = VIEW_IDS.filter(
                (v) => char.views[v]?.status === 'locked',
              ).length;
              const firstLocked = VIEW_IDS.find(
                (v) => char.views[v]?.status === 'locked',
              );
              const thumbnail = firstLocked
                ? char.views[firstLocked]?.imageUrl
                : char.referenceImageUrl;

              return (
                <div
                  key={char.id}
                  className="group relative flex items-center gap-4 rounded-lg border p-4 transition-colors"
                  style={{
                    background: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-surface-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--bg-surface)';
                  }}
                  onClick={() => navigate(`/templates/character-lock/${char.id}`)}
                >
                  <button
                    className="absolute right-2 top-2 rounded p-1 text-[11px] opacity-0 transition-opacity group-hover:opacity-100"
                    style={{ color: 'var(--text-tertiary)' }}
                    title="Delete character"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCharacter(char.id);
                    }}
                  >
                    &times;
                  </button>
                  {thumbnail && (
                    <img
                      src={thumbnail}
                      alt={char.name}
                      className="h-14 w-14 shrink-0 rounded-md object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div
                      className="truncate text-sm font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {char.name}
                    </div>
                    <div
                      className="mt-1 text-xs"
                      style={{
                        color: char.isComplete
                          ? 'var(--status-success)'
                          : 'var(--text-tertiary)',
                      }}
                    >
                      {char.isComplete
                        ? '\u2713 Complete'
                        : `${String(lockedCount)} of 8 locked`}
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
