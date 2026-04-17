import { useAppStore } from '../store/useAppStore';

interface DeleteButtonProps {
  nodeId: string;
}

export function DeleteButton({ nodeId }: DeleteButtonProps) {
  const deleteNode = useAppStore((s) => s.deleteNode);

  return (
    <button
      className="nodrag absolute top-2 right-2 rounded p-1 opacity-0 transition-all duration-150 group-hover:opacity-100"
      style={{ color: 'var(--text-tertiary)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--status-error)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--text-tertiary)';
      }}
      onClick={() => deleteNode(nodeId)}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 6h18" />
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
      </svg>
    </button>
  );
}
