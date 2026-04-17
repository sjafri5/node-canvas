# Spec v2 — Micro-drama Studio

> Round 2 of the take-home. Supersedes scope in `SPEC.md` but reuses its architecture. The engine, store, persistence, typed registry, and serverless proxy pattern all stay. We are adding node types and a new workflow-first UI layer on top.

## 1. The pivot, in one paragraph

Round 1 shipped a minimal Flora-style canvas. Feedback from the CEO: not enough — "spend time with Flora, use your best judgment on what needs to make it in." After using Flora, the takeaway isn't that the canvas itself is the product; it's that **branching and ideation are**. Most creatives don't want to wire nodes — they want to push an idea, see variations, pick a direction, and go deeper. So we pivot: keep the canvas as a power-user escape hatch, but make the default experience an opinionated **vertical tool** for a creative job I actually do. The hero template is a **Micro-drama Scene Composer** — short-form serialized video content, the format I've been producing with Seedance 2.0. A secondary template, Storyboard Generator, ships if time allows. Both run on the same graph engine underneath.

## 2. Why micro-drama

Authenticity over market intuition. I produce this format. I've built a 5-layer prompt architecture for Seedance and developed character consistency workflows across reference assets. I know which stages of the creative process are painful and which feel magical. The CEO wanted product judgment. Product judgment built on lived experience is stronger than product judgment built on guessing what a market wants. Defending this in an interview is trivial — I've already made the micro-dramas; the tool encodes the process.

## 3. Product thesis

- Flora is a platform. This is a vertical tool.
- Branching is the primary interaction, not a byproduct.
- Templates ship as first-class experiences, not saved subgraphs.
- The canvas still exists — it's the power-user view, one click away.
- The same DAG engine powers both views. That's the architectural payoff of Round 1.

## 4. What's in scope

### New node types (4)

| Node | Purpose | Runner |
|---|---|---|
| `referenceImage` | User-uploaded image as a source. Outputs an image URL (base64 data URL, client-side compressed to 1024px max). | No external API — local file → data URL. |
| `imageToImage` | Input image + prompt, outputs new image. Used for character variations, framing alternatives, lighting treatments. | fal.ai Flux img2img. |
| `imageToVideo` | Input image + optional motion prompt, outputs video URL. | fal.ai — Veo 3 Fast preferred, Runway Gen-3 Turbo fallback. Pick one, hardcode. |
| `videoDisplay` | Renders a `<video autoplay loop muted playsInline>` tag. Sink, no runner. | — |

### New serverless proxies

- `api/generate/image-to-image.ts` — posts image + prompt to fal.ai Flux img2img. Returns `{ imageUrl }`.
- `api/generate/video.ts` — posts image + motion prompt to fal.ai video endpoint. fal.ai video is async — use their `subscribe` helper with a 120s timeout. Returns `{ videoUrl }` or a typed error.

### Workflow-first UI

The app gets a new home screen and a new staged view per workflow. The existing canvas becomes one of the views, not the default.

**Home screen (`/`):**

- Hero card: **Micro-drama Scene Composer**. Description + a representative reel still.
- Secondary card: **Storyboard Generator** (if built) or a "Coming soon" placeholder.
- Tertiary card: **Open Canvas** — the power-user view, Round 1's canvas. Smaller, lower visual weight.
- One sentence of product positioning at the top: *"Vertical tools for specific creative jobs, powered by a general graph engine."*

**Micro-drama workflow (`/microdrama`):**

Three-panel layout — left: scene brief input, middle: active stage with candidate grid, right: shot breakdown / final clip.

Stages, in order:

1. **Scene setup.** User enters:
   - Scene description (one paragraph, e.g. "Two strangers share a cigarette on a fire escape in Brooklyn, late summer, neither speaks.")
   - Optional character reference image (uploaded)
   - Optional location reference image (uploaded)
   - Tonal direction (free text or picker: "noir," "golden-hour indie," "neon Tokyo")

