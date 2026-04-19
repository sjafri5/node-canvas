import { useState } from 'react';

interface EnhanceButtonProps {
  text: string;
  onEnhanced: (enhanced: string) => void;
}

export function EnhanceButton({ text, onEnhanced }: EnhanceButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleEnhance(): Promise<void> {
    if (!text.trim() || loading) return;

    setLoading(true);
    try {
      const res = await fetch('/api/generate/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Enhance failed (${String(res.status)}): ${body}`);
      }

      const data = (await res.json()) as { text: string };
      onEnhanced(data.text);
    } catch {
      // Silently handled — the button returns to its enabled state on failure.
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className="nodrag mt-1 rounded px-2 py-0.5 text-[11px] font-medium transition-colors disabled:opacity-40"
      style={{
        background: 'var(--accent)',
        color: '#fff',
      }}
      disabled={!text.trim() || loading}
      onClick={() => void handleEnhance()}
    >
      {loading ? 'Enhancing...' : 'Enhance'}
    </button>
  );
}
