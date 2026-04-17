# Architecture

## The core bet

The execution engine is a pure function over a graph. `src/engine/runWorkflow.ts` takes a `Workflow`, a `RunnerRegistry`, and an `OnStatusChange` callback. It returns `Promise<Map<string, unknown>>`. No React in it, no DOM, no direct `fetch` calls — the `RunContext` injects a `fetchFn` and an `AbortSignal`, so tests substitute a stub and production binds `globalThis.fetch`.

I made this choice because the engine is the only part of the codebase with real logic. If it touched React state or called `fetch` directly, I'd need a browser to test it and a running server to iterate on it. Keeping it pure means I can unit-test the entire orchestrator — cycle detection, input propagation, error isolation across branches — in milliseconds with mocked runners. It also means the transport layer is swappable: move the engine into a queue worker, stream status back over WebSocket, and the UI changes are minimal because `OnStatusChange` is already the seam.

## How one run actually works

What happens when you click **Run** on a Text Prompt → Image Generation → Image Display graph:

1. `useAppStore.runWorkflow()` in `src/store/useAppStore.ts` fires. It sets `isRunning: true`, resets all node statuses to `idle`, snapshots the current `nodes` and `edges` into a `Workflow`, and calls `runWorkflow()` from `src/engine/runWorkflow.ts` with the runner registry from `src/nodes/registry.ts`.
2. The engine calls `topoSort()` from `src/engine/topoSort.ts` — Kahn's algorithm over the edge list. If there's a cycle, it throws `CycleError` with the offending node IDs before any runner executes. The store catches this and marks those specific nodes as `error: 'Part of a dependency cycle'`.
3. With a valid topological order (e.g., `['tp1', 'ig1', 'd1']`), the engine loops node-by-node:
   - **tp1 (textPrompt):** Its type is in the `RunnerRegistry`, so it's executable. No incoming edges, so `inputs` is `{}`. Engine emits `{ nodeId: 'tp1', status: 'running' }` → the store patches that node → React Flow re-renders just that node's `StatusBadge`. The `textPromptRunner` in `src/nodes/textPrompt/runner.ts` runs — it returns `{ text: node.data.prompt }`. Engine stores the output and emits `status: 'success'`.
   - **ig1 (imageGeneration):** Executable. Engine calls `gatherInputs()`, which walks inbound edges: it finds an edge with `targetHandle: 'prompt'` from `tp1` with `sourceHandle: 'text'`, reads `tp1`'s output `{ text: '...' }`, and maps it to `inputs.prompt`. The `imageGenerationRunner` in `src/nodes/imageGeneration/runner.ts` calls `ctx.fetchFn('/api/generate/image', ...)`, which hits the Vercel serverless function. On success, it returns `{ imageUrl: '...' }`.
   - **d1 (imageDisplay):** Its type is `imageDisplay`, which is not a key in `RunnerRegistry`. The engine's `isExecutableType()` check returns false, so it skips this node entirely. The `ImageDisplayNode` component reads the upstream image URL via `useNodeConnections` + a Zustand selector that walks the edge to find `ig1`'s output.
4. Engine returns the output map. The store writes outputs onto the corresponding nodes and sets `isRunning: false`.

If `ig1` had failed, the engine would mark it `error`, add it to `failedIds`, and `getDownstreamIds()` would find `d1` as a transitive dependent — but since `d1` is a non-executable sink, it's already skipped. If there were an executable node downstream of the failure, it would be skipped with `'Skipped: upstream node failed'`. Unrelated branches continue.

## Why a registry instead of a switch

Adding a node type touches three places: a new folder under `src/nodes/<type>/` with a component and runner, one new variant in the `WorkflowNode` union in `src/types.ts`, and one line in `src/nodes/registry.ts`. Then the compiler tells you everywhere else the new variant isn't handled — exhaustive `switch` statements, `Extract` constraints, runner type mismatches. A `switch` inside `runWorkflow` would be shorter today and painful in six months.

I tested this claim mid-build. The Prompt Enhance node was added after the first three node types were shipping. Total surface area: a new folder under `src/nodes/promptEnhance/` (component + runner + test), one new variant in the `WorkflowNode` union, one new entry each in `RunnerRegistry` and `nodeTypes`, and an `/api/generate/text` proxy. Zero changes to `src/engine/`. The compiler flagged every place that needed updating — the mock registry in tests, the `createDefaultNode` switch, the runtime `EXECUTABLE_TYPES` set. The registry pattern paid for itself the first time it was exercised.

## State: the one rule that matters

The Zustand store in `src/store/useAppStore.ts` owns `nodes` and `edges`. React Flow renders from it. When the user drags a node, React Flow fires `onNodesChange`, and `Canvas.tsx` applies the change back to the store via `rfApplyNodeChanges`. Same for edges and connections.

