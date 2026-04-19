import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './useAppStore';
import type { WorkflowNode, Edge } from '../types';

function textNode(id: string, prompt: string): WorkflowNode {
  return {
    id,
    type: 'textPrompt',
    position: { x: 10, y: 20 },
    status: 'success',
    data: { prompt },
    output: { text: prompt },
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

describe('workflow export/import', () => {
  beforeEach(() => {
    useAppStore.setState({ nodes: [], edges: [] });
  });

  it('export strips statuses, outputs, and errors', () => {
    useAppStore.setState({
      nodes: [textNode('a', 'hello')],
      edges: [],
    });

    const json = useAppStore.getState().exportWorkflow();
    const parsed = JSON.parse(json) as { version: number; nodes: Record<string, unknown>[] };

    expect(parsed.version).toBe(3);
    expect(parsed.nodes).toHaveLength(1);
    const node = parsed.nodes[0];
    expect(node).toHaveProperty('id', 'a');
    expect(node).toHaveProperty('type', 'textPrompt');
    expect(node).toHaveProperty('position');
    expect(node).toHaveProperty('data');
    expect(node).not.toHaveProperty('status');
    expect(node).not.toHaveProperty('output');
    expect(node).not.toHaveProperty('error');
  });

  it('import rejects malformed JSON', () => {
    expect(() => useAppStore.getState().importWorkflow('{not valid')).toThrow();
  });

  it('import rejects wrong version', () => {
    const json = JSON.stringify({ version: 999, nodes: [], edges: [] });
    expect(() => useAppStore.getState().importWorkflow(json)).toThrow(
      'Invalid workflow file',
    );
  });

  it('import loads a valid workflow into the store with idle statuses', () => {
    const json = JSON.stringify({
      version: 1,
      nodes: [
        { id: 'x', type: 'textPrompt', position: { x: 0, y: 0 }, status: 'success', data: { prompt: 'hi' }, output: { text: 'hi' } },
      ],
      edges: [edge('x', 'y')],
    });

    useAppStore.getState().importWorkflow(json);
    const state = useAppStore.getState();

    expect(state.nodes).toHaveLength(1);
    expect(state.nodes[0]?.status).toBe('idle');
    expect(state.nodes[0] && 'output' in state.nodes[0] ? state.nodes[0].output : undefined).toBeUndefined();
    expect(state.edges).toHaveLength(1);
  });
});