2. **Character sheet.** img2img from the reference produces 4 consistent-character variations: front, 3/4, dramatic low angle, expressive close-up. User picks the one that feels right. If no reference was uploaded, this stage uses text-to-image first to generate a character from the scene description, then branches from the best generation.

3. **Framing / composition.** 4 alternative compositions for the scene, each anchored to the chosen character sheet and — if provided — the location reference. Examples: wide establishing, over-the-shoulder two-shot, tight two-shot, detail insert. Each uses img2img with the character reference to maintain consistency.

4. **Lighting / mood.** 4 alternative treatments of the chosen framing — golden hour, harsh overhead, neon rim-light, blue-hour moonlight. Each via img2img with strong prompt influence and low structural drift.

5. **Camera movement.** Animate the chosen still into video with 4 motion alternatives — static with ambient motion, slow push-in, slight pan, whip reveal. Each generates via img-to-video in parallel.

6. **Export.** Final clip plays in the right panel. Download video, shot breakdown as JSON (all choices + intermediate images), or the whole project as a zip.

**Power-user affordance:** at any stage, a small "Open in Canvas" button reveals the underlying graph view — same nodes, same edges, same engine — so a reviewer can confirm the staged UI isn't smoke and mirrors; it's a visualization over a real DAG.

**Storyboard workflow (`/storyboard`) — secondary, build if time:**

Three-panel layout. Stages: (1) brief, (2) shot ideation — GPT-4o-mini proposes 6 candidate shots (wide, medium, close-up, POV, overhead, insert), (3) shot imaging — Flux generates one image per approved shot in parallel, (4) refinement — click any shot → 4 img2img variations, (5) animation — img-to-video on final shots, (6) export timeline + mp4s.

**Canvas view (`/canvas`):**

Round 1's canvas, unchanged. Every node type in the registry appears in the sidebar. Reachable from the home screen as the power-user escape hatch.

### Under the hood

Staged UIs are **composed subgraphs** built on top of the same engine. When the user hits "Generate character sheet," the app constructs a sub-workflow (`referenceImage` node → 4× `imageToImage` nodes fanned out, each with a different prompt variant) and runs it through the existing `runWorkflow`. The staged UI is a visualization and input layer over the graph — not a replacement.

Each stage produces child nodes. The user's selection at each stage becomes the anchor for the next stage's fan-out. This is the DAG being used the way it was designed: branching, selective commit, branching again. The Round 1 engine supported this from day one; we just didn't have a reason to exercise it until now.

## 5. What's out of scope

Explicit cuts, called out so a reviewer sees they were deliberate:

- **Video editing, transitions, audio.** Each shot stands alone. No cross-clip sequencing, no sound design.
- **Voiceover / TTS.** Different provider, different infra, not core to this thesis.
- **Upscaling, post-processing.** Generated assets are the deliverable.
- **Multi-provider model selector.** Flux for images, one video model. Don't expose a picker.
- **Collaboration, auth, cloud persistence.** Local-only with localStorage + existing export/import.
- **Save-as-template (user-authored templates).** Ship curated templates. User templates are "what I'd build next."

## 6. Architecture changes — minimal

The Round 1 architecture holds. What changes:

- `src/types.ts` — adds `ReferenceImageNode`, `ImageToImageNode`, `ImageToVideoNode`, `VideoDisplayNode` to the `WorkflowNode` union. The first three join `ExecutableNode`. `videoDisplay` is a sink, alongside `imageDisplay`.
- `src/engine/` — **untouched.** The claim is "adding node types is additive." This is that claim being cashed.
- `src/nodes/registry.ts` — 4 new entries.
- `src/nodes/<type>/` — 4 new folders (component + runner + test where applicable).
- `src/nodes/connections.ts` — new file. Extracts valid-connection rules from Canvas into a shared module. Single source of truth consumed by both the canvas `isValidConnection` and any template's subgraph builder.
- `src/store/useAppStore.ts` — adds helpers for constructing pre-composed subgraphs. Does not change existing behavior.
- `src/templates/` — new directory. One file per template: `microdrama.ts` (hero), optionally `storyboard.ts`. Each exports `{ id, name, description, stages, buildStageWorkflow(stage, input): Workflow }`.
- `src/app/` — adds `Home.tsx`, `MicrodramaView.tsx`, optionally `StoryboardView.tsx`. `App.tsx` becomes a router. `Canvas.tsx` moves behind `/canvas`.
- `api/generate/` — adds `image-to-image.ts` and `video.ts`.