The alternative — letting React Flow own state and reading from it — breaks the moment you need anything beyond drag-and-drop. Persistence, execution, clear canvas, undo: all of these need a real store. Having two sources of truth is worse than one store with a thin adapter. Components subscribe to the smallest slice they need (`useAppStore((s) => s.nodes)`, not the whole store), so dragging one node doesn't re-render the sidebar.

## The executable/display distinction

`ExecutableNode = TextPromptNode | PromptEnhanceNode | ImageGenerationNode` in `src/types.ts`. `ImageDisplayNode` is excluded — it has no `output` field and no runner. `RunnerRegistry` maps `ExecutableNodeType` to runners, so `'imageDisplay'` is not a valid key at the type level. You literally cannot write `registry.imageDisplay = someRunner` without a compile error.

The alternative was adding a phantom `output?: { imageUrl: string }` to `ImageDisplayNode` to satisfy the generic constraint on `NodeRunner<N>`. That would compile, but it distorts the domain model — it implies display nodes produce something, invites code that reads `displayNode.output.imageUrl`, and hides the architectural intent. The current approach makes the engine's skip-non-executable logic self-documenting.

## Persistence and version field

`src/store/persistence.ts` subscribes to the store and writes `{ version: 1, nodes, edges }` to localStorage, debounced at 300ms. On init, `loadFromStorage()` validates the version and shape before hydrating. Wrong version, corrupt JSON, missing key, `localStorage` throwing — all fall back to an empty canvas. The version field exists because schema migration is the first thing that breaks when you iterate on a product like this. I didn't want to discover that mid-migration.

## API keys and the proxy

API keys live exclusively in serverless functions. `api/generate/image.ts` reads `FAL_KEY`; `api/generate/text.ts` reads `OPENAI_API_KEY`. Client-side code calls these through `ctx.fetchFn` — the runners in `src/nodes/imageGeneration/runner.ts` and `src/nodes/promptEnhance/runner.ts` have no idea which provider they're talking to. They just call a URL and parse the response.

## Where I'd go next

- **Branching / comparative runs.** The DAG already supports fan-out — one Text Prompt feeding three Image Generation nodes works today. What's missing is a UI affordance to wire it quickly and a view to compare outputs side-by-side.
- **Undo/redo.** A command stack over the Zustand store. Every mutation becomes a command with `apply` and `invert`. The store is already the single owner, so this is additive.
- **Server-side execution.** Move the engine (already pure, no DOM) into a queue worker. Stream status back over WebSocket. The `OnStatusChange` callback is the seam — the UI just gets events from a different source.
- **Techniques.** Basic JSON export/import is shipped — full workflow round-trip with validation. The next step is saved subgraph templates: select a subset of nodes, export as a technique, import into an existing workflow by rewriting IDs and merging rather than replacing.

## Known rough edges

- **No run cancellation wired to UI.** `AbortSignal` is plumbed through `RunContext` and the image runner forwards it to `fetch`, but there's no Cancel button. Adding one is a matter of storing the `AbortController` in the store and calling `.abort()`.
- **ImageDisplay picks the first upstream connection.** `useNodeConnections` returns all connections on the `image` handle, but the component reads `connections[0]?.source`. Fine for the current one-to-one wiring, but would need a clearer contract if multiple sources were allowed.
- **No rate limiting on the proxy.** The serverless function at `api/generate/image.ts` forwards every request to fal.ai. A token bucket per IP would be the first thing to add before any public deployment.
- **Provider errors surface raw.** The image runner wraps the HTTP status and response text into the error message. A real product would normalize these into user-facing messages.
- **O(N×E) downstream recomputation on failure.** `runWorkflow` calls `getDownstreamIds()` inside the execution loop; each call walks the full edge list. With a few nodes this is invisible; at 200+ nodes it would be worth caching. Fix: compute the failed-descendants set incrementally as each failure happens, rather than recomputing on every iteration.
- **Test factory duplication.** `textNode()`, `edge()`, and similar fixture helpers exist independently across `topoSort.test.ts`, `runWorkflow.test.ts`, and `persistence.test.ts` with slightly different signatures. Would consolidate into `src/test/fixtures.ts` once there's a fourth test file that needs them.
- **Import validation stops at the shape level.** `isValidWorkflow` validates that nodes have valid `id`, `type`, `position`, and `data` shapes, but doesn't validate that edges reference node IDs that exist, or that connection-validity rules (defined in `Canvas`) are satisfied at import time. A hand-crafted JSON with a dangling edge reference would hydrate into a broken state. Fix: cross-reference validation on import — reject any edge whose `source` or `target` isn't in the imported node set.
