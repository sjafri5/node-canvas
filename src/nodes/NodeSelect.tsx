interface NodeSelectProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

export function NodeSelect({ label, value, options, onChange }: NodeSelectProps) {
  return (
    <label className="nodrag flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
      <span className="font-mono" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      <select
        className="rounded border px-1.5 py-0.5 text-[11px] focus:outline-none"
        style={{
          background: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-primary)',
        }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  );
}
