# Spec v3 — Character Lock

> Round 3 / product pivot. Scoped to a single workflow: **Character Lock**. Supersedes SPEC.md and SPEC_V2.md for product direction. The v1 engine and v2 node types are preserved and unchanged. We are adding a new `TEMPLATES` section in the sidebar and the first template: Character Lock.
>
> **Mini-drama Composer is designed in §8 as the next workflow, but NOT built in this session.** Shipping one great workflow > two half-built ones.

## 1. The product, in one paragraph

Character drift is the hardest problem in AI video production. A generated character looks different in every shot, which kills storytelling. Existing tools don't solve this end-to-end. Character Lock takes a disciplined approach: upload one reference image, name the character, and the tool generates 8 canonical views in parallel — front, 3/4 left, 3/4 right, side profile, low angle, close-up, full body, environment shot. The user approves each view by locking it. Bad generations get regenerated until they're right. Only when all 8 views are locked does the character become a complete, reusable named asset. The tool doesn't pretend to solve drift with magic; it gives creatives a disciplined workflow for achieving consistency with their own judgment.

## 2. Why this framing

v1 shipped a minimal Flora clone. Feedback was it needed to go deeper. v2 attempted a broader Flora-clone with more nodes — still missed the point. The real question is "do you have product judgment about AI creative tools." Character Lock answers that with a concrete product thesis: **solve the actual hardest problem in AI video, with a disciplined user-in-the-loop workflow, as a first-class template alongside the existing canvas.**

The interview pitch:

> "Round 1 I built a Flora clone. Feedback was the CEO wasn't impressed. I realized the question wasn't 'can you build a canvas,' it was 'do you have product judgment.' I picked the hardest problem in AI video production — character consistency — and built a template that solves it. Upload one reference, generate 8 canonical views, approve each one, regenerate anything that drifts, lock them all. You get a named, reusable character asset. The architectural payoff: I didn't touch the v1 engine or the v2 node types. Templates are a new entry in the sidebar, a new store slice, and a routed view. The registry pattern designed to make 'adding experiences additive' proved out."

## 3. What's in scope this session

### 3.1 Sidebar change

The sidebar gets a new section below the existing `NODES` list:

```
NODES
  Text Prompt
  Image Generation
  Image Display
  Reference Image
  Image to Image
  Image to Video
  Video Display

TEMPLATES
  Character Lock
```

`NODES` list is preserved exactly. `TEMPLATES` has the same visual weight — not minimized, not hero — just another category. Clicking "Character Lock" navigates to `/templates/character-lock`.

The canvas remains the default view at `/`. No homepage change.

### 3.2 Character Lock workflow (`/templates/character-lock`)

Two views under this route:

**List view** (default at `/templates/character-lock`):
- Header: "Characters"
- Button: "+ New character"
- List of existing characters (complete or in-progress) as cards with thumbnail, name, and progress indicator ("6 of 8 locked" or "✓ Complete")
- Click a card to open the character's detail view

**Detail view** (`/templates/character-lock/[characterId]`):

Two sub-states:

A. **Setup** (only on brand-new characters with no generations started):
- Upload field for a reference image (accept jpeg/png/webp, client-side compress to 1024px, jpeg 0.8)
- Name field (free text, must not be empty)
- Button: "Generate 8 views"
- On click: create 8 view records in `pending` state, kick off 8 parallel generations, navigate to the generation grid

B. **Generation grid** (once generation has started):
- Title: the character name
- 8 cards in a 4×2 grid, one per canonical view
- Each card shows:
  - View label at top (e.g. "Front Portrait")
  - Image area (loading skeleton while pending, image when ready, error with retry when failed)
  - Two buttons: **Lock** / **Regenerate**
    - `pending`: both disabled, skeleton shown
    - `ready`: Lock enabled, Regenerate enabled
    - `locked`: Lock shown as "Locked" with accent border, Regenerate still enabled (click to unlock + regenerate)
    - `error`: Retry button replaces Lock, Regenerate available
