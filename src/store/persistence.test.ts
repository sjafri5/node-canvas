import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadFromStorage, saveToStorage } from './persistence';
import type { WorkflowNode, Edge } from '../types';

function textNode(id: string, prompt = ''): WorkflowNode {
  return {
    id,
    type: 'textPrompt',
    position: { x: 0, y: 0 },
    status: 'idle',
    data: { prompt },
  };
}

function edge(source: string, target: string): Edge {
  return {
    id: `${source}->${target}`,
    source,
    target,
    sourceHandle: 'text',
    targetHandle: 'prompt',
  };
}

const STORAGE_KEY = 'node-canvas-workflow';

describe('persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips: save then load returns the same data', () => {
    const nodes = [textNode('a', 'hello'), textNode('b', 'world')];
    const edges = [edge('a', 'b')];

    saveToStorage(nodes, edges);
    const result = loadFromStorage();

    expect(result.version).toBe(1);
    expect(result.nodes).toEqual(nodes);
    expect(result.edges).toEqual(edges);
  });

  it('returns empty workflow when key is missing', () => {
    const result = loadFromStorage();

    expect(result).toEqual({ version: 1, nodes: [], edges: [] });
  });

  it('returns empty workflow on corrupt JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json!!!');
    const result = loadFromStorage();

    expect(result).toEqual({ version: 1, nodes: [], edges: [] });
  });

  it('returns empty workflow on version mismatch', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 999, nodes: [textNode('a')], edges: [] }),
    );
    const result = loadFromStorage();

    expect(result).toEqual({ version: 1, nodes: [], edges: [] });
  });

  it('returns empty workflow when stored data has wrong shape', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, nodes: 'not an array' }));
    const result = loadFromStorage();

    expect(result).toEqual({ version: 1, nodes: [], edges: [] });
  });

  it('returns empty workflow when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    const result = loadFromStorage();
    expect(result).toEqual({ version: 1, nodes: [], edges: [] });

    vi.restoreAllMocks();
  });
});
