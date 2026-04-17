import { Handle, Position } from '@xyflow/react';

interface NodeHandleProps {
  type: 'source' | 'target';
  position: Position;
  id: string;
  label: string;
}

export function NodeHandle({ type, position, id, label }: NodeHandleProps) {
  const isLeft = position === Position.Left;

  return (
    <div
      className="absolute flex items-center"
      style={{
        top: '50%',
        [isLeft ? 'left' : 'right']: 0,
        transform: 'translateY(-50%)',
      }}
    >
      <span
        className="pointer-events-none absolute whitespace-nowrap font-mono text-[11px]"
        style={{
          color: 'var(--text-secondary)',
          // Labels sit outside the node: input labels to the left, output labels to the right
          [isLeft ? 'right' : 'left']: '12px',
        }}
      >
        {label}
      </span>
      <Handle type={type} position={position} id={id} />
    </div>
  );
}
