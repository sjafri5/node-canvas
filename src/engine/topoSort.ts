import type { Workflow } from '../types';
import { CycleError } from './types';

/**
 * Topologically sorts workflow nodes using Kahn's algorithm (in-degree tracking).
 * Returns node IDs in valid execution order. Throws CycleError if a cycle exists.
 */
export function topoSort(workflow: Workflow): string[] {
  const { nodes, edges } = workflow;

  // Build adjacency list and in-degree map
  const inDegree = new Map<string, number>();
  const downstream = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    downstream.set(node.id, []);
  }

  for (const edge of edges) {
    const current = inDegree.get(edge.target);
    if (current !== undefined) {
      inDegree.set(edge.target, current + 1);
    }
    downstream.get(edge.source)?.push(edge.target);
  }

  // Seed queue with zero-in-degree nodes
  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  const sorted: string[] = [];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    sorted.push(nodeId);

    for (const target of downstream.get(nodeId) ?? []) {
      const newDegree = (inDegree.get(target) ?? 0) - 1;
      inDegree.set(target, newDegree);
      if (newDegree === 0) {
        queue.push(target);
      }
    }
  }

  // If not all nodes were visited, the remaining ones form a cycle
  if (sorted.length !== nodes.length) {
    const cycleNodeIds = nodes
      .filter((n) => !sorted.includes(n.id))
      .map((n) => n.id);
    throw new CycleError(cycleNodeIds);
  }

  return sorted;
}
