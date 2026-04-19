interface VariationGridProps {
  variations: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function VariationGrid({ variations, selectedIndex, onSelect }: VariationGridProps) {
  const cols = variations.length <= 2 ? 2 : 2;

  return (
    <div
      className="mt-2 grid gap-1"
      style={{ gridTemplateColumns: `repeat(${String(cols)}, 1fr)` }}
    >
      {variations.map((url, i) => (
        <button
          key={url}
          type="button"
          className="nodrag overflow-hidden rounded transition-all"
          style={{
            border: i === selectedIndex ? '2px solid var(--accent)' : '2px solid transparent',
            opacity: i === selectedIndex ? 1 : 0.7,
          }}
          onClick={() => onSelect(i)}
        >
          <img src={url} alt={`Variation ${String(i + 1)}`} className="block w-full" />
        </button>
      ))}
    </div>
  );
}
