import { describe, it, expect } from 'vitest';
import { topoSort } from './topoSort';
import { CycleError } from './types';
import type { Workflow, WorkflowNode, Edge } from '../types';

/** Minimal node factory — only id matters for topo sort. */
function node(id: string): WorkflowNode {
  return {
    id,
    type: 'textPrompt',
    position: { x: 0, y: 0 },
    status: 'idle',
    data: { prompt: '' },
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

function workflow(nodes: WorkflowNode[], edges: Edge[]): Workflow {
  return { version: 1, nodes, edges };
}

describe('topoSort', () => {
  it('sorts a linear chain in dependency order', () => {
    // A -> B -> C
    const result = topoSort(
      workflow([node('A'), node('B'), node('C')], [edge('A', 'B'), edge('B', 'C')]),
    );
    expect(result.indexOf('A')).toBeLessThan(result.indexOf('B'));
    expect(result.indexOf('B')).toBeLessThan(result.indexOf('C'));
  });

  it('sorts a diamond graph respecting both paths', () => {
    //   A
    //  / \
    // B   C
    //  \ /
    //   D
    const result = topoSort(
      workflow(
        [node('A'), node('B'), node('C'), node('D')],
        [edge('A', 'B'), edge('A', 'C'), edge('B', 'D'), edge('C', 'D')],
      ),
    );
    expect(result.indexOf('A')).toBeLessThan(result.indexOf('B'));
    expect(result.indexOf('A')).toBeLessThan(result.indexOf('C'));
    expect(result.indexOf('B')).toBeLessThan(result.indexOf('D'));
    expect(result.indexOf('C')).toBeLessThan(result.indexOf('D'));
  });

  it('handles disconnected subgraphs', () => {
    // A -> B,  C -> D (two separate chains)
    const result = topoSort(
      workflow(
        [node('A'), node('B'), node('C'), node('D')],
        [edge('A', 'B'), edge('C', 'D')],
      ),
    );
    expect(result).toHaveLength(4);
    expect(result.indexOf('A')).toBeLessThan(result.indexOf('B'));
    expect(result.indexOf('C')).toBeLessThan(result.indexOf('D'));
  });

  it('returns a single node', () => {
    const result = topoSort(workflow([node('A')], []));
    expect(result).toEqual(['A']);
  });

  it('returns empty array for empty graph', () => {
    const result = topoSort(workflow([], []));
    expect(result).toEqual([]);
  });

  it('throws CycleError for a direct cycle', () => {
    // A -> B -> A
    expect(() =>
      topoSort(workflow([node('A'), node('B')], [edge('A', 'B'), edge('B', 'A')])),
    ).toThrow(CycleError);
  });

  it('throws CycleError for an indirect cycle', () => {
    // A -> B -> C -> A
    expect(() =>
      topoSort(
        workflow(
          [node('A'), node('B'), node('C')],
          [edge('A', 'B'), edge('B', 'C'), edge('C', 'A')],
        ),
      ),
    ).toThrow(CycleError);
  });

  it('populates CycleError.nodeIds with the nodes in the cycle', () => {
    // A -> B -> C -> B (cycle is B, C; A is not in the cycle)
    try {
      topoSort(
        workflow(
          [node('A'), node('B'), node('C')],
          [edge('A', 'B'), edge('B', 'C'), edge('C', 'B')],
        ),
      );
      expect.fail('Expected CycleError');
    } catch (err) {
      expect(err).toBeInstanceOf(CycleError);
      const cycleErr = err as CycleError;
      expect(cycleErr.nodeIds).toContain('B');
      expect(cycleErr.nodeIds).toContain('C');
      expect(cycleErr.nodeIds).not.toContain('A');
    }
  });
});
