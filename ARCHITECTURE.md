# Architecture

A short tour of how the system works. This is what I'd walk a teammate through on day one, and the doc I'd re-read before an architecture interview.

## The core bet

The bet I made early was that the execution engine should be boring: a pure function over a graph. No React in it, no `fetch` in it, no Zustand in it. It takes a workflow, walks the DAG, calls a per-type async function for each node, and returns a map of outputs. Everything reactive sits outside of it.

Why: the engine is the only thing in this repo with real logic. If I'd let it touch React state or network calls directly, it would be impossible to test without a browser and hard to reason about without running it. Keeping it pure means I can unit-test the whole orchestrator in milliseconds with mocked runners, and I can swap the transport layer later — server-side execution, a queue, whatever — without touching the orchestration logic.

The tradeoff is that a second layer (the store) has to stitch the engine back to the UI. That's the cost. I think it's worth it.

## How one run actually works

Trace what happens when you hit **Run** on this graph:

```
[Text Prompt] ──▶ [Image Generation] ──▶ [Image Display]
```

1. `useAppStore.runWorkflow()` fires. The store sets `isRunning = true`, snapshots the current `nodes` and `edges`, and calls `runWorkflow(workflow, onStatusChange)` from `src/engine/`.
2. The engine runs `topoSort(workflow)` first. If there's a cycle, it throws `CycleError` before a single API call goes out. The store catches this, flags the offending nodes, and stops.
3. With a valid topological order, the engine loops node-by-node. For each node:
   - Gather upstream outputs by walking incoming edges and reading from an in-memory `Map<nodeId, output>`.
   - Emit `onStatusChange(nodeId, 'running')`. The store updates the node's `status`, and React Flow re-renders that one node.
   - Look up the runner for the node's type from the registry and `await` it with the gathered inputs.
   - On success: write the output to the map, emit `'success'`. On failure: emit `'error'` with the message, and **don't enqueue** downstream nodes that depended on this one. Unrelated branches keep going.
4. When the loop finishes, the engine returns the full output map. The store sets `isRunning = false`.

The engine never knows what a "Text Prompt" node is. It just knows nodes have types, types have runners, and runners produce outputs. That's the whole contract.

## Why a registry instead of a switch

Every time I add a node type I touch three things and one line:

1. A new folder under `src/nodes/<type>/` with a component, a runner, and types
2. One line added to `src/nodes/registry.ts`
3. A new variant in the discriminated union in `src/types.ts`

Then TypeScript tells me everywhere else I need to handle it. This is the main architectural decision that would pay off at scale. A `switch` in `runWorkflow` would be shorter today and painful in six months.

## State: the one rule that matters

The Zustand store is the source of truth for nodes and edges. React Flow renders from it. When the user drags a node, React Flow fires `onNodesChange`, and I apply the change back to the store using React Flow's `applyNodeChanges` helper. Same for edges.

I know the alternative: let React Flow own the state and read from it. I didn't do that because the moment I need anything beyond drag-and-drop — persistence, execution, undo, a "clear canvas" button — I need a real store anyway, and having two sources of truth is worse than one store with a thin adapter.

Selectors are tight on purpose. Components subscribe to the smallest slice they need, so dragging a single node only re-renders that node and the edges connected to it, not the whole canvas. There's no React Context for app state — Zustand selectors make it unnecessary.

## Persistence

The store subscribes to its own `nodes` and `edges` slices and writes `{ version: 1, nodes, edges }` to localStorage on change, debounced at ~300ms. On mount, it reads the same key and validates the version before hydrating. If the schema is older or the blob is corrupt, it falls back to an empty canvas rather than crashing — graceful degradation is the whole point of the version field.

The version is there because schema migration is the first thing that breaks when you ship something like this for real. I didn't want future-me to discover it mid-migration.

## API keys and the proxy

Model calls go through `/api/generate/text` and `/api/generate/image`, two Vercel serverless functions. The client never sees the fal.ai or OpenAI keys. This sounds obvious, but it's the single most common mistake I see in side projects shipped this way.

## Where I'd go next

A few things I scoped out deliberately, with a sketch of how each would land:

**Branching / comparative runs.** The DAG already supports fan-out — one Text Prompt feeding three Image Generation nodes works today. What's missing is a UI affordance to wire it up quickly and a view to compare outputs side-by-side. Small feature, big product value.

**Undo/redo.** A command stack over the store. Every mutation becomes a command with `apply` and `invert`. Zustand makes this cheap because the store is already a single source of truth.

**Server-side execution.** Move the engine (already pure) into a queue worker, stream status back over WebSocket. The UI changes are minimal because `onStatusChange` is already the seam.

**Techniques.** Saved subgraphs you can drop onto a canvas. Serialize the subgraph to JSON, rewrite ids on import, merge into the current workflow.

## Known rough edges

Being honest about what isn't perfect:

- The Image Display node is dumb — it assumes one upstream image edge and picks the first. Fine for the demo, would want a clearer contract at scale.
- No cancellation of in-flight runs. Hitting **Run** twice quickly will race. I'd thread an `AbortController` through `RunContext`.
- Provider errors are surfaced as-is. A real product would normalize these.
- No rate limiting on the proxy. I'd add a token bucket per IP.

None of these are hard — they're just out of scope for a take-home. I'd rather flag them here than have them come up as gotchas in the interview.
