# Spec v4 — Mini-drama Composer

> Round 4. Second template on top of the engine + Character Lock foundation. Produces paste-ready Seedance 2.0 prompts in the 5-layer format. No video generation in scope (designed to ship tonight). Video gen available as a follow-up using `bytedance/seedance-2.0/reference-to-video` — see §8.

## 1. The product, in one paragraph

Mini-drama Composer takes a locked character plus a premise, writes a 5-episode arc, and drafts each episode as a production-ready Seedance 2.0 prompt in the 5-layer format. Output is a paste-ready shot list — reference setup block, shared visual style, five 15-second Seedance prompts — that a user copies straight into Runway or the fal.ai Seedance playground. The tool translates story into Seedance's actual input language. It doesn't replace Seedance; it produces exactly the inputs Seedance needs to yield character-consistent, well-directed output instead of slop.

## 2. Why this shape

Seedance 2.0 has its own production language — specific film stocks for visual style, time-coded shots for directing, subject/camera separation, @-referenced locked views for identity, a constraint block for artifact prevention. Writing a correct 5-layer prompt from scratch takes real cinematic vocabulary and discipline. Most users write normal English and get AI slop. This tool encodes the full Seedance skill (see `/mnt/skills/user/seedance-micro-drama/SKILL.md`) as a GPT-4o-mini system prompt, letting any user translate a premise into a correct 5-layer production.

Pitch line:

> "Character Lock produces a named character asset with 8 approved views. Mini-drama Composer uses that asset to write a 5-episode arc, then drafts each episode as a paste-ready Seedance prompt in the 5-layer format I developed for my own micro-drama work. Content moderation substitutions, character identity anchoring, subject/camera separation — all handled automatically. The output is what a Seedance user actually needs: reference setup instructions plus five 15-second shot lists, ready to paste."

## 3. Scope

### In scope this session

- `/templates/mini-drama` route with list view + inline setup
- `/templates/mini-drama/[id]` detail view with 5 episode cards
- Character picker (complete characters only; disabled empty state when none)
- Premise input, tonal picker (5 presets), optional visual style override
- GPT-4o-mini call for arc generation (5 episode summaries at once, returns JSON)
- Per-episode GPT-4o-mini draft call (produces full 5-layer format block)
- Per-episode Regenerate, Copy
- Export all as `.txt` file with reference setup + style block + all drafted episodes
- localStorage persistence for mini-dramas, v2 → v3 schema migration
- Sidebar: Mini-drama Composer entry under TEMPLATES, disabled if no complete characters

### Explicitly not in scope

- Video generation via Seedance — designed as next phase in §8
- Editing the arc after generation (to change an episode summary, user regenerates the whole arc or edits in the exported text)
- Collaborative sharing or public links
- Non-text output formats (no PDF, no JSON export for power users)
- Audio, music, or lip-sync
- Changes to `src/engine/`, `src/nodes/`, or the Canvas view
- Mini-drama usage of canvas nodes (keep templates and canvas cleanly separated)

## 4. User flow

### Screen 1 — List view (`/templates/mini-drama`)

Header: "Mini-dramas"
Button top-right: "+ New mini-drama"

If no complete characters exist: banner above the button — *"Lock a character first. Mini-drama needs a locked character to generate scripts."* Button is disabled.

If complete characters exist:
- List of existing mini-dramas as cards (if any)
- Each card: title (first 40 chars of premise or user-edited), character name, date, progress ("3 of 5 episodes drafted" / "Complete")
- Click to open detail view

### Screen 2 — Inline setup (revealed below header on "+ New mini-drama" click)

Form:
- **Character** — dropdown of complete characters by name
- **Premise** — textarea (150 char min soft; tooltip: "1-3 sentences. What's the situation? Who wants what?")
- **Tone** — segmented picker with 5 options:
  - *Vintage field* (default)
  - *Noir*
  - *Documentary*
  - *Golden warm*
  - *Clean commercial*
