import type { MiniDrama } from './types';
import type { Character } from '../characters/types';
import { buildReferenceSetupBlock } from './referenceSetup';

/**
 * Bundle a mini-drama into a plain text file for export.
 * Includes reference setup, visual style, and all episodes.
 */
export function exportMiniDramaText(drama: MiniDrama, character: Character): string {
  const lines: string[] = [];

  lines.push(`MINI-DRAMA: ${drama.premise}`);
  lines.push(`CHARACTER: ${character.name}`);
  lines.push('');

  // Reference setup block
  lines.push(buildReferenceSetupBlock(character));
  lines.push('');

  // Visual style block
  lines.push('=== VISUAL STYLE ===');
  lines.push(drama.visualStyleBlock);
  lines.push('');

  // Episodes
  lines.push('=== EPISODES ===');
  lines.push('');

  for (const episode of drama.episodes) {
    if (episode.status === 'drafted' && episode.draftedPrompt) {
      lines.push(episode.draftedPrompt);
    } else {
      lines.push(`[Episode ${String(episode.episodeNumber)} — ${episode.title} — Not yet drafted]`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Trigger a .txt file download in the browser.
 */
export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
