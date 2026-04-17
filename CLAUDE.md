# CLAUDE.md

Operating instructions for Claude Code working on this repository. Read at the start of every session.

## Project

Flora Fauna clone — a node-based visual canvas for chaining AI generations. **Take-home project being reviewed for technical competency by a senior engineer.** See `SPEC.md` for the full technical design. This file is the operating manual.

## Prime directive

This repository will be **read by a senior engineer making a hire decision.** Optimize for, in order:

1. Clarity over cleverness
2. Concrete code over premature abstraction
3. Precise types over escape hatches (`any`, `as unknown as X`, `@ts-ignore`)
4. Small, reviewable commits over large dumps
5. Honest scope over half-built features

If a change trades one of these away, stop and ask.

## Stack (do not substitute)

- Vite + React 18 + TypeScript (**strict mode on**)
- `@xyflow/react` for the canvas
- Zustand for state
- Tailwind CSS for styling
- Vitest + `@testing-library/react` for tests
- Vercel for deploy (serverless functions for the model API proxy)
- fal.ai (image) via server-side proxy (`FAL_KEY` only — no OpenAI dependency)

**Do not introduce new dependencies without explicit approval.** No Redux, no MobX, no styled-components, no Jest, no Chakra, no shadcn, no tRPC. If you think one is needed, say so and stop.

## File structure

See `SPEC.md §7`. Key rules:

- `src/engine/` is **pure TypeScript.** No React imports, no DOM, no `fetch`.
- `src/nodes/<type>/` colocates the component, runner, and types for each node type. Adding a node type = new folder + one line in `src/nodes/registry.ts`.
- Tests colocate with the file under test: `runWorkflow.ts` lives next to `runWorkflow.test.ts`.
- API proxies live in `/api/generate/*` (Vercel convention).

## TypeScript rules

- `strict: true` and `noUncheckedIndexedAccess: true`
- **No `any`.** No `as X` casts unless the line above has a comment explaining why.
- No `@ts-ignore` / `@ts-expect-error` without a comment.
- Prefer discriminated unions over `extends` hierarchies for domain types.
- Exported functions have explicit return types; local helpers can infer.
- Props types named `FooProps`, exported if reused.

## Naming

- Components: `PascalCase` (`TextPromptNode.tsx`)
- Hooks: `useCamelCase` (`useAppStore`)
- Pure functions / utilities: `camelCase`
- Types: `PascalCase`
- Files match their default export's casing

Names should read as nouns (data) or verbs (functions). `getNodeInputs` not `nodeInputs`. `runnableSubgraph` not `result`.

## State management rules

- One Zustand store: `useAppStore`
- Components subscribe to the **minimum slice** they need: `useAppStore((s) => s.nodes)`, not the whole store
- **React Flow is not the source of truth. The store is.** React Flow renders from the store and dispatches changes back
- No Context providers for app state. Tailwind + Zustand is enough

## Execution engine rules

- `src/engine/` is a black box: inputs in, outputs out, zero React, zero side effects beyond the `onStatusChange` callback
- Cycle detection runs **before any node executes.** Cyclic workflows throw a typed error; the UI surfaces it
- A failed node halts its downstream path but does not abort unrelated branches
- Runners are per-type async functions registered in `src/nodes/registry.ts`. **No `switch(type)`** in the engine itself

## Testing

- Test what has logic: engine, topo sort, persistence, runners
- Don't test what React/React Flow already tested: drag interactions, rendering
- A test file is required for every file in `src/engine/` and for `src/store/persistence.ts`
- Mock the network in runner tests. **No real API calls in CI.**
- Run `pnpm test` after any change in `src/engine/` or `src/store/`

## Commits

Conventional Commits. Examples:

- `feat(engine): add topological sort with cycle detection`
- `feat(nodes): add image generation node`
- `fix(persist): handle corrupt localStorage gracefully`
- `refactor(store): extract persistence into subscription`
- `test(engine): add diamond-graph dependency test`
- `docs: document runner contract in SPEC.md`
- `chore: upgrade vite to 5.2`

One logical change per commit. **If you catch yourself writing "and" in a commit message, split it.**

## Definition of done

A feature is not done until:

1. Compiles with zero TS errors
2. ESLint passes with zero warnings
3. Tests pass; new logic has new tests
4. README or SPEC.md updated if behavior changed
5. Commit(s) land with Conventional Commits format

## Anti-patterns — do NOT do these

- Do not create `interface` / `Factory` / `Provider` abstractions for code with one implementation. Wait until there are two.
- Do not write "just in case" props or options. YAGNI.
- Do not wrap trivial one-liners. `const getId = (n) => n.id` is not useful.
- Do not catch and swallow errors. If you catch, handle or re-throw with context.
- Do not use `useEffect` to sync Zustand with React Flow. Use selectors.
- Do not leave `console.log`. Remove before commit.
- **Do not put API keys in client code. Ever.** Use the `/api/generate/*` proxy.
- Do not commit `.env.local`, `node_modules/`, or build artifacts.
- Do not silently reformat files you didn't touch.

## When uncertain — stop and ask

Specifically, before:

- Adding a dependency
- Creating a new top-level folder
- Changing the data model in `types.ts`
- Any non-trivial change in `src/engine/`
- Writing more than ~150 lines of code in one turn

**Prefer one clarifying question over a confident wrong choice.**

## Dev loop

```bash
pnpm install
cp .env.example .env.local       # then fill in FAL_KEY
pnpm dev                         # Vite only (frontend — no /api routes)
pnpm dev:full                    # Vercel dev (frontend + /api serverless functions)
pnpm test                        # Vitest (watch)
pnpm lint                        # ESLint
pnpm typecheck                   # tsc --noEmit
pnpm build
pnpm verify                      # lint + typecheck + test — run before commit
```

**Note:** `pnpm dev:full` requires a one-time `vercel login`. It runs the full
stack including `/api/generate/image`. Use `pnpm dev` for frontend-only work.
