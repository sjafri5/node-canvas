import { describe, it, expect } from 'vitest';
import { buildReferenceSetupBlock, buildAvailableLockedViews } from './referenceSetup';
import type { Character } from '../characters/types';
import type { ViewId, CharacterView } from '../characters/types';
import { VIEW_IDS } from '../characters/types';

function makeCharacter(lockedViews: ViewId[]): Character {
  const views = Object.fromEntries(
    VIEW_IDS.map((v) => [
      v,
      {
        viewId: v,
        status: lockedViews.includes(v) ? ('locked' as const) : ('ready' as const),
        imageUrl: `https://fal.ai/${v}.png`,
      },
    ]),
  ) as Record<ViewId, CharacterView>;

  return {
    id: 'test-char',
    name: 'Kennedy',
    referenceImageUrl: 'data:image/jpeg;base64,ref',
    views,
    isComplete: lockedViews.length === 8,
    createdAt: 1000,
    updatedAt: 1000,
  };
}

describe('buildReferenceSetupBlock', () => {
  it('includes all 5 slots when all views are locked', () => {
    const char = makeCharacter(['front', 'closeUp', 'sideProfile', 'fullBody', 'environment', 'threeQuarterLeft', 'threeQuarterRight', 'lowAngle']);
    const block = buildReferenceSetupBlock(char);

    expect(block).toContain('=== REFERENCE SETUP');
    expect(block).toContain('@Kennedy →');
    expect(block).toContain('@Kennedy_closeup →');
    expect(block).toContain('@Kennedy_profile →');
    expect(block).toContain('@Kennedy_body →');
    expect(block).toContain('@Kennedy_scene →');
  });

  it('omits slots for unlocked views', () => {
    const char = makeCharacter(['front', 'closeUp']);
    const block = buildReferenceSetupBlock(char);

    expect(block).toContain('@Kennedy →');
    expect(block).toContain('@Kennedy_closeup →');
    expect(block).not.toContain('@Kennedy_profile');
    expect(block).not.toContain('@Kennedy_body');
    expect(block).not.toContain('@Kennedy_scene');
  });
});

describe('buildAvailableLockedViews', () => {
  it('lists only locked views with labels', () => {
    const char = makeCharacter(['front', 'sideProfile', 'fullBody']);
    const views = buildAvailableLockedViews(char);

    expect(views).toBe('@Kennedy (Front Portrait), @Kennedy (Side Profile), @Kennedy (Full Body)');
  });

  it('returns empty string when no views are locked', () => {
    const char = makeCharacter([]);
    const views = buildAvailableLockedViews(char);

    expect(views).toBe('');
  });

  it('lists all 8 when all are locked', () => {
    const char = makeCharacter(VIEW_IDS as unknown as ViewId[]);
    const views = buildAvailableLockedViews(char);

    expect(views.split(', ')).toHaveLength(8);
    expect(views).toContain('@Kennedy (Front Portrait)');
    expect(views).toContain('@Kennedy (In Environment)');
  });
});
