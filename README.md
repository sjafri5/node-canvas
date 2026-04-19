# Node Canvas -- Character Lock

Character Lock solves the hardest problem in AI video production: character consistency. A generated character looks different in every shot, which kills storytelling. Character Lock takes a disciplined approach: upload one reference image, name the character, generate 8 canonical views in parallel, approve each one, regenerate anything that drifts, lock them all. The result is a named, reusable character asset that you can pull into the canvas to drive downstream generation.

[Live demo](https://node-canvas-zeta.vercel.app)

![demo](./docs/demo.gif)

## The pitch

Round 1 I built a minimal Flora clone. Feedback was the CEO wasn't impressed. So I used Flora, and realized the question isn't "can you build a canvas" -- it's "do you have product judgment about AI creative tools."

I picked the hardest problem in AI video production -- character drift. Every serious creator using these tools fights it: the character looks different in every shot. I built Character Lock: upload one reference image, generate 8 canonical views in parallel -- front, 3/4, side, low angle, close-up, full body, environment -- user approves each, regenerates anything that drifts, locks them all. Result is a named, reusable character asset.

The canvas from v1 is still there -- Character Lock is a new entry in the sidebar under Templates. Zero changes to `src/engine/`. Zero new node types. Templates are composed experiences on top of the engine -- exactly what the typed registry was designed to enable.

The second template is Mini-drama Composer: pick a locked character, enter a premise, choose a tonal direction. GPT writes a 5-episode arc, then drafts each episode as a paste-ready Seedance 2.0 prompt in the 5-layer format I developed for my own micro-drama work -- shot framing, subject anchoring with @-referenced locked views, environment, lighting with specific source/direction vocabulary, and time-coded camera motion. Content moderation substitutions are automatic. The output is exactly what a Seedance user needs: reference setup instructions plus five 15-second shot lists, ready to paste. Two templates, zero engine changes.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full walkthrough.

Short version: a pure TypeScript engine (`src/engine/`) takes a typed workflow graph and a runner registry, does topological sort, executes nodes. Templates (`src/workflows/`) are composed experiences that reuse the engine, the store, and the node runners -- they don't modify any of them. Two templates added (Character Lock + Mini-drama Composer) with zero changes to `src/engine/`.

## Quick start

```bash
pnpm install
cp .env.example .env.local   # add FAL_KEY
pnpm dev:full                # vercel dev -- frontend + API proxy on :5173
```

`pnpm dev:full` requires a one-time `vercel login`. Use `pnpm dev` for frontend-only work.

## Stack

| Layer | Choice |
|---|---|
| Build | Vite |
| Language | TypeScript (strict, noUncheckedIndexedAccess) |
| Canvas | @xyflow/react |
| State | Zustand |
| Styling | Tailwind CSS |
| AI -- image gen | fal.ai (flux/schnell, nano-banana-pro, recraft-v4/pro) |
| AI -- img2img | fal.ai (nano-banana-pro/edit, flux-pro/kontext) |
| AI -- video | fal.ai (veo-3.1, seedance-2.0, kling-v3/pro) |
| AI -- text | OpenAI (gpt-4o-mini) for prompt enhancement |
| Tests | Vitest |
| Deploy | Vercel |

## What's next

**Seedance video generation.** Designed in [SPEC_V4.md](./SPEC_V4.md) section 8. Per-episode "Generate video" button on drafted episodes, calling `bytedance/seedance-2.0/reference-to-video` with the character's locked views as reference images. Opt-in, cost-disclosed. The prompt generation is the product today; video is the cherry on top.

## Known rough edges

- **3-character soft cap.** UX cap for cognitive reasons (picker noise), not storage. Easily raised later.
- **Character name can't be edited post-creation.** ID is derived from name at create time. Rename would require ID migration.
- **View generation cost.** Each view ~$0.04 via nano-banana-pro/edit. Full character = $0.32. No cost UI or confirmation dialogs.
- **Regenerate on a locked view unlocks silently.** Intentional -- regen is cheap, and the character is no longer "complete" so downstream workflows shouldn't treat it as ready.
- **No cascade delete.** Characters can be deleted, but if Mini-drama ships later, references may become orphans.
- **Queue-based video models (seedance, kling) have unreliable result fetch on fal.ai.** Default is veo-3.1-fast (synchronous). Queue models are available in the dropdown but may fail on result retrieval.

## Testing

82 tests across 15 files. Coverage focuses on where logic lives: execution engine (topo sort, error isolation, input propagation), character domain (slug, generateView, persistence migration), node runners (mocked fetch, parameter round-trip), and persistence (v1/v2 migration, character roundtrip).

```bash
pnpm test         # single run
pnpm verify       # lint + typecheck + test
```

## Project structure

```
src/
  app/
    App.tsx, Canvas.tsx, Sidebar.tsx   # shell, canvas, node palette + templates
    Router.tsx, routerUtils.ts         # hand-rolled router (3 routes)
  engine/                              # pure TypeScript -- no React, no DOM
    topoSort.ts, runWorkflow.ts        # Kahn's algo, DAG executor
  nodes/                               # colocated component + runner per type
    registry.ts                        # type -> component + runner mapping
    textPrompt/, imageGeneration/,
    imageToImage/, imageToVideo/,
    referenceImage/, imageDisplay/,
    videoDisplay/
  miniDramas/                          # mini-drama composer domain
    types.ts                           # Episode, MiniDrama, TonalPreset
    systemPrompts.ts                   # arc + episode 5-layer prompts
    tonalPresets.ts                    # 5 visual style presets
    referenceSetup.ts                  # @-tag reference block builder
    generateArc.ts, draftEpisode.ts    # GPT fetch helpers
    exportMiniDrama.ts                 # bundle to .txt
  characters/                          # character lock domain
    types.ts                           # ViewId, Character, CharacterView
    generateView.ts                    # img2img fetch helper
    viewPrompts.ts                     # 8 canonical view prompts
    slug.ts                            # name -> id helper
  workflows/
    miniDrama/                         # mini-drama composer UI
      MiniDramaListView.tsx
      MiniDramaDetailView.tsx
      EpisodeCard.tsx
      CollapsibleBlock.tsx
    characterLock/                     # character lock UI
      CharacterLockListView.tsx        # list + inline setup
      CharacterLockDetailView.tsx      # 8-card approval grid
      ViewCard.tsx                     # single view card
      Toast.tsx                        # completion toast
  store/
    useAppStore.ts                     # Zustand: nodes, edges, characters
    persistence.ts                     # localStorage v2 with migration
  types.ts                            # WorkflowNode, Edge, model types
api/
  generate/
    image.ts                           # fal.ai text-to-image proxy
    image-to-image.ts                  # fal.ai img2img proxy
    video.ts                           # fal.ai video proxy (sync + queue)
    fal-proxy.ts                       # generic fal.ai URL proxy for polling
    text.ts                            # OpenAI text proxy
```
