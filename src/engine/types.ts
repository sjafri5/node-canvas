import type {
  ExecutableNode,
  ExecutableNodeType,
  NodeStatus,
  Workflow,
} from '../types';

// ---------------------------------------------------------------------------
// RunContext — what every runner receives as its third argument
// ---------------------------------------------------------------------------

/**
 * Shared context passed to every node runner during execution.
 *
 * - `fetchFn`: An injectable fetch function. Defaults to globalThis.fetch in
 *   production; tests can substitute a stub without touching the network.
 * - `signal`: An AbortSignal for cooperative cancellation. Runners should
 *   forward it to fetch calls. Cancellation is out of scope for MVP but the
 *   plumbing is here so adding it later is a one-line change.
 */
export interface RunContext {
  fetchFn: typeof globalThis.fetch;
  signal: AbortSignal;
}

// ---------------------------------------------------------------------------
// NodeRunner — the contract a node-type runner must satisfy
// ---------------------------------------------------------------------------

/**
 * Async function that executes a single node.
 *
 * @typeParam N - The specific ExecutableNode variant this runner handles.
 *               Display-only nodes (ImageDisplayNode) are not executable and
 *               cannot have a runner registered — they are sinks.
 * @param node   - The node being executed (with its current data).
 * @param inputs - Upstream outputs gathered by the engine, keyed by
 *                 targetHandle name (e.g. `{ prompt: "a cat in space" }`).
 * @param ctx    - Shared run context (fetch, abort signal).
 * @returns The node's output. Must be NonNullable — a runner that succeeds
 *          always produces a value.
 */
export type NodeRunner<N extends ExecutableNode> = (
  node: N,
  inputs: Record<string, unknown>,
  ctx: RunContext,
) => Promise<NonNullable<N['output']>>;

// ---------------------------------------------------------------------------
// RunnerRegistry — type-safe mapping from ExecutableNodeType to its runner
// ---------------------------------------------------------------------------

/**
 * Maps each ExecutableNodeType to a NodeRunner parameterized on that specific
 * node variant. Only executable nodes appear as keys — 'imageDisplay' is not
 * a valid key and attempting to add it is a compile error.
 */
export type RunnerRegistry = {
  [K in ExecutableNodeType]: NodeRunner<Extract<ExecutableNode, { type: K }>>;
};

// ---------------------------------------------------------------------------
// Status change callback
// ---------------------------------------------------------------------------

/** Fired once per node status transition during a workflow run. */
export interface StatusChangeEvent {
  nodeId: string;
  status: NodeStatus;
  /** Present only when status is 'error'. */
  error?: string;
}

/**
 * Callback the engine invokes on every node status transition.
 * The UI subscribes to this to update per-node visual state.
 */
export type OnStatusChange = (event: StatusChangeEvent) => void;

// ---------------------------------------------------------------------------
// CycleError — thrown when the workflow graph contains a cycle
// ---------------------------------------------------------------------------

/**
 * Named error thrown by the engine **before any node executes** if the
 * workflow contains a dependency cycle. The `nodeIds` field lists the
 * nodes involved so the UI can highlight them.
 */
export class CycleError extends Error {
  public readonly nodeIds: string[];

  constructor(nodeIds: string[]) {
    super(`Cycle detected among nodes: ${nodeIds.join(', ')}`);
    this.name = 'CycleError';
    this.nodeIds = nodeIds;
  }
}

// ---------------------------------------------------------------------------
// runWorkflow — top-level execution entry point (signature only)
// ---------------------------------------------------------------------------

/**
 * Executes a workflow graph in dependency order.
 *
 * 1. Topologically sorts the nodes; throws CycleError if a cycle exists.
 * 2. Walks the sorted order. For each node:
 *    a. If the node's type is not in the registry (e.g. imageDisplay),
 *       skip it — it's a display-only sink, not executable.
 *    b. Gathers inputs from upstream outputs via edge mapping.
 *    c. Emits a 'running' status change.
 *    d. Calls the registered runner.
 *    e. Emits 'success' or 'error'. On error, downstream nodes are skipped
 *       but unrelated branches continue.
 * 3. Returns a map of nodeId → output for all successfully executed nodes.
 *
 * @param workflow   - The full workflow (nodes + edges).
 * @param registry   - Type-safe map of executable node type → runner function.
 * @param onChange   - Called on every status transition.
 * @param ctx        - Optional RunContext override (defaults are injected).
 */
export declare function runWorkflow(
  workflow: Workflow,
  registry: RunnerRegistry,
  onChange: OnStatusChange,
  ctx?: Partial<RunContext>,
): Promise<Map<string, unknown>>;