- **Visual style** — collapsible textarea, collapsed by default, pre-filled with the selected tone's block. User can expand + edit freely.
- **Generate arc** button — disabled until character + premise filled

On submit:
1. Create MiniDrama in store, route to `/templates/mini-drama/[id]`
2. Fire the arc-generation GPT call
3. Show loading state on the 5 episode cards while awaiting arc

### Screen 3 — Detail view (`/templates/mini-drama/[id]`)

Layout top-down:

**Header section:**
- Mini-drama title + character name + premise (compact, readable)
- Edit button (reveals setup form again, allows changes + "Regenerate arc" which clears drafted episodes)
- Delete button

**Reference setup block** (collapsible, open by default):
- Pre-formatted block showing which locked views to upload to Runway as @-tags
- Auto-generated from the character's locked views using the naming scheme in §6.3
- Copy button

**Visual style block** (collapsible, open by default):
- Shows the chosen style text
- Copy button

**Episodes section:**
- Title: "5 Episodes"
- 5 episode cards in vertical stack

**Each episode card:**
- Header: episode number + title (e.g. "Episode 1 — The Arrival")
- Summary: one-line from arc generation
- Body:
  - Undrafted: "Draft this episode" button (primary)
  - Drafting: loading spinner with caption "Drafting episode prompt..."
  - Drafted: pre-formatted 5-layer prompt block in monospace, with `Regenerate` and `Copy` buttons below
  - Error: "Draft failed. [Retry]"

**Bottom section:**
- Progress indicator: "N of 5 drafted"
- "Export all" button (primary) — disabled until at least 1 episode drafted. Downloads `.txt` file.

### Flow specifics

- Clicking "Draft this episode" on any card fires a per-episode GPT call. User can click multiple draft buttons in sequence; each runs independently.
- Regenerating an episode does not affect other episodes.
- Regenerating the arc (from the Edit form) clears all drafted episodes to undrafted state — the arc is the foundation, changing it invalidates drafts.
- Export bundles whatever episodes are drafted. Undrafted episodes show as placeholders (`[Episode 3 — Not yet drafted]`).

## 5. Architecture

### 5.1 What stays unchanged

- `src/engine/` — zero changes
- `src/nodes/` — zero changes
- Canvas view — zero changes
- Character Lock — zero changes (characters are read-only consumers here)
- Existing proxies — `api/generate/text.ts` is reused (confirm it exists and handles the system-prompt-plus-user-message shape we need; if not, extend it)

### 5.2 New concepts

```ts
// src/miniDramas/types.ts

export type TonalPreset = 
  | 'vintageField'
  | 'noir'
  | 'documentary'
  | 'goldenWarm'
  | 'cleanCommercial';

export interface Episode {
  episodeNumber: number;        // 1..5
  title: string;                 // from arc generation
  summary: string;               // one-liner from arc generation
  draftedPrompt?: string;        // the full 5-layer block, present after drafting
  status: 'undrafted' | 'drafting' | 'drafted' | 'error';
  error?: string;
  draftedAt?: number;
}

export interface MiniDrama {
  id: string;                    // random short id (not slug from premise — premise can change)
  characterId: string;           // references Character.id
  premise: string;
  tonalPreset: TonalPreset;
  visualStyleBlock: string;      // the resolved block (preset or user-edited)
  episodes: Episode[];            // always length 5 after arc generation; empty or undrafted before
  arcStatus: 'pending' | 'generated' | 'error';
  arcError?: string;
  createdAt: number;
  updatedAt: number;
}
```

### 5.3 Store slice

Extend `useAppStore` with:

```ts
interface MiniDramaSlice {
  miniDramas: Record<string, MiniDrama>;
  
  createMiniDrama: (params: {
    characterId: string;
    premise: string;
    tonalPreset: TonalPreset;
    visualStyleBlock: string;
  }) => string;  // returns id
  
  updateMiniDrama: (id: string, patch: Partial<MiniDrama>) => void;
  deleteMiniDrama: (id: string) => void;
  
  // Arc ops
  generateArc: (dramaId: string) => Promise<void>;
  
  // Episode ops
  draftEpisode: (dramaId: string, episodeNumber: number) => Promise<void>;
  regenerateEpisode: (dramaId: string, episodeNumber: number) => Promise<void>;
}
```