- Below the grid, a progress bar: "[N] of 8 locked"
- Toast when all 8 locked: "[Name] is ready to use."

Characters persist across sessions in localStorage. Partial characters (fewer than 8 locked) are preserved so the user can come back.

### 3.3 The 8 canonical views

```
1. front             Front portrait, eye-level, neutral expression, looking at camera
2. threeQuarterLeft  3/4 view facing slightly left, looking at camera
3. threeQuarterRight 3/4 view facing slightly right, looking at camera (mirrored)
4. sideProfile       Pure side profile, looking forward
5. lowAngle          Dramatic low angle, camera below looking up — power shot
6. closeUp           Expressive close-up, emotional/intense look, tight framing
7. fullBody          Full body standing, head to toe, neutral pose
8. environment       Character in context — medium shot with environmental background
```

Each view has a prompt template that takes the character's reference and produces the specific framing. The templates live in `src/workflows/characterLock/viewPrompts.ts` and look like:

```ts
export const VIEW_PROMPTS: Record<ViewId, string> = {
  front: "Same subject, eye-level front portrait, neutral expression, looking directly at camera, studio lighting, same character identity preserved.",
  threeQuarterLeft: "Same subject, 3/4 view facing slightly left, looking at camera, same character identity preserved, studio lighting.",
  threeQuarterRight: "Same subject, 3/4 view facing slightly right, looking at camera, same character identity preserved, studio lighting.",
  sideProfile: "Same subject, pure side profile facing left, looking forward, same character identity preserved, studio lighting.",
  lowAngle: "Same subject, dramatic low camera angle looking up, cinematic, same character identity preserved.",
  closeUp: "Same subject, expressive close-up, intense emotional look, tight framing on face, same character identity preserved.",
  fullBody: "Same subject, full body standing shot, head to toe, neutral pose, same character identity preserved.",
  environment: "Same subject in an environmental context, medium shot, background matches the scene tone of the original, same character identity preserved.",
};
```

Every prompt ends with "same character identity preserved" — Nano Banana Pro weighs this phrasing heavily for subject retention.

## 4. Architecture

### 4.1 What stays unchanged

- `src/engine/` — zero changes
- `src/nodes/` — no new node types
- `src/types.ts` — existing `WorkflowNode` union stays
- Canvas view at `/` — unchanged
- Existing proxies — `api/generate/image-to-image.ts` reused directly for view generation
- Existing store slices for nodes/edges/persistence/workflow export — untouched

### 4.2 What's added

New types in `src/types.ts` (or new file `src/characters/types.ts`):

```ts
export type ViewId =
  | 'front'
  | 'threeQuarterLeft'
  | 'threeQuarterRight'
  | 'sideProfile'
  | 'lowAngle'
  | 'closeUp'
  | 'fullBody'
  | 'environment';

export const VIEW_IDS: readonly ViewId[] = [
  'front',
  'threeQuarterLeft',
  'threeQuarterRight',
  'sideProfile',
  'lowAngle',
  'closeUp',
  'fullBody',
  'environment',
] as const;

export const VIEW_LABELS: Record<ViewId, string> = {
  front: 'Front Portrait',
  threeQuarterLeft: '3/4 Left',
  threeQuarterRight: '3/4 Right',
  sideProfile: 'Side Profile',
  lowAngle: 'Low Angle',
  closeUp: 'Close-up',
  fullBody: 'Full Body',
  environment: 'In Environment',
};

export type CharacterViewStatus = 'pending' | 'ready' | 'locked' | 'error';

export interface CharacterView {
  viewId: ViewId;
  status: CharacterViewStatus;
  imageUrl?: string;      // present when status is 'ready' or 'locked'
  error?: string;         // present when status is 'error'
  generatedAt?: number;
}

export interface Character {
  id: string;                                   // slug from name, with a short random suffix to avoid collisions
  name: string;                                 // display name
  referenceImageUrl: string;                    // compressed data URL of original upload
  views: Record<ViewId, CharacterView>;         // all 8 entries always present
  isComplete: boolean;                          // derived: every view is 'locked'
  createdAt: number;
  updatedAt: number;
}
```

