import type { NodeStatus } from '../types';

const STATUS_STYLES: Record<NodeStatus, string> = {
  idle: 'bg-gray-200 text-gray-600',
  running: 'bg-blue-200 text-blue-700 animate-pulse',
  success: 'bg-green-200 text-green-700',
  error: 'bg-red-200 text-red-700',
};

interface StatusBadgeProps {
  status: NodeStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`absolute top-2 right-2 rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}
