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
const VALID_CONNECTIONS: Record<string, string> = {
  'textPrompt.text': 'imageGeneration.prompt',
  'imageGeneration.image': 'imageDisplay.image',
};

export function Canvas() {
  // Stable reference prevents React Flow from remounting custom node components
  const nodeTypes = useMemo(() => registeredNodeTypes, []);

  const nodes = useAppStore((s) => s.nodes);
  const edges = useAppStore((s) => s.edges);
  const applyNodeChanges = useAppStore((s) => s.applyNodeChanges);
  const applyEdgeChanges = useAppStore((s) => s.applyEdgeChanges);
  const connect = useAppStore((s) => s.connect);
  const runWorkflow = useAppStore((s) => s.runWorkflow);
  const isRunning = useAppStore((s) => s.isRunning);

  const onNodesChange = useCallback(
    (changes: NodeChange<WorkflowNode>[]) => applyNodeChanges(changes),
    [applyNodeChanges],
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

      return VALID_CONNECTIONS[sourceKey] === targetKey;
    },
    [nodes],
  );

  const handleRun = useCallback(() => {
    void runWorkflow(runners);
  }, [runWorkflow]);

  return (
    <div className="relative flex-1">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
      <button
        className={`absolute top-4 right-4 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow transition-colors ${
          isRunning
            ? 'cursor-not-allowed bg-gray-400'
            : 'bg-indigo-600 hover:bg-indigo-700'
        }`}
        disabled={isRunning}
        onClick={handleRun}
      >
        {isRunning ? 'Running...' : 'Run'}
      </button>
    </div>
  );
}