`generateArc` and `draftEpisode` are direct store actions (no DAG engine) — same pattern as Character Lock's `regenerateView`. They dispatch to the `api/generate/text.ts` proxy with the appropriate system prompts.

### 5.4 Persistence

Extend `src/store/persistence.ts`:
- Bump schema version v2 → v3
- v2 loads hydrate `miniDramas: {}` (empty)
- v3 saves include `miniDramas`
- Export/Import JSON includes `miniDramas`

### 5.5 System prompts

The meat of the feature. Both are baked into `src/miniDramas/systemPrompts.ts`.

**Arc generation system prompt:**

```
You are a screenwriter specialized in micro-drama — vertical short-form serialized content, typically 15-60 second episodes per beat. Your job is to translate a premise into a 5-episode arc with clear dramatic escalation.

FORMAT: Return valid JSON only. No preamble, no markdown fencing, no commentary. Structure:
{
  "episodes": [
    { "number": 1, "title": "string (2-5 words)", "summary": "string (one sentence, 15-25 words)" },
    ... 5 total
  ]
}

DRAMATIC ARC (enforce this shape):
- Episode 1 — Setup: establish the character in their world, hint at want
- Episode 2 — Complication: something disrupts the equilibrium
- Episode 3 — Deepening: the stakes or intimacy intensifies
- Episode 4 — Crisis: the point of maximum conflict or choice
- Episode 5 — Resolution or cliffhanger: either closure or a turn that sets up a second season

EACH EPISODE is one 15-second Seedance-shot moment from the arc. Pick the single dramatic beat that best represents that episode — not a summary of plot, a specific MOMENT that can be shot in 15 seconds.

TITLE CONVENTIONS:
- 2-5 words
- Evocative, mood-setting
- Not literal ("The Phone Call" good, "Malik Makes A Phone Call" bad)

CONTENT MODERATION: Substitute risky terms automatically:
- Real named public figures → fictional names
- Real weapons (AK-47, etc.) → generic ("long firearm", "rifle")
- Real locations with political freight → generic ("remote mountain region")
- Terror organization names → remove entirely

CONTEXT PROVIDED:
Character name: {characterName}
Premise: {premise}
Tonal direction: {tonalLabel}

Return the JSON and nothing else.
```

**Episode draft system prompt (per episode):**

```
You are a cinematographer and director. You produce Seedance 2.0 video prompts in a strict 5-layer format.

OUTPUT FORMAT (follow exactly, no preamble or commentary):

=== EPISODE [N] — "[title]" ===

Primary identity anchor: @{characterName}. Do not alter facial proportions, {keyFeature1}, or {keyFeature2} across any frame.

[VISUAL STYLE]
{visualStyleBlock}

[0-4s]: [framing], [camera state], @{characterName} ([which locked view]), [subject action], [lighting state]
[4-8s]: [framing], [camera state], @{characterName} [subject action], [lighting state]
[8-12s]: [framing], [camera state], @{characterName} [subject action], [lighting state]
[12-15s]: [framing], [camera state], @{characterName} [subject action], [lighting state]

[CONSTRAINTS]
Avoid jitter. Avoid bent limbs. Avoid identity drift. Avoid temporal flicker. No distortion. No stretching. Maintain face consistency. Sharp clarity, natural colors, stable picture, no blur, no ghosting, no flickering.

CRITICAL RULES:

1. The 15 seconds follow the universal escalation pattern: wide → tighter → tight → closest. [0-4s] establishes world, [4-8s] pushes in, [8-12s] close-up, [12-15s] extreme close-up or dramatic reveal.

2. Subject movement and camera movement NEVER share a sentence. Split into separate clauses: "@{characterName} slowly turns toward camera, camera static locked-off" is correct. "Slow push-in toward @{characterName} as he turns" is WRONG.

3. Use these locked views by name — reference the one that fits each shot's framing:
{availableLockedViews}

4. For framing, use: wide shot / medium shot / close-up / extreme close-up
5. For camera states (pick ONE per shot): static locked-off / slow dolly-in / slow dolly-out / slow pan left / slow pan right / gentle orbit / handheld subtle / tracking shot
6. For lighting, be specific: name the source, direction, quality. Use keywords: "sodium-vapor streetlight warm from camera right", "golden hour", "rim light against dark background", "overcast diffused daylight", "hard chiaroscuro side light". Never use: glow, glimmer, glints, cinematic (alone), epic, amazing.
7. Apply the same content moderation substitutions as arc generation.
8. Identity anchoring line: pick two specific features appropriate to this character (jawline, hairstyle, eyewear, scar, posture, wardrobe detail). Do not leave as placeholders.

CONTEXT PROVIDED:
Character name: {characterName}
Available locked views: {availableLockedViews}
Premise: {premise}
Tonal direction: {tonalLabel}
Prior episodes for continuity: {priorEpisodes}
This episode: {thisEpisodeNumber} — "{thisEpisodeTitle}" — {thisEpisodeSummary}
Visual style block (paste verbatim in [VISUAL STYLE]): {visualStyleBlock}

Return only the episode block, following the output format exactly.
```

