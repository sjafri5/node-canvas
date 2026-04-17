import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  type Connection,
  type IsValidConnection,
} from '@xyflow/react';
import type { NodeChange, EdgeChange } from '@xyflow/react';
import { useAppStore } from '../store/useAppStore';
import { nodeTypes as registeredNodeTypes, runners } from '../nodes/registry';
import type { WorkflowNode, Edge } from '../types';

/** Valid connection rules: sourceHandle → targetHandle type checking. */
const VALID_CONNECTIONS: [string, string][] = [
  ['textPrompt.text', 'promptEnhance.text-in'],
  ['textPrompt.text', 'imageGeneration.prompt'],
  ['promptEnhance.text', 'imageGeneration.prompt'],
  ['imageGeneration.image', 'imageDisplay.image'],
];

export function Canvas() {
  const nodeTypes = useMemo(() => registeredNodeTypes, []);

  const nodes = useAppStore((s) => s.nodes);
  const edges = useAppStore((s) => s.edges);
  const isRunning = useAppStore((s) => s.isRunning);
  const applyNodeChanges = useAppStore((s) => s.applyNodeChanges);
  const applyEdgeChanges = useAppStore((s) => s.applyEdgeChanges);
  const connect = useAppStore((s) => s.connect);
  const runWorkflow = useAppStore((s) => s.runWorkflow);
  const clearCanvas = useAppStore((s) => s.clearCanvas);
  const deleteNode = useAppStore((s) => s.deleteNode);

  const onNodesChange = useCallback(
    (changes: NodeChange<WorkflowNode>[]) => {
      const removeChanges = changes.filter((c) => c.type === 'remove');
      for (const change of removeChanges) {
        deleteNode(change.id);
      }
      const otherChanges = changes.filter((c) => c.type !== 'remove');
      if (otherChanges.length > 0) {
        applyNodeChanges(otherChanges);
      }
    },
    [applyNodeChanges, deleteNode],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => applyEdgeChanges(changes),
    [applyEdgeChanges],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (
        connection.source &&
        connection.target &&
        connection.sourceHandle &&
        connection.targetHandle
      ) {
        connect({
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
        });
      }
    },
    [connect],
  );

  const isValidConnection: IsValidConnection = useCallback(
    (connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);
      if (!sourceNode || !targetNode) return false;

      const sourceKey = `${sourceNode.type}.${connection.sourceHandle ?? ''}`;
      const targetKey = `${targetNode.type}.${connection.targetHandle ?? ''}`;

      return VALID_CONNECTIONS.some(([s, t]) => s === sourceKey && t === targetKey);
    },
    [nodes],
  );

  const handleRun = useCallback(() => {
    void runWorkflow(runners);
  }, [runWorkflow]);

  const handleClear = useCallback(() => {
    if (window.confirm('Clear all nodes and edges? This cannot be undone.')) {
      clearCanvas();
    }
  }, [clearCanvas]);

  // Animate edges whose source node is running or succeeded
  const styledEdges = useMemo(() => {
    return edges.map((edge) => {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const animated =
        isRunning &&
        sourceNode != null &&
        (sourceNode.status === 'running' || sourceNode.status === 'success');
      return { ...edge, animated };
    });
  }, [edges, nodes, isRunning]);

  return (
    <div className="relative flex-1" style={{ background: 'var(--bg-canvas)' }}>
      <ReactFlow
        nodes={nodes}
        edges={styledEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        deleteKeyCode={['Backspace', 'Delete']}
        fitView
      >
        <Background variant={"dots" as never} color="#1f1f22" gap={24} size={1} />
        <Controls />
      </ReactFlow>
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            isRunning ? 'cursor-not-allowed opacity-40' : 'hover:opacity-80'
          }`}
          style={{ color: 'var(--text-secondary)', background: 'transparent' }}
          disabled={isRunning}
          onClick={handleClear}
        >
          Clear
        </button>
        <button
          className={`rounded-md px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors ${
            isRunning ? 'cursor-not-allowed opacity-50' : ''
          }`}
          style={{
            background: isRunning ? 'var(--status-idle)' : 'var(--accent)',
          }}
          onMouseEnter={(e) => {
            if (!isRunning) e.currentTarget.style.background = 'var(--accent-hover)';
          }}
          onMouseLeave={(e) => {
            if (!isRunning) e.currentTarget.style.background = 'var(--accent)';
          }}
          disabled={isRunning}
          onClick={handleRun}
        >
          {isRunning ? 'Running...' : 'Run'}
        </button>
      </div>
    </div>
  );
}
