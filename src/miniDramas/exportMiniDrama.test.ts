import { describe, it, expect } from 'vitest';
import { exportMiniDramaText } from './exportMiniDrama';
import type { MiniDrama } from './types';
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

describe('exportMiniDramaText', () => {
  it('includes header, reference setup, style, and drafted episodes', () => {
    const drama = makeDrama([
      { episodeNumber: 1, title: 'The Arrival', summary: 'A stranger arrives.', status: 'drafted', draftedPrompt: '=== EPISODE 1 — "The Arrival" ===\nDrafted content here.' },
      { episodeNumber: 2, title: 'The Warning', summary: 'Bad news.', status: 'undrafted' },
    ]);

    const text = exportMiniDramaText(drama, makeCharacter());

    expect(text).toContain('MINI-DRAMA: A detective in a noir city');
    expect(text).toContain('CHARACTER: Malik');
    expect(text).toContain('REFERENCE SETUP');
    expect(text).toContain('@Malik →');
    expect(text).toContain('VISUAL STYLE');
    expect(text).toContain('Hard side lighting, chiaroscuro.');
    expect(text).toContain('=== EPISODE 1');
    expect(text).toContain('[Episode 2 — The Warning — Not yet drafted]');
  });

  it('handles all episodes undrafted', () => {
    const drama = makeDrama([
      { episodeNumber: 1, title: 'Ep1', summary: 'Sum1', status: 'undrafted' },
      { episodeNumber: 2, title: 'Ep2', summary: 'Sum2', status: 'undrafted' },
    ]);

    const text = exportMiniDramaText(drama, makeCharacter());

    expect(text).toContain('[Episode 1 — Ep1 — Not yet drafted]');
    expect(text).toContain('[Episode 2 — Ep2 — Not yet drafted]');
  });

  it('handles all episodes drafted', () => {
    const drama = makeDrama([
      { episodeNumber: 1, title: 'Ep1', summary: 'Sum1', status: 'drafted', draftedPrompt: 'DRAFT 1' },
      { episodeNumber: 2, title: 'Ep2', summary: 'Sum2', status: 'drafted', draftedPrompt: 'DRAFT 2' },
    ]);

    const text = exportMiniDramaText(drama, makeCharacter());

    expect(text).toContain('DRAFT 1');
    expect(text).toContain('DRAFT 2');
    expect(text).not.toContain('Not yet drafted');
  });
});