These prompts encode the full Seedance skill into the tool. Quality of output depends on them; they should be treated as living specs that evolve with use.

### 5.6 Visual style presets

```ts
// src/miniDramas/tonalPresets.ts

export const TONAL_PRESETS: Record<TonalPreset, { label: string; block: string }> = {
  vintageField: {
    label: "Vintage field",
    block: "Shot on expired Kodak Gold 200, mid-1990s. Flat single-source lighting — bare bulb or overhead fluorescent, no dramatic shadows. Visible analogue film grain, medium-coarse. Warm yellow-green colour cast, desaturated palette — yellowed whites, olive-tinted greens, amber skin tones. Faded colours as if the footage has been sitting in a drawer for ten years. No post-processing look. Surveillance or field documentation aesthetic. Contact sheet energy — real, not staged."
  },
  noir: {
    label: "Noir",
    block: "Hard side lighting from a single practical source, chiaroscuro with crushed blacks and blown highlights. 16mm film grain, medium-heavy. Desaturated blue-green shadow palette with warm amber key lights. Volumetric atmosphere — cigarette smoke, haze, wet streets. 1940s detective aesthetic, moral ambiguity in the shadows."
  },
  documentary: {
    label: "Documentary",
    block: "Natural overcast daylight or available light only. Handheld camera, subtle ambient jitter, no stabilization. 16mm film grain, medium. Slightly desaturated natural color palette — muted skin tones, accurate whites. National Geographic field documentation aesthetic. Observational, not staged."
  },
  goldenWarm: {
    label: "Golden warm",
    block: "Golden hour natural sunlight, low-angle warm key light with long shadows. 35mm film tone, fine grain. Warm amber colour cast, rich skin tones, subtle lens flare. Soft diffusion in highlights. Saturated but not pushed. Nostalgic, emotional warmth — Terrence Malick energy."
  },
  cleanCommercial: {
    label: "Clean commercial",
    block: "Soft key light from 45 degrees with negative fill. Teal and orange color grade, high clarity. Anamorphic lens flares, subtle lens breathing. Shallow depth of field. Polished, intentional, commercial polish — high-end automotive or fashion spot aesthetic."
  }
};
```

### 5.7 Reference setup block generation

Given a character with N locked views, the reference setup block is auto-generated per the skill's @-tag convention:

```
=== REFERENCE SETUP (upload these to Runway) ===
@{characterName} → primary identity anchor (Slot 1, from front view)
@{characterName}_closeup → emotional range reference (Slot 2, from close-up view)
@{characterName}_profile → silhouette reference (Slot 3, from side profile view)
@{characterName}_body → full body reference (Slot 4, from full body view)
@{characterName}_scene → environmental context (Slot 5, from environment view)
```