New store slice on `useAppStore`:

```ts
interface CharacterSlice {
  characters: Record<string, Character>;
  createCharacter: (name: string, referenceImageUrl: string) => string; // returns id
  deleteCharacter: (id: string) => void;

  // View operations
  startViewGeneration: (characterId: string, viewId: ViewId) => void;
  setViewReady: (characterId: string, viewId: ViewId, imageUrl: string) => void;
  setViewError: (characterId: string, viewId: ViewId, error: string) => void;
  lockView: (characterId: string, viewId: ViewId) => void;
  unlockView: (characterId: string, viewId: ViewId) => void; // used by Regenerate

  // High-level actions (pure orchestration, no direct fetch)
  generateAllViews: (characterId: string) => Promise<void>;
  regenerateView: (characterId: string, viewId: ViewId) => Promise<void>;
}
```

**Important architectural note:** regeneration does NOT go through the DAG engine. Each view is a single independent img2img call. The store dispatches the call directly via a helper in `src/characters/generateView.ts`. This keeps the engine pure (it's for user-composed graphs on the canvas) and keeps Character Lock simple.

The generateView helper:

```ts
// src/characters/generateView.ts
export async function generateView(
  referenceImageUrl: string,
  viewId: ViewId,
): Promise<string> {
  const res = await fetch('/api/generate/image-to-image', {
    method: 'POST',
    body: JSON.stringify({
      model: 'nano-banana-pro/edit',
      imageUrl: referenceImageUrl,
      prompt: VIEW_PROMPTS[viewId],
      strength: 0.6, // tuned for subject preservation with meaningful variation
    }),
    signal: new AbortController().signal,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`View generation failed (${res.status}): ${text}`);
  }
  const data = (await res.json()) as { imageUrl: string };
  return data.imageUrl;
}
```

**Nano Banana Pro edit endpoint shape:** the fal.ai endpoint `fal-ai/nano-banana-pro/edit` accepts `image_urls` as an **array**. Our existing `api/generate/image-to-image.ts` proxy needs to support this — if it currently sends `image_url` (singular), extend it to send `[imageUrl]` as `image_urls` when the model is `nano-banana-pro/edit`. Verify by reading the proxy before writing new code against it.

### 4.3 Persistence

Extend existing `src/store/persistence.ts` to include the `characters` slice in its serialization. Bump the workflow version field to `2` — old saved canvases still load (versioned migration), and new saves include characters.

Also extend export/import: when a user exports their workflow JSON from the canvas toolbar, characters are included. Importing a workflow JSON with a `characters` key restores them.

### 4.4 Routing

Two routes total. Add a minimal router. Given we have only 2 routes and no need for deep nested routing, **hand-rolled is fine**: a tiny `Router` component reading `window.location.pathname` and using `history.pushState` on navigation. No new dependency needed.

Routes:
- `/` → existing canvas view (unchanged)
- `/templates/character-lock` → Character Lock list view
- `/templates/character-lock/[characterId]` → Character Lock detail view

If hand-rolling proves annoying (e.g. dynamic segment parsing), fall back to `react-router-dom` — small dep, widely trusted. Use judgment.

### 4.5 File structure additions

```
src/
  characters/                            # new top-level domain
    types.ts                             # ViewId, Character, etc.
    generateView.ts                      # the fetch helper
    viewPrompts.ts                       # VIEW_PROMPTS map
    slug.ts                              # name → id slug helper
  workflows/
    characterLock/
      CharacterLockListView.tsx          # /templates/character-lock
      CharacterLockDetailView.tsx        # /templates/character-lock/[id]
      SetupScreen.tsx                    # upload + name form
      ViewCard.tsx                       # one of the 8 cards in the grid
      useCharacterLock.ts                # hook encapsulating generation flow
  app/
    Router.tsx                           # minimal hand-rolled router
  store/
    useAppStore.ts                       # extended with characters slice
```

Existing files are edited, not rearranged:
- `src/app/App.tsx` — wrapped in Router, renders Canvas or CharacterLock views based on path
- `src/app/Sidebar.tsx` — adds `TEMPLATES` section below `NODES`
- `src/store/persistence.ts` — serializes characters alongside nodes/edges; bumps version to 2

### 4.6 Image compression and localStorage budget

Reference images uploaded by the user are compressed client-side before storing:
- Max dimension 1024px, scaled down proportionally
- Encoded as jpeg quality 0.8
- Typical result ~200-400 KB per image

Each character stores 9 images total (1 reference + 8 views). At worst case, ~3.6 MB per character. localStorage's practical limit is ~5 MB in Chrome, higher in Firefox.

**Pragmatic cap: allow up to 2 complete characters for MVP.** Warn on attempting to create a 3rd with a toast: "You're near localStorage capacity. Export one of your existing characters, then delete it to make room." The user can export to JSON and re-import when they need the old character again. Don't hard-block the 3rd character — warn and proceed.

Document this in the Rough Edges section of ARCHITECTURE.md.

## 5. Milestones — all this session

Budget: ~5 hours. Stop after each milestone, run `pnpm verify`, commit.

### M1 — Plumbing (1 h)

No UI. Infrastructure only.

- `src/characters/types.ts` with ViewId, VIEW_IDS, VIEW_LABELS, CharacterView, Character
- `src/characters/slug.ts` with `slugify(name)` producing stable ids
- `src/characters/viewPrompts.ts` with VIEW_PROMPTS map
- `src/characters/generateView.ts` with the fetch helper
- Verify `api/generate/image-to-image.ts` supports Nano Banana Pro edit (image_urls as array). Extend if not.
- Add `characters` slice to `useAppStore` with the ops listed in §4.2
- Extend `src/store/persistence.ts` to include `characters` in serialization. Bump schema version to 2, with a migration path that loads v1 workflows safely (missing characters → empty record).
- Tests: slug function, generateView happy path + error (mocked fetch), persistence round-trip with characters, migration from v1

Commits:
- `feat(types): add character lock domain types`
- `feat(characters): add view prompts and generation helper`
- `feat(api): support nano-banana-pro/edit image_urls array shape` (only if needed)
- `feat(store): add characters slice with crud and view ops`
- `feat(store): extend persistence to characters with v1→v2 migration`
- `test(characters): slug, generateView, persistence migration`

### M2 — Routing + setup screen (1 h)

- Hand-roll `Router.tsx` in `src/app/`
- Wrap `App.tsx` in Router. Canvas at `/`, Character Lock at `/templates/character-lock*`
- Add `TEMPLATES` section to `Sidebar.tsx` with "Character Lock" entry
- Build `CharacterLockListView.tsx`: header, "+ New character" button, empty state, list of existing characters as cards
- Build `SetupScreen.tsx`: upload input with client-side compression, name input, "Generate 8 views" button
- Clicking "Generate 8 views" calls `createCharacter` then `generateAllViews`, navigates to detail view

Commits:
- `chore(app): add minimal hand-rolled router for canvas and template routes`
- `feat(app): add templates section to sidebar`
- `feat(workflows): character lock list view with existing characters`
- `feat(workflows): character lock setup screen with upload and compression`

### M3 — Approval grid (1.5 h)

- Build `CharacterLockDetailView.tsx`: renders setup if no generations started, else the grid
- Build `ViewCard.tsx`: skeleton / image / error states, Lock and Regenerate buttons
- Wire Lock button to `lockView` store action. Locked card shows accent border, "Locked" text, Lock button disabled.
- Wire Regenerate to `regenerateView` store action — unlocks view, kicks off a fresh generation, image updates in place when ready
- Progress indicator at bottom of grid: "N of 8 locked"
- Toast on completion ("[Name] is ready to use"). Navigate back to list view after toast.

Commits:
- `feat(workflows): character lock detail view with 8-card grid`
- `feat(workflows): view card with lock and regenerate actions`
- `feat(workflows): completion toast and redirect on full lock`

### M4 — Polish (0.5 h)

- Sidebar shows a subtle count or thumbnail indicator for Character Lock if any characters exist
- Character cards in list view show thumbnail (first locked view, or reference if none locked yet)
- Export/import JSON roundtrips characters (verify)
- Test the flow end-to-end in the browser with a real reference image

Commits:
- `feat(sidebar): character count badge on character lock template`
- `feat(workflows): character card thumbnails in list view`
- `fix(persist): verify character export import round trip`

### M5 — Ship (0.5 h)

- Rewrite README.md with the new product pitch. Structure: hero paragraph ("Character Lock solves character consistency in AI video"), demo GIF placeholder, Quick Start, Architecture pointer, Stack, What's Out of Scope (mention Mini-drama as designed-in next), Testing, Project Structure.
- Update ARCHITECTURE.md with a new section: "Templates layer — experiences composed on top of the engine." Call out that Character Lock was added with zero changes to `src/engine/` — this is the architectural claim being cashed.
- Re-record demo GIF: sidebar → Character Lock → upload reference → name it → 8 views generate → regenerate one or two bad ones → lock all 8 → toast. ~30-45 seconds.
- Push to Vercel. Smoke-test production.
- Notify Faraz.

Commits:
- `docs: rewrite README for character lock product pivot`
- `docs: update ARCHITECTURE with templates layer`
- `docs: refresh demo gif for v3`

## 6. Testing

Focus unit tests on the pieces with real logic:
- `slug` — boundary cases (collisions, special characters, empty names)
- `generateView` — mocked fetch, happy path, non-2xx error, network error
- Persistence migration — v1 save loads as empty characters, v2 save roundtrips
- Character store ops — create, lockView, unlockView, derived `isComplete`

Skip: UI component tests. React components in this codebase are thin wiring over the store; the store is what matters.

Target: ~8-12 new tests. Total should be 42+ after this session.

## 7. Known risks & rough edges

Documented upfront, to be reflected in ARCHITECTURE.md's "Known rough edges":

- **localStorage 2-character soft cap.** Character count × 9 images × ~400 KB approaches 5 MB fast. Warn on 3rd character, let the user export-and-delete to make room.
- **Character name can't be edited post-creation.** The id is derived from the name at create time. Rename would require id migration across the store. Out of scope.
- **No cascade delete.** Characters can be deleted, but if Mini-drama ships later, drama → character references may become orphans. Handle at that time.
- **View generation is sequential at the fetch layer, parallel at the flow layer.** `generateAllViews` fires 8 fetches via `Promise.all`. fal.ai rate limits may serialize them on the server side. If it matters empirically, add concurrency control. Don't pre-optimize.
- **Nano Banana Pro edit cost.** Each view ~$0.04. Full character = $0.32. Regenerating heavily = real money. No cost UI, no confirmation dialogs. Acceptable for a demo; flag in rough edges.
- **Regenerate on a locked view unlocks it silently.** The Lock button flips off when Regenerate is clicked. No confirmation. Intentional (regen is cheap, the character isn't "complete" anymore so downstream workflows shouldn't see it as ready), but worth noting.

## 8. Next up — Mini-drama Composer (DEFERRED, DO NOT BUILD THIS SESSION)

Designed in full so the reviewer can see product vision and so the next build is a straightforward execution exercise, not a re-design.

**The workflow:**

1. Enter at `/templates/mini-drama`. List view shows existing mini-dramas (if any) and a "+ New mini-drama" button.
2. Setup: pick a locked character from a dropdown (populated from complete characters only — if none exist, disabled with "Lock a character first"), enter a premise, optional tonal picker.
3. Arc generation: a single GPT-4o-mini call produces 5 episode summaries (number, title, one-line summary each). Returns JSON, parsed into 5 episode cards.
4. Episode drafting: each card has a "Draft this episode" button. Clicking fires a per-episode GPT call with the premise, character name/reference, prior episode summaries as context, and the 5-layer format instructions. Streamed or awaited result fills the card with a full Seedance-ready prompt.
5. Each card has Regenerate and Copy. A bottom "Export all" button downloads a text file with all 5 episodes formatted.

No video generation anywhere — the prompts ARE the deliverable. The user pastes them into Seedance themselves. This is a product decision, not a cut: sharper positioning as "a tool FOR Seedance users, not a Seedance replacement."

**The 5-layer format** (strict — system prompt enforces this exactly):

```
EPISODE [N] — "[title]"

LAYER 1 — SHOT: [shot type, angle, camera move]
LAYER 2 — SUBJECT: @{characterName} ([which locked view], e.g. threeQuarterLeft), [action/pose], [physical state]
LAYER 3 — ENVIRONMENT: [location, time period, weather, time of day]
LAYER 4 — LIGHTING: [key light, fill, rim/back, atmosphere]
LAYER 5 — MOTION: [what moves, how, camera behavior across shot duration]

[@{characterName} = locked character, see locked views]
```

**Arc generation system prompt (indicative):**

```
You are a screenwriter specialized in micro-drama and serialized short-form video.
Produce a 5-episode arc: setup, complication, deepening, crisis, resolution/cliffhanger.
Return JSON:
{ "episodes": [{ "number": 1, "title": "...", "summary": "..." }, ...] }
No preamble. JSON only.
```

**Draft system prompt (indicative):**

```
You are a cinematographer and director. Produce Seedance-ready shot prompts in strict 5-layer format.
[format spec]
Context: premise, tonal direction, character name, available locked views, prior episodes, this episode's summary.
Produce ONE episode. No preamble, no explanation. Just the episode.
```

**Architecture impact when built:**
- New types: `Episode`, `MiniDrama`
- New store slice: `miniDramas`, `createMiniDrama`, `updateEpisode`
- New route: `/templates/mini-drama` and `/templates/mini-drama/[id]`
- New sidebar entry under TEMPLATES: "Mini-drama Composer" — disabled until a character is complete
- Uses existing `api/generate/text.ts` proxy for GPT calls
- Engine: zero changes

Pitch line: *"Mini-drama Composer is the next template. It pulls from the locked character asset produced by Character Lock, writes a 5-episode arc, drafts each episode in my 5-layer Seedance format. Designed, scoped, not built this session — I ship one workflow well rather than two poorly."*

## 9. The interview pitch (full, verbatim if you want)

> Round 1 I built a minimal Flora clone. Feedback was the CEO wasn't impressed. So I used Flora, and realized the question isn't 'can you build a canvas' — it's 'do you have product judgment about AI creative tools.'
>
> I picked the hardest problem in AI video production — character consistency. Every serious creator using these tools fights character drift: the character looks different in every shot. I built Character Lock: upload one reference image, generate 8 canonical views in parallel — front, 3/4, side, low angle, close-up, full body, environment — user approves each, regenerates anything that drifts, locks them all. Result is a named, reusable character asset.
>
> The canvas from v1 is still there — Character Lock is a new entry in the sidebar under Templates. Zero changes to `src/engine/`. Zero new node types. Templates are composed experiences on top of the engine — exactly what the typed registry was designed to enable.
>
> The natural next template is Mini-drama Composer: pick a locked character, write a premise, GPT drafts a 5-episode arc, output is Seedance-ready in my 5-layer format. Fully designed in SPEC_V3, scope-cut from this session. Shipping one great workflow is better than two rushed ones.
>
> And — this actually solves a problem. I'd use this tomorrow for my own micro-drama work.

---

Spec is the plan. Execution follows.
