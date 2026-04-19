import type { WorkflowNode, Edge, NodeType } from '../types';
import type { Character } from '../characters/types';
import type { MiniDrama } from '../miniDramas/types';

const STORAGE_KEY = 'node-canvas-workflow';
const CURRENT_VERSION = 3;

const VALID_NODE_TYPES: ReadonlySet<string> = new Set<string>([
  'textPrompt',
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
  characters?: Record<string, Character>;
  miniDramas?: Record<string, MiniDrama>;
}

export interface LoadedState {
  nodes: WorkflowNode[];
  edges: Edge[];
  characters: Record<string, Character>;
  miniDramas: Record<string, MiniDrama>;
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

  // Accept v1, v2, and v3
  if (obj.version !== 1 && obj.version !== 2 && obj.version !== 3) return false;
  if (!Array.isArray(obj.nodes) || !Array.isArray(obj.edges)) return false;

  for (const node of obj.nodes) {
    if (!isValidNode(node)) return false;
  }

  return true;
}

export function loadFromStorage(): LoadedState {
  const empty: LoadedState = { nodes: [], edges: [], characters: {}, miniDramas: {} };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return empty;

    const parsed: unknown = JSON.parse(raw);
    if (!isValidWorkflow(parsed)) return empty;

    return {
      nodes: parsed.nodes,
      edges: parsed.edges,
      characters: parsed.characters ?? {},
      miniDramas: parsed.miniDramas ?? {},
    };
  } catch {
    return empty;
  }
}

export function saveToStorage(
  nodes: WorkflowNode[],
  edges: Edge[],
  characters: Record<string, Character>,
  miniDramas: Record<string, MiniDrama>,
): void {
  const data: PersistedWorkflow = { version: CURRENT_VERSION, nodes, edges, characters, miniDramas };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function createDebouncedSave(
  delayMs = 300,
): (nodes: WorkflowNode[], edges: Edge[], characters: Record<string, Character>, miniDramas: Record<string, MiniDrama>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  return (nodes, edges, characters, miniDramas) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => saveToStorage(nodes, edges, characters, miniDramas), delayMs);
  };
}
