import type { Workflow, ExecutableNodeType, NodeType } from '../types';
import { executableTypes } from '../types';
import type { RunnerRegistry, OnStatusChange, RunContext } from './types';
import { topoSort } from './topoSort';

const EXECUTABLE_SET: ReadonlySet<string> = new Set<string>(executableTypes);

function isExecutableType(type: NodeType): type is ExecutableNodeType {
  return EXECUTABLE_SET.has(type);
}

/**
 * Collects all node IDs that are downstream (transitively) of the given set
 * of failed node IDs. Used to skip execution of nodes whose inputs are tainted.
 */
function getDownstreamIds(workflow: Workflow, failedIds: Set<string>): Set<string> {
  const downstream = new Set<string>();
  const queue = [...failedIds];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of workflow.edges) {
      if (edge.source === current && !downstream.has(edge.target)) {
        downstream.add(edge.target);
        queue.push(edge.target);
      }
    }
  }

  return downstream;
}

/**
 * Gathers inputs for a node by walking inbound edges and reading upstream outputs.
 * Returns a record keyed by targetHandle (e.g. { prompt: "a cat in space" }).
 */
function gatherInputs(
  nodeId: string,
  workflow: Workflow,
  outputs: Map<string, unknown>,
): Record<string, unknown> {
  const inputs: Record<string, unknown> = {};

  for (const edge of workflow.edges) {
    if (edge.target !== nodeId) continue;

    const upstreamOutput = outputs.get(edge.source);
    if (upstreamOutput != null && typeof upstreamOutput === 'object') {
      const outputRecord = upstreamOutput as Record<string, unknown>;
      inputs[edge.targetHandle] = outputRecord[edge.sourceHandle];
    }
  }

  return inputs;
}

export async function runWorkflow(
  workflow: Workflow,
  registry: RunnerRegistry,
  onChange: OnStatusChange,
  ctx?: Partial<RunContext>,
): Promise<Map<string, unknown>> {
  const sorted = topoSort(workflow);

  const resolvedCtx: RunContext = {
    fetchFn: ctx?.fetchFn ?? globalThis.fetch.bind(globalThis),
    signal: ctx?.signal ?? new AbortController().signal,
  };

  const outputs = new Map<string, unknown>();
  const failedIds = new Set<string>();

  const nodeMap = new Map(workflow.nodes.map((n) => [n.id, n]));

  for (const nodeId of sorted) {
    const node = nodeMap.get(nodeId);
    if (!node) continue;

    // Skip display-only sinks — they have no runner and produce no output
    if (!isExecutableType(node.type)) continue;

    // Skip nodes downstream of a failure
    const skipped = getDownstreamIds(workflow, failedIds);
    if (skipped.has(nodeId)) {
      onChange({ nodeId, status: 'error', error: 'Skipped: upstream node failed' });
      continue;
    }

    const inputs = gatherInputs(nodeId, workflow, outputs);

    onChange({ nodeId, status: 'running' });

    try {
      const runner = registry[node.type];
      // The registry is typed so runner matches the node type, but at runtime
      // we pass through the generic ExecutableNode. The cast is safe because
      // isExecutableType guards the branch and the registry key matches node.type.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (runner as any)(node, inputs, resolvedCtx);
      outputs.set(nodeId, result);
      onChange({ nodeId, status: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      onChange({ nodeId, status: 'error', error: message });
      failedIds.add(nodeId);
    }
  }

  return outputs;
}
