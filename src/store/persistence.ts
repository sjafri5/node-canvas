import type { WorkflowNode, Edge, Workflow, NodeType } from '../types';

const STORAGE_KEY = 'node-canvas-workflow';
const CURRENT_VERSION = 1;

const VALID_NODE_TYPES: ReadonlySet<string> = new Set<string>([
  'textPrompt',
  'promptEnhance',
  'imageGeneration',
  'imageDisplay',
  'referenceImage',
  'imageToImage',
  'imageToVideo',
  'videoDisplay',
]);

interface PersistedWorkflow {
  version: number;
  nodes: WorkflowNode[];
  edges: Edge[];
}

function isValidNodeType(type: unknown): type is NodeType {
  return typeof type === 'string' && VALID_NODE_TYPES.has(type);
}

function isValidNode(node: unknown): boolean {
  if (node == null || typeof node !== 'object') return false;
  const n = node as Record<string, unknown>;
  return (
    typeof n.id === 'string' &&
    n.id.length > 0 &&
    isValidNodeType(n.type) &&
    n.position != null &&
    typeof n.position === 'object' &&
    typeof (n.position as Record<string, unknown>).x === 'number' &&
    typeof (n.position as Record<string, unknown>).y === 'number' &&
    n.data != null &&
    typeof n.data === 'object'
  );
}

export function isValidWorkflow(data: unknown): data is PersistedWorkflow {
  if (data == null || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  if (obj.version !== CURRENT_VERSION) return false;
  if (!Array.isArray(obj.nodes) || !Array.isArray(obj.edges)) return false;

  for (const node of obj.nodes) {
    if (!isValidNode(node)) return false;
  }

  return true;
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
