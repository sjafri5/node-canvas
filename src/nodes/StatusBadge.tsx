import type { NodeStatus } from '../types';

const STATUS_CONFIG: Record<NodeStatus, { color: string; bg: string }> = {
  idle: { color: 'var(--status-idle)', bg: 'rgba(82, 82, 91, 0.15)' },
  running: { color: 'var(--status-running)', bg: 'rgba(245, 158, 11, 0.15)' },
  success: { color: 'var(--status-success)', bg: 'rgba(16, 185, 129, 0.15)' },
  error: { color: 'var(--status-error)', bg: 'rgba(239, 68, 68, 0.15)' },
};

interface StatusBadgeProps {
  status: NodeStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`absolute top-3 left-3 rounded-full px-2 py-0.5 text-[10px] font-medium ${
        status === 'running' ? 'animate-pulse' : ''
      }`}
      style={{ color: config.color, background: config.bg }}
    >
      {status}
    </span>
  );
}
