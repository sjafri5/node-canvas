# Flora Fauna Clone — Technical Spec

> Take-home project for [company]. This doc is the pre-implementation design. It lives in the repo so a reviewer can see the thinking behind the code.

## 1. What we're building

A minimal node-based visual canvas for chaining AI generations, inspired by [Flora/Fauna](https://florafauna.ai). Users drop nodes onto an infinite canvas, wire them together, and run the graph to produce images from text prompts. Scoped aggressively to demonstrate **architecture and execution model**, not feature breadth.

## 2. Scope

### In scope (MVP)
- Infinite canvas with pan/zoom
- Three node types: **Text Prompt**, **Image Generation**, **Image Display**
- Drag nodes from a sidebar onto the canvas
- Connect node outputs to node inputs via edges
- Run the graph: execute nodes in dependency order, propagate outputs downstream
- Per-node execution state (`idle` / `running` / `success` / `error`)
- Persist workflow to localStorage; restore on refresh
- Deploy to Vercel

### Explicitly out of scope
- Auth, accounts, multi-user
- Backend database
- Real-time collaboration
- Video models
- Undo/redo
- Mobile layout

These are listed in the README under "What I'd build next" — scoping down deliberately is a signal, not an apology.

## 3. Stack

| Layer | Choice | Why |
|---|---|---|
| Build | Vite | Fast, minimal config, standard for React/TS |
| UI | React 18 + TypeScript (strict) | Industry default; TS carries the type discipline |
| Canvas | `@xyflow/react` (React Flow) | De facto for node UIs; saves weeks; reviewers recognize it |
| State | Zustand | Idiomatic with React Flow; simpler than Redux, better than prop drilling |
| Styling | Tailwind CSS | Fast iteration; no CSS file sprawl |
| AI — image | fal.ai (`flux/schnell`) | Cheap, fast, simple REST |
| Tests | Vitest + Testing Library | Fast, Vite-native |
| Lint/format | ESLint (flat config) + Prettier | Baseline hygiene |
| Deploy | Vercel | Zero-config for Vite + serverless functions for API proxy |

### Why a serverless proxy
Model API keys never ship to the browser. Requests go through `/api/generate/image` Vercel functions. Keys live in `.env.local` (dev) and Vercel env vars (prod). Only `FAL_KEY` is required — the Text Prompt node is a passthrough (no LLM call).

## 4. Data model

Discriminated unions over class hierarchies — TypeScript forces exhaustive handling everywhere a node type is matched.

```ts
type NodeType = 'textPrompt' | 'imageGeneration' | 'imageDisplay';
type NodeStatus = 'idle' | 'running' | 'success' | 'error';

interface BaseNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  status: NodeStatus;
  error?: string;
}

interface TextPromptNode extends BaseNode {
  type: 'textPrompt';
  data: { prompt: string };
  output?: { text: string };
  handles: { inputs: []; outputs: ['text'] };
}

interface ImageGenerationNode extends BaseNode {
  type: 'imageGeneration';
  data: Record<string, never>;
  output?: { imageUrl: string };
  handles: { inputs: ['prompt']; outputs: ['image'] };
}

interface ImageDisplayNode extends BaseNode {
  type: 'imageDisplay';
  data: Record<string, never>;
  handles: { inputs: ['image']; outputs: [] };
}

type WorkflowNode = TextPromptNode | ImageGenerationNode | ImageDisplayNode;

interface Edge {
  id: string;
  source: string;        // node id
  target: string;        // node id
  sourceHandle: string;  // output port name
  targetHandle: string;  // input port name
}

interface Workflow {
  version: 1;            // for localStorage migration later
  nodes: WorkflowNode[];
  edges: Edge[];
}
```

## 4b. Handle definitions

Each node type declares its input/output handles explicitly. The engine uses `targetHandle` to gather inputs from upstream `sourceHandle` outputs.

| Node Type | Inputs | Outputs |
|---|---|---|
| `textPrompt` | *(none)* | `text` |
| `imageGeneration` | `prompt` | `image` |
| `imageDisplay` | `image` | *(none)* |

**Note:** Handles are encoded in the type system (see §4) but at runtime are defined by the node components registering React Flow handles. The engine resolves `inputs.prompt` for the image runner by walking edges where `targetHandle === 'prompt'` and reading the source node's output keyed by `sourceHandle`.

## 5. Execution engine

The heart of the project. Pure logic, zero React — trivially testable.

### Responsibilities
- Take a workflow and a set of nodes to run (default: all)
- Topologically sort the subgraph
- Reject cycles with a clear, typed error
- For each node in order: gather inputs from upstream outputs, call the registered runner, store the output
- Emit status transitions so the UI can reflect progress

### Shape

```ts
// Per-type runner — pure async, no React, no DOM
type NodeRunner<N extends WorkflowNode> = (
  node: N,
  inputs: Record<string, unknown>,
  ctx: RunContext
) => Promise<NonNullable<N['output']>>;

// Registry pattern — adding a node type is one line
const runners: {
  [K in NodeType]: NodeRunner<Extract<WorkflowNode, { type: K }>>
};

// Entry point
async function runWorkflow(
  workflow: Workflow,
  onStatusChange: (nodeId: string, status: NodeStatus, error?: string) => void,
): Promise<Map<string, unknown>> { /* ... */ }
```

A registry beats a `switch(type)` in one god-function: new node types become a single file change (new runner + register). Closed to modification, open to extension.

### Error handling
- Cycle detection throws **before** any node runs
- A failed node marks itself `error`, sets a message, halts its downstream path, but lets unrelated branches continue
- Provider API errors surface the real message on the node
- **AbortController / cancellation:** out of scope for MVP. Noted as a known limitation.

## 6. State (Zustand)

One store. Slices for readability, not separate stores (premature at this scale).

```ts
interface AppStore {
  // graph
  nodes: WorkflowNode[];
  edges: Edge[];
  addNode: (type: NodeType, position: XY) => void;
  updateNodeData: <T extends WorkflowNode['type']>(
    id: string,
    type: T,
    patch: Partial<Extract<WorkflowNode, { type: T }>['data']>
  ) => void;
  connect: (edge: Omit<Edge, 'id'>) => void;
  deleteNode: (id: string) => void;

  // execution
  isRunning: boolean;
  runWorkflow: () => Promise<void>;

  // persistence is a subscription, not a method
}
```

**React Flow is NOT the source of truth.** The store is. React Flow renders from the store and dispatches changes back. Splitting state across two systems is the #1 way this kind of project becomes a mess.

## 7. File structure

```
src/
  app/
    App.tsx                    # shell: sidebar + canvas + toolbar
    Canvas.tsx                 # React Flow wrapper, wires store ↔ RF
    Sidebar.tsx                # draggable node palette
  nodes/
    registry.ts                # node type → component + runner
    textPrompt/
      TextPromptNode.tsx
      runner.ts                # passthrough — returns data.prompt as output.text
      types.ts
    imageGeneration/
      ImageGenerationNode.tsx
      runner.ts
      types.ts
    imageDisplay/
      ImageDisplayNode.tsx
      types.ts                 # no runner — passthrough
  engine/
    topoSort.ts                # pure
    topoSort.test.ts
    runWorkflow.ts
    runWorkflow.test.ts
  store/
    useAppStore.ts
    persistence.ts
    persistence.test.ts
  lib/
    api.ts                     # thin client for /api/generate/*
    id.ts                      # nanoid wrapper
  types.ts                     # shared domain types
  main.tsx
api/
  generate/
    image.ts                   # proxies fal.ai (FAL_KEY only)
```

**Colocation rule:** anything specific to a node type lives in its folder. Adding a node type = one new folder + one line in `registry.ts`.

## 8. Testing

Test what has logic. Don't test what React already tested.

### Must test
- `topoSort` — cycles, linear chains, diamonds, disconnected subgraphs
- `runWorkflow` — dependency order, input propagation, error halting, status emissions (runners mocked)
- `persistence` — serialize → deserialize round-trip, version check, graceful fallback on corrupt data

### Should test
- Each runner with the API client mocked

### Don't bother
- Snapshot tests of node components
- Canvas interaction tests (React Flow's problem, not ours)

Target: ~20–30 meaningful tests. Reviewers can smell coverage theater.

## 9. Milestones

| # | Deliverable | Commit prefixes |
|---|---|---|
| 0 | Scaffold: Vite + TS strict + ESLint + Prettier + Vitest + Husky | `chore:` |
| 1 | Canvas + sidebar; one dummy node type you can drag & place | `feat(canvas):` |
| 2 | Text Prompt + Image Display nodes + connections; store as source of truth | `feat(nodes):` |
| 3 | Execution engine: topo sort + runWorkflow + tests | `feat(engine):` |
| 4 | Image Generation node + fal.ai proxy | `feat(nodes):` |
| 5 | Persistence to localStorage with version field | `feat(persist):` |
| 6 | Error states, loading states, polish | `fix:`, `style:` |
| 7 | README, deploy to Vercel | `docs:`, `chore:` |
| 8 | Adversarial review pass; address red flags | `refactor:` |

Rough budget: **10–16 hours** of focused work.

## 10. What I'd build next

Ship this in the README as "Known limitations / what I'd build next":

- Auth + workspace persistence in Postgres
- Video nodes (Runway/Seedance)
- Branching and comparative runs — same input through multiple models
- Undo/redo via a command stack
- Export workflow as JSON; import JSON
- Reusable "Techniques" — save a subgraph as a template
- Real-time multi-user via Yjs or Liveblocks
- AbortController for run cancellation
- Text enhancement via LLM (OpenAI gpt-4o-mini) in Text Prompt node
- Model selector on Image Generation node (SDXL, etc.)

Signals awareness of the product direction and that scoping was deliberate.