Helper function in `src/miniDramas/referenceSetup.ts` produces this text from a Character object. Slot mapping fixed to the skill's strategy (slots 1-5 used, slots 6-9 reserved).

### 5.8 File structure additions

```
src/
  miniDramas/                    # new top-level domain
    types.ts                      # Episode, MiniDrama, TonalPreset types
    systemPrompts.ts              # Arc + episode draft prompts (the real artifact)
    tonalPresets.ts               # 5 preset blocks
    referenceSetup.ts             # generate @-tag block from character
    generateArc.ts                # fetch helper for arc GPT call
    draftEpisode.ts               # fetch helper for episode GPT call
    exportMiniDrama.ts            # bundle drafted episodes → .txt file
  workflows/
    miniDrama/
      MiniDramaListView.tsx        # /templates/mini-drama
      MiniDramaDetailView.tsx      # /templates/mini-drama/[id]
      SetupScreen.tsx              # inline setup form
      EpisodeCard.tsx              # one of 5 cards
      ReferenceSetupBlock.tsx      # collapsible block component
      StyleBlock.tsx               # collapsible block component
```

Existing files edited:
- `src/app/Router.tsx` — 2 new routes
- `src/app/Sidebar.tsx` — new entry under TEMPLATES
- `src/store/useAppStore.ts` — MiniDramaSlice added
- `src/store/persistence.ts` — v2→v3 migration, serialize miniDramas

### 5.9 GPT proxy contract

The existing `api/generate/text.ts` proxy accepts `{ systemPrompt, userMessage, model }` and returns `{ text }`. If it doesn't match this shape, extend it in M1.

For arc generation: parse returned text as JSON. Handle parse failure by setting arcStatus='error' with a message; offer retry.

For episode draft: returned text is the full block; store as `draftedPrompt`. No parsing.

## 6. Milestones

Budget: ~2 hours.

### M1 — Plumbing (30 min)

- `src/miniDramas/types.ts`
- `src/miniDramas/tonalPresets.ts`
- `src/miniDramas/referenceSetup.ts`
- `src/miniDramas/systemPrompts.ts`
- `src/miniDramas/generateArc.ts`, `draftEpisode.ts`, `exportMiniDrama.ts`
- Verify/extend `api/generate/text.ts` for the required shape
- Store slice in `useAppStore.ts`
- Persistence v2→v3 migration
- Tests: reference setup generation, JSON parsing happy + error paths, export format

Commits:
- `feat(miniDramas): add domain types and tonal presets`
- `feat(miniDramas): add system prompts and fetch helpers`
- `feat(api): ensure text proxy supports system + user message shape` (only if needed)
- `feat(store): add mini dramas slice`
- `feat(store): persistence v2→v3 migration for mini dramas`
- `test(miniDramas): reference setup, JSON parsing, export`

### M2 — Routing + list view + setup (30 min)

- Add routes to `Router.tsx`
- Add sidebar entry with disabled state logic
- `MiniDramaListView.tsx` — empty state, existing dramas list, "+ New mini-drama" button
- `SetupScreen.tsx` — inline form with character picker, premise, tonal picker, style override
- Submit → create drama + navigate to detail + fire arc generation

Commits:
- `feat(app): add mini drama routes and sidebar entry`
- `feat(workflows): mini drama list view with inline setup`

### M3 — Detail view + arc + episode drafting (45 min)

- `MiniDramaDetailView.tsx` — header, reference setup block, style block, 5 episode cards, progress, export
- Arc loading state while awaiting arc GPT call; populate episode cards on success
- `EpisodeCard.tsx` — undrafted/drafting/drafted/error states, Draft/Regenerate/Copy buttons
- `ReferenceSetupBlock.tsx` + `StyleBlock.tsx` — collapsible, copy button
- Wire Export all button

Commits:
- `feat(workflows): mini drama detail view with arc loading`
- `feat(workflows): episode card with draft regenerate copy`
- `feat(workflows): reference and style blocks with copy`
- `feat(workflows): mini drama export all to text file`

