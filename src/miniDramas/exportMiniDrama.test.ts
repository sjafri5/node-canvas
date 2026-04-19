import { describe, it, expect } from 'vitest';
import { exportMiniDramaText, getActivePrompt } from './exportMiniDrama';
import type { MiniDrama, Episode } from './types';
import type { Character, ViewId, CharacterView } from '../characters/types';
import { VIEW_IDS } from '../characters/types';

function makeCharacter(): Character {
  const views = Object.fromEntries(
    VIEW_IDS.map((v) => [
      v,
      { viewId: v, status: 'locked' as const, imageUrl: `https://fal.ai/${v}.png` },
    ]),
  ) as Record<ViewId, CharacterView>;

  return {
    id: 'test-id',
    name: 'Malik',
    referenceImageUrl: 'data:image/jpeg;base64,ref',
    views,
    isComplete: true,
    createdAt: 1000,
    updatedAt: 1000,
  };
}

function makeDrama(episodes: MiniDrama['episodes']): MiniDrama {
  return {
    id: 'drama-1',
    characterId: 'test-id',
    premise: 'A detective in a noir city',
    tonalPreset: 'noir',
    visualStyleBlock: 'Hard side lighting, chiaroscuro.',
    episodes,
    arcStatus: 'generated',
    createdAt: 1000,
    updatedAt: 1000,
  };
}

function ep(num: number, opts: Partial<Episode> = {}): Episode {
  return {
    episodeNumber: num,
    title: `Ep ${String(num)}`,
    summary: `Summary ${String(num)}`,
    alternatives: [],
    status: 'undrafted',
    ...opts,
  };
}

describe('getActivePrompt', () => {
  it('returns active alternative prompt', () => {
    const episode = ep(1, {
      status: 'drafted',
      alternatives: [
        { id: 'a1', prompt: 'First', generatedAt: 1000 },
        { id: 'a2', prompt: 'Second', generatedAt: 2000 },
      ],
      activeAlternativeId: 'a2',
    });
    expect(getActivePrompt(episode)).toBe('Second');
  });

  it('falls back to first alternative if active not found', () => {
    const episode = ep(1, {
      status: 'drafted',
      alternatives: [{ id: 'a1', prompt: 'First', generatedAt: 1000 }],
      activeAlternativeId: 'missing',
    });
    expect(getActivePrompt(episode)).toBe('First');
  });

  it('falls back to draftedPrompt when no alternatives', () => {
    const episode = ep(1, { status: 'drafted', draftedPrompt: 'Legacy' });
    expect(getActivePrompt(episode)).toBe('Legacy');
  });

  it('returns undefined for undrafted', () => {
    expect(getActivePrompt(ep(1))).toBeUndefined();
  });
});

describe('exportMiniDramaText', () => {
  it('includes only active alternative in export', () => {
    const drama = makeDrama([
      ep(1, {
        status: 'drafted',
        alternatives: [
          { id: 'a1', prompt: 'ACTIVE PROMPT', generatedAt: 1000 },
          { id: 'a2', prompt: 'INACTIVE PROMPT', generatedAt: 2000 },
        ],
        activeAlternativeId: 'a1',
      }),
      ep(2),
    ]);

    const text = exportMiniDramaText(drama, makeCharacter());

    expect(text).toContain('ACTIVE PROMPT');
    expect(text).not.toContain('INACTIVE PROMPT');
    expect(text).toContain('[Episode 2 — Ep 2 — Not yet drafted]');
  });

  it('handles all undrafted episodes', () => {
    const drama = makeDrama([ep(1), ep(2)]);
    const text = exportMiniDramaText(drama, makeCharacter());

    expect(text).toContain('[Episode 1 — Ep 1 — Not yet drafted]');
    expect(text).toContain('[Episode 2 — Ep 2 — Not yet drafted]');
  });
});
