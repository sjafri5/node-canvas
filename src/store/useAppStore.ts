import { create } from 'zustand';
import type { NodeChange, EdgeChange } from '@xyflow/react';
import { applyNodeChanges as rfApplyNodeChanges, applyEdgeChanges as rfApplyEdgeChanges } from '@xyflow/react';
import type { WorkflowNode, Edge, NodeType } from '../types';
import { runWorkflow as engineRunWorkflow } from '../engine/runWorkflow';
import type { RunnerRegistry } from '../engine/types';
import { CycleError } from '../engine/types';
import { createId } from '../lib/id';
import { loadFromStorage, createDebouncedSave, isValidWorkflow } from './persistence';

interface AppStore {
  // graph
  nodes: WorkflowNode[];
  edges: Edge[];
  addNode: (type: NodeType, position: { x: number; y: number }) => void;
  updateNodeData: <T extends WorkflowNode['type']>(
    id: string,
    type: T,
    patch: Partial<Extract<WorkflowNode, { type: T }>['data']>,
  ) => void;
  connect: (edge: Omit<Edge, 'id'>) => void;
  deleteNode: (id: string) => void;
  applyNodeChanges: (changes: NodeChange<WorkflowNode>[]) => void;
  applyEdgeChanges: (changes: EdgeChange<Edge>[]) => void;

  clearCanvas: () => void;
  exportWorkflow: () => string;
  importWorkflow: (json: string) => void;

  // execution
  isRunning: boolean;
  runWorkflow: (registry: RunnerRegistry) => Promise<void>;
}

function createDefaultNode(type: NodeType, position: { x: number; y: number }): WorkflowNode {
  const base = { id: createId(), position, status: 'idle' as const, error: undefined };

  switch (type) {
    case 'textPrompt':
      return { ...base, type, data: { prompt: '' } };
    case 'promptEnhance':
      return { ...base, type, data: {} as Record<string, never> };
    case 'imageGeneration':
      return { ...base, type, data: {} as Record<string, never> };
    case 'imageDisplay':
      return { ...base, type, data: {} as Record<string, never> };
  }
}

const initial = loadFromStorage();
const debouncedSave = createDebouncedSave();

export const useAppStore = create<AppStore>((set, get) => ({
  nodes: initial.nodes,
  edges: initial.edges,

  addNode: (type, position) => {
    const node = createDefaultNode(type, position);
    set((s) => ({ nodes: [...s.nodes, node] }));
  },

  updateNodeData: (id, _type, patch) => {
    set((s) => ({
      nodes: s.nodes.map((n) => {
        if (n.id !== id) return n;
        // Safe cast: _type guarantees patch matches n.data's shape, and
        // the spread preserves the discriminant (n.type is unchanged).
        return { ...n, data: { ...n.data, ...patch } } as WorkflowNode;
      }),
    }));
  },

  connect: (edge) => {
    set((s) => ({ edges: [...s.edges, { ...edge, id: createId() }] }));
  },

  deleteNode: (id) => {
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
    }));
  },

  applyNodeChanges: (changes) => {
    set((s) => ({
      nodes: rfApplyNodeChanges(changes, s.nodes) as WorkflowNode[],
    }));
  },

  applyEdgeChanges: (changes) => {
    set((s) => ({
      edges: rfApplyEdgeChanges(changes, s.edges) as Edge[],
    }));
  },

  clearCanvas: () => {
    set({ nodes: [], edges: [] });
  },

  exportWorkflow: () => {
    const { nodes, edges } = get();
    const stripped = nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: n.data,
    }));
    return JSON.stringify({ version: 1, nodes: stripped, edges }, null, 2);
  },

  importWorkflow: (json: string) => {
    const parsed: unknown = JSON.parse(json);
    if (!isValidWorkflow(parsed)) {
      throw new Error('Invalid workflow file: wrong version or shape');
    }
    const resetNodes = parsed.nodes.map((n: WorkflowNode) => ({
      ...n,
      status: 'idle' as const,
      error: undefined,
      output: undefined,
    })) as WorkflowNode[];
    set({ nodes: resetNodes, edges: parsed.edges });
  },

  isRunning: false,

  runWorkflow: async (registry) => {
    const { nodes, edges } = get();

    // Reset all node statuses to idle before running
    set({
      isRunning: true,
      nodes: nodes.map((n) => ({ ...n, status: 'idle' as const, error: undefined })),
    });

    const workflow = { version: 1 as const, nodes: get().nodes, edges };

    try {
      const outputs = await engineRunWorkflow(
        workflow,
        registry,
        (event) => {
          set((s) => ({
            nodes: s.nodes.map((n) =>
              n.id === event.nodeId
                ? { ...n, status: event.status, error: event.error }
                : n,
            ),
          }));
        },
      );

      // Store outputs on the corresponding nodes
      set((s) => ({
        isRunning: false,
        nodes: s.nodes.map((n) => {
          const output = outputs.get(n.id);
          if (output !== undefined) {
            return { ...n, output } as WorkflowNode;
          }
          return n;
        }),
      }));
    } catch (err) {
      if (err instanceof CycleError) {
        set((s) => ({
          isRunning: false,
          nodes: s.nodes.map((n) =>
            err.nodeIds.includes(n.id)
              ? { ...n, status: 'error' as const, error: 'Part of a dependency cycle' }
              : n,
          ),
        }));
      } else {
        set({ isRunning: false });
        throw err;
      }
    }
  },
}));

// Auto-save on state changes via subscription
useAppStore.subscribe((state) => {
  debouncedSave(state.nodes, state.edges);
});
