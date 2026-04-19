import { useState, useCallback } from 'react';

interface CollapsibleBlockProps {
  title: string;
  content: string;
}

export function CollapsibleBlock({ title, content }: CollapsibleBlockProps) {
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  }, [content]);

  return (
    <div
      className="rounded-lg border"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <button
          className="text-xs font-semibold"
          style={{ color: 'var(--text-primary)' }}
          onClick={() => setOpen(!open)}
        >
          {open ? '▾' : '▸'} {title}
        </button>
        <button
          className="rounded px-2 py-0.5 text-[10px] font-medium"
          style={{ background: 'var(--accent)', color: '#fff' }}
          onClick={() => void handleCopy()}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      {open && (
        <pre
          className="border-t px-4 py-3 text-[11px] leading-relaxed"
          style={{
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)',
            fontFamily: 'ui-monospace, monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {content}
        </pre>
      )}
    </div>
  );
}