## 7. Data model additions

```ts
interface ReferenceImageNode extends BaseNode {
  type: 'referenceImage';
  data: { imageDataUrl: string; label?: string };  // label: 'character', 'location'
  output?: { imageUrl: string };
}

interface ImageToImageNode extends BaseNode {
  type: 'imageToImage';
  data: { prompt: string; strength?: number };  // default strength 0.7
  output?: { imageUrl: string };
}

interface ImageToVideoNode extends BaseNode {
  type: 'imageToVideo';
  data: { motionPrompt?: string; durationSeconds?: number };  // default 5s
  output?: { videoUrl: string };
}

interface VideoDisplayNode extends BaseNode {
  type: 'videoDisplay';
  data: Record<string, never>;
}

// Templates
interface StageDef {
  id: string;                          // 'characterSheet', 'framing', etc.
  name: string;                        // display name
  description: string;                 // what this stage does, one sentence
  fanOutCount: number;                 // how many candidates to generate
  buildSubgraph: (
    input: StageInput,
    priorSelection: unknown,
  ) => Workflow;                       // pure function → engine-ready subgraph
}

interface Template {
  id: 'microdrama' | 'storyboard';
  name: string;
  description: string;
  stages: StageDef[];
}
```

Handle naming stays camelCase. New handles:

