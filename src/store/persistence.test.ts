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

  it('round-trips a complete character with all 8 locked views', () => {
    const views = Object.fromEntries(
      VIEW_IDS.map((v) => [
        v,
        {
          viewId: v,
          status: 'locked' as const,
          imageUrl: `https://fal.ai/${v}.png`,
          generatedAt: 2000,
        },
      ]),
    ) as Record<ViewId, CharacterView>;
    const characters: Record<string, Character> = {
      'raza-x1y2': {
        id: 'raza-x1y2',
        name: 'Raza',
        referenceImageUrl: 'data:image/jpeg;base64,ref123',
        views,
        isComplete: true,
        createdAt: 1000,
        updatedAt: 3000,
      },
    };

    saveToStorage([], [], characters);
    localStorage.getItem('node-canvas-workflow');

    // Simulate export → clear → import by reading raw JSON
    const exported = localStorage.getItem('node-canvas-workflow')!;
    localStorage.clear();
    localStorage.setItem('node-canvas-workflow', exported);

    const result = loadFromStorage();

    expect(result.characters['raza-x1y2']).toBeDefined();
    const char = result.characters['raza-x1y2']!;
    expect(char.name).toBe('Raza');
    expect(char.isComplete).toBe(true);
    expect(char.referenceImageUrl).toBe('data:image/jpeg;base64,ref123');

    // All 8 views preserved with locked status and image URLs
    for (const viewId of VIEW_IDS) {
      const view = char.views[viewId];
      expect(view?.status).toBe('locked');
      expect(view?.imageUrl).toBe(`https://fal.ai/${viewId}.png`);
    }
  });
});