### M4 — Polish + ship (15 min)

- Toast on arc generation complete ("Arc ready — draft your first episode")
- Error handling polish (retry buttons, clear error messages)
- Sidebar count badge for mini-dramas (parallel to character lock pattern)
- `pnpm verify`, push to Vercel

Commits:
- `feat(workflows): completion toasts and error retry affordances`
- `feat(sidebar): mini drama count badge`

## 7. Testing

Target: +6-10 tests.

- `referenceSetup.ts` — produces correct block from character with various view combos
- `systemPrompts.ts` — template substitution (character name, premise, etc. land in the right places)
- Arc JSON parsing — valid JSON, malformed JSON error path, missing fields
- Export format — drafted + undrafted episodes produce correct text file structure
- Persistence v2→v3 migration — v2 save loads with empty miniDramas
- Persistence roundtrip — mini drama survives export → reset → import

Skip: visual component tests.

## 8. Follow-up — Seedance video generation (NOT THIS SESSION)

Once the prompt-generation flow is solid and validated in use, the natural extension is video generation via `bytedance/seedance-2.0/reference-to-video`. Design sketch:

**Per-episode "Generate video" button** on each drafted episode card. Opt-in, cost-disclosed.

**Serverless proxy** at `api/generate/seedance-reference-to-video.ts`:
- Input: list of reference image URLs (from locked character views), 5-layer prompt
- Calls fal.ai reference-to-video endpoint with `image_urls: [...]` as the reference array and the prompt
- Returns `{ jobId }` for async polling (Seedance takes 60-120s per 5s clip)

**Client polling** same pattern as existing image-to-video.

**Cost disclosure:** per-episode cost (~$0.50-$2.50 depending on fast/flagship tier) shown before user clicks. Hard cap at $5 per mini-drama by default; user can override.

**Result UI:** video player inline in the episode card, alongside the prompt text. User can compare prompt to video output.

**Time estimate when built:** 2-3 hours, assuming the image-to-video async polling code is reusable as a reference.

**Pitch line for the interview:** "The prompt generation is the product today. Video generation via Seedance's reference-to-video endpoint is wired as an opt-in power feature — designed in the spec, 2-3 hours to build when demand warrants it."

## 9. Known rough edges

- **Arc regeneration clears all drafted episodes.** The arc is the scaffold — changing it invalidates drafts. Documented; no confirmation dialog to avoid friction.
- **No mid-arc edit.** To change episode 3's summary, user regenerates the full arc. Future: per-episode summary edit.
- **Export is text only.** No markdown, no JSON. If a reviewer wants structured data, they parse the text file. This is the Seedance user's workflow — Runway takes text.
- **GPT temperature not exposed.** Uses model default. If output is too repetitive across regenerations, user regenerates a few times and picks the best.
- **Content moderation substitutions are prompt-level.** If GPT ignores instructions and outputs a flagged term, user notices and edits. Acceptable for MVP.
- **Cost per mini-drama:** ~$0.01-0.03 for arc + all 5 draft calls (GPT-4o-mini is cheap). No cost UI needed.

## 10. The pitch update for the interview

> "I built two templates on top of the engine. Character Lock produces a named character asset with 8 approved views. Mini-drama Composer uses that asset: pick a character, type a premise, GPT writes a 5-episode arc, then drafts each episode as a paste-ready Seedance prompt in my 5-layer format — character anchor, visual style, time-coded shots, camera separation, and a constraint block. Content moderation substitutions are automatic. The output is exactly what a Seedance user needs: reference setup instructions plus five 15-second shot lists. Video generation via Seedance's reference-to-video endpoint is designed as the next layer — opt-in, cost-disclosed, 2-3 hours of build. I scoped it out of this session because the prompt generation is the product; video is the cherry on top. Zero engine changes across all four rounds. Templates are composed experiences on top of the registry — exactly what the typed architecture was designed to enable."

---

Spec is the plan. Execution follows.