- `referenceImage.image` (output)
- `imageToImage.image` (input), `imageToImage.image` (output — same name is fine; they're on opposite sides)
- `imageToVideo.image` (input), `imageToVideo.motion` (input, optional), `imageToVideo.video` (output)
- `videoDisplay.video` (input)

Decide on naming during Milestone 0 and codify in `connections.ts`.

## 8. Runner contracts

```ts
// referenceImage — passthrough
runReferenceImage: (node) => ({
  imageUrl: node.data.imageDataUrl,
});

// imageToImage — fal.ai Flux img2img
runImageToImage: async (node, inputs, ctx) => {
  const upstreamImage = inputs.image;
  if (typeof upstreamImage !== 'string') {
    throw new Error('imageToImage requires an upstream image');
  }
  const res = await ctx.fetchFn('/api/generate/image-to-image', {
    method: 'POST',
    body: JSON.stringify({
      imageUrl: upstreamImage,
      prompt: node.data.prompt,
      strength: node.data.strength ?? 0.7,
    }),
    signal: ctx.signal,
  });
  if (!res.ok) throw new Error(`img2img failed: ${await res.text()}`);
  return (await res.json()) as { imageUrl: string };
};

// imageToVideo — fal.ai Veo/Gen-3, async via proxy
runImageToVideo: async (node, inputs, ctx) => {
  const upstreamImage = inputs.image;
  if (typeof upstreamImage !== 'string') {
    throw new Error('imageToVideo requires an upstream image');
  }
  const res = await ctx.fetchFn('/api/generate/video', {
    method: 'POST',
    body: JSON.stringify({
      imageUrl: upstreamImage,
      motionPrompt: node.data.motionPrompt,
      durationSeconds: node.data.durationSeconds ?? 5,
    }),
    signal: ctx.signal,
  });
  if (!res.ok) throw new Error(`video failed: ${await res.text()}`);
  return (await res.json()) as { videoUrl: string };
};
```

## 9. fal.ai specifics

Verify fal.ai docs at build time; don't assume endpoints. As of this spec:

- **Image-to-image**: `fal-ai/flux/dev/image-to-image` — accepts `image_url`, `prompt`, `strength`. ~$0.003 per call.
- **Video**: prefer `fal-ai/veo3/fast` if available; fall back to `fal-ai/runway-gen3/turbo/image-to-video`. Pick one during Milestone 0, hardcode. Veo 3 Fast ~$0.50 per 5s clip; Gen-3 Turbo ~$0.25–0.40.

Budget reality: Faraz provided a $100 fal.ai cap. Video is the expensive call. Back-of-envelope at Veo prices: ~200 clips. Plenty for build + demo. **Aggressive caching** is non-negotiable — store `videoUrl` on the node's `output` and persist to localStorage so regenerating a canvas doesn't retrigger video jobs.

### The async video problem

fal.ai video jobs take 30–60 seconds. Two implementation paths:

1. **Server-side blocking.** Serverless function calls fal's `subscribe` helper, blocks until done, returns `{ videoUrl }`. Simplest. Vercel serverless has a 10s default timeout on Hobby, 300s on Pro. Verify the account's plan supports >= 120s.
2. **Client polling.** Proxy returns `{ jobId }` immediately; client polls `/api/generate/video/status/:jobId`. More robust for long jobs; more code.

**Decision**: Path 1 with 120s timeout, targeting Pro-tier timeouts. Fall back to Path 2 if stuck on Hobby. Either way, the engine doesn't know the difference — it just awaits the runner.

UX during the wait: the `imageToVideo` node shows a running state with a "Rendering ~45s" estimate. Engine already runs nodes in parallel where the DAG allows, so other stages can continue while video renders.

## 10. Milestone plan

Total budget: ~8 hours across today and tomorrow morning.

### Today (3–4 hours) — node types + proxies, smoke-test in canvas

| # | Deliverable | Est. |
|---|---|---|
| 0 | Commit `SPEC_V2.md`. Add the 4 new node types to `src/types.ts` (type definitions only). Create `src/nodes/connections.ts` as an empty shared module. Create `src/templates/` folder with an empty `index.ts`. Confirm `pnpm verify` green. | 0.25h |
| 1 | `referenceImage` node + component (file upload, client-side compression to 1024px jpeg 0.8) + runner + test. | 0.75h |
| 2 | `videoDisplay` sink component. No runner. | 0.25h |
| 3 | `imageToImage` node + serverless proxy + runner + test. Smoke-test in existing canvas. | 1h |
| 4 | `imageToVideo` node + serverless proxy (fal.ai subscribe) + runner + test. Decide Veo vs Gen-3. Smoke-test. This is the hardest piece — do it while energy is high. | 1.5h |
| 5 | Extract connection rules into `src/nodes/connections.ts`. Update `Canvas.tsx` to consume it. | 0.25h |
| 6 | Smoke test: build `referenceImage → imageToImage → imageToVideo → videoDisplay` in canvas. Verify end-to-end. Commit + push. | 0.25h |

**Stopping point for today:** 4 new node types functional in the existing canvas. No templates, no home screen, no micro-drama UI yet. Pure infrastructure.

### Tomorrow morning (4–5 hours) — templates + staged UI + docs

| # | Deliverable | Est. |
|---|---|---|
| 7 | Add routing. Move `Canvas.tsx` behind `/canvas`. Build `Home.tsx` with hero + secondary + tertiary cards. | 0.5h |
| 8 | `src/templates/microdrama.ts`: all 6 stage definitions + `buildSubgraph` functions for each. | 0.75h |
| 9 | `MicrodramaView.tsx`: three-panel layout, stage progression, candidate grid, selection state, stage transitions. | 1.5h |
| 10 | Wire each micro-drama stage to execute via the engine. Loading states, error states, per-node status. | 1h |
| 11 | (Optional) `storyboard.ts` + `StoryboardView.tsx`. Reuse what you can from `MicrodramaView`. Skip if short on time. | 1h |
| 12 | Rewrite `README.md`: new pitch, new demo GIF, updated stack table. Rewrite `ARCHITECTURE.md`: new section on "templates as subgraphs." | 0.5h |
| 13 | Record new demo: home → micro-drama → character sheet → framings → lighting → camera → final clip. 30–45 seconds. | 0.5h |
| 14 | Adversarial review + fixes. Push. Notify Faraz. | 0.5h |

## 11. What stays the same from Round 1

Put this in the README as evidence of architectural soundness:

- Engine (`src/engine/`) — **zero changes**. The whole claim of the registry architecture was "adding node types is additive." This pivot is that claim being cashed in at scale.
- Store, persistence, typed registry — unchanged.
- Serverless proxy pattern — same shape, two new endpoints.
- Existing 34 tests all still pass. New runners add ~8 tests. Target: 42+.
- Dark theme, handles, delete buttons, export/import — preserved.

## 12. The interview pitch

> "Round 1 I built a minimal Flora clone. The CEO's feedback was it needed to go deeper and engage with Flora's product surface more seriously. I spent time in Flora and the thing that struck me was: the canvas is a tool, but the product is branching. Creatives want to push an idea, see variations, pick a direction, go deeper. They don't want to wire nodes.
>
> So I pivoted to a vertical tool for a job I actually do — I produce micro-drama with Seedance — and built a Micro-drama Scene Composer: character sheet branching, framing alternatives, lighting treatments, camera movements, all converging on a single rendered clip. The canvas is still there, behind a route, as the power-user escape hatch.
>
> The architectural payoff is that Round 1's engine didn't change. I added four new node types — reference image, image-to-image, image-to-video, video display — without touching a line of the engine. The whole claim of the typed registry was 'adding node types is additive,' and the pivot tested that claim harder than Round 1 ever did."

## 13. Open questions / risks

- **Vercel timeout for video proxy.** Need to verify plan tier. If stuck on 10s, fall back to client polling.
- **fal.ai video endpoint choice.** Veo 3 Fast vs Gen-3 Turbo. Decide during Milestone 4 based on live availability and pricing. Don't ship a model selector.
- **Character consistency across stages.** The whole micro-drama value prop depends on the character looking the same in framing as in the character sheet as in the final video. img2img with the character reference should handle this, but needs empirical validation. If consistency drifts, use the original character reference as input to every subsequent img2img rather than chaining.
- **Reference image file size.** localStorage has a ~5MB practical limit. Client-side compress to 1024px jpeg 0.8 on upload. Enforced in the `referenceImage` component.
- **"No reference image" flow.** If a user starts a micro-drama without uploading a character reference, the character sheet stage needs to text-to-image first and then branch from the best result. Handle gracefully; don't block the flow.
- **Cost overruns from demo reruns.** Cache everything. Consider a "skip video" dev mode for iteration where video stages stub with a placeholder. Flag in rough edges.

## 14. Commit plan (indicative)

- `docs: add SPEC_V2 for micro-drama studio pivot`
- `feat(types): add referenceImage, imageToImage, imageToVideo, videoDisplay node types`
- `chore: scaffold src/nodes/connections.ts and src/templates/`
- `feat(nodes): add reference image upload node with client-side compression`
- `feat(nodes): add video display sink`
- `feat(api): add fal.ai image-to-image proxy`
- `feat(nodes): add image-to-image node and runner`
- `feat(api): add fal.ai video proxy with subscribe-based async`
- `feat(nodes): add image-to-video node with async handling`
- `refactor(connections): extract connection validity to shared module`
- `feat(app): add routing with home, canvas, micro-drama views`
- `feat(templates): add micro-drama template with 6 stages`
- `feat(ui): micro-drama staged view — scene, character, framing`
- `feat(ui): micro-drama staged view — lighting, camera, export`
- `docs: rewrite README with vertical-tool pitch`
- `docs: add templates-as-subgraphs section to ARCHITECTURE`

---

Spec is the plan. Execution follows.
