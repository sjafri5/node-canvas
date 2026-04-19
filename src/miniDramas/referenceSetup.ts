import type { Character } from '../characters/types';
import { VIEW_IDS, VIEW_LABELS } from '../characters/types';
import type { ViewId } from '../characters/types';

const SLOT_MAP: { viewId: ViewId; suffix: string; description: string }[] = [
  { viewId: 'front', suffix: '', description: 'primary identity anchor (Slot 1, from front view)' },
  { viewId: 'closeUp', suffix: '_closeup', description: 'emotional range reference (Slot 2, from close-up view)' },
  { viewId: 'sideProfile', suffix: '_profile', description: 'silhouette reference (Slot 3, from side profile view)' },
  { viewId: 'fullBody', suffix: '_body', description: 'full body reference (Slot 4, from full body view)' },
  { viewId: 'environment', suffix: '_scene', description: 'environmental context (Slot 5, from environment view)' },
];

export function buildReferenceSetupBlock(character: Character): string {
  const lines = ['=== REFERENCE SETUP (upload these to Runway) ==='];

  for (const slot of SLOT_MAP) {
    if (character.views[slot.viewId]?.status === 'locked') {
      lines.push(`@${character.name}${slot.suffix} → ${slot.description}`);
    }
  }

  return lines.join('\n');
}

export function buildAvailableLockedViews(character: Character): string {
  return VIEW_IDS
    .filter((v) => character.views[v]?.status === 'locked')
    .map((v) => `@${character.name} (${VIEW_LABELS[v]})`)
    .join(', ');
}
