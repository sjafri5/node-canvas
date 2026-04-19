interface SegmentedControlProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

export function SegmentedControl({ label, value, options, onChange }: SegmentedControlProps) {
  return (
    <div className="nodrag flex items-center gap-2 text-[11px]">
      <span className="font-mono" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      <div
        className="flex rounded border"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className="px-2 py-0.5 text-[11px] font-medium transition-colors first:rounded-l last:rounded-r"
            style={{
              background: value === opt.value ? 'var(--accent)' : 'transparent',
              color: value === opt.value ? '#fff' : 'var(--text-secondary)',
            }}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
