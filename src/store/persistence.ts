import type { WorkflowNode, Edge, Workflow } from '../types';

const STORAGE_KEY = 'node-canvas-workflow';
const CURRENT_VERSION = 1;

interface PersistedWorkflow {
  version: number;
  nodes: WorkflowNode[];
  edges: Edge[];
}

export function isValidWorkflow(data: unknown): data is PersistedWorkflow {
  if (data == null || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.version === CURRENT_VERSION &&
    Array.isArray(obj.nodes) &&
    Array.isArray(obj.edges)
  );
}

export function loadFromStorage(): Workflow {
  const empty: Workflow = { version: 1, nodes: [], edges: [] };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return empty;

    const parsed: unknown = JSON.parse(raw);
    if (!isValidWorkflow(parsed)) return empty;

    return { version: 1, nodes: parsed.nodes, edges: parsed.edges };
  } catch {
    return empty;
  }
}

export function saveToStorage(nodes: WorkflowNode[], edges: Edge[]): void {
  const data: PersistedWorkflow = { version: CURRENT_VERSION, nodes, edges };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function createDebouncedSave(delayMs = 300): (nodes: WorkflowNode[], edges: Edge[]) => void {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  return (nodes: WorkflowNode[], edges: Edge[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => saveToStorage(nodes, edges), delayMs);
  };
}
