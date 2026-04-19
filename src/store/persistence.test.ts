import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadFromStorage, saveToStorage } from './persistence';
import type { WorkflowNode, Edge } from '../types';
import type { Character, ViewId, CharacterView } from '../characters/types';
import { VIEW_IDS } from '../characters/types';

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

    saveToStorage(nodes, edges, {});
    const result = loadFromStorage();

    expect(result.nodes).toEqual(nodes);
    expect(result.edges).toEqual(edges);
    expect(result.characters).toEqual({});
  });

  it('returns empty state when key is missing', () => {
    const result = loadFromStorage();

    expect(result).toEqual({ nodes: [], edges: [], characters: {} });
  });

  it('returns empty state on corrupt JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json!!!');
    const result = loadFromStorage();

    expect(result).toEqual({ nodes: [], edges: [], characters: {} });
  });

  it('returns empty state on version mismatch', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 999, nodes: [textNode('a')], edges: [] }),
    );
    const result = loadFromStorage();

    expect(result).toEqual({ nodes: [], edges: [], characters: {} });
  });

  it('returns empty state when stored data has wrong shape', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, nodes: 'not an array' }));
    const result = loadFromStorage();

    expect(result).toEqual({ nodes: [], edges: [], characters: {} });
  });

  it('returns empty state when nodes contain garbage elements', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 2,
        nodes: [{ id: null, type: 'banana', garbage: true }],
        edges: [],
      }),
    );
    const result = loadFromStorage();

    expect(result).toEqual({ nodes: [], edges: [], characters: {} });
  });

  it('returns empty state when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    const result = loadFromStorage();
    expect(result).toEqual({ nodes: [], edges: [], characters: {} });

    vi.restoreAllMocks();
  });

  it('migrates v1 saves: loads nodes/edges, sets empty characters', () => {
    const nodes = [textNode('a', 'v1 node')];
    const edges = [edge('a', 'a')];
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, nodes, edges }),
    );

    const result = loadFromStorage();

    expect(result.nodes).toEqual(nodes);
    expect(result.edges).toEqual(edges);
    expect(result.characters).toEqual({});
  });

  it('round-trips characters in v2 format', () => {
    const nodes = [textNode('a')];
    const views = Object.fromEntries(
      VIEW_IDS.map((v) => [v, { viewId: v, status: 'pending' as const }]),
    ) as Record<ViewId, CharacterView>;
    const characters: Record<string, Character> = {
      'jfk-a1b2': {
        id: 'jfk-a1b2',
        name: 'JFK',
        referenceImageUrl: 'data:image/jpeg;base64,abc',
        views,
        isComplete: false,
        createdAt: 1000,
        updatedAt: 1000,
      },
    };

    saveToStorage(nodes, [], characters);
    const result = loadFromStorage();

    expect(result.characters).toEqual(characters);
    expect(result.nodes).toEqual(nodes);
  });
});
