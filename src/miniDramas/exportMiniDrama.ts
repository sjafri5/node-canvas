import type { MiniDrama, Episode } from './types';
import type { Character } from '../characters/types';
import { buildReferenceSetupBlock } from './referenceSetup';

/**
 * Get the active alternative's prompt for an episode.
 */
export function getActivePrompt(episode: Episode): string | undefined {
  if (episode.alternatives.length === 0) return episode.draftedPrompt;
  const active = episode.alternatives.find((a) => a.id === episode.activeAlternativeId);
  return active?.prompt ?? episode.alternatives[0]?.prompt;
}

/**
 * Bundle a mini-drama into a plain text file for export.
 * Uses the active alternative for each episode.
 */
export function exportMiniDramaText(drama: MiniDrama, character: Character): string {
  const lines: string[] = [];

  lines.push(`MINI-DRAMA: ${drama.premise}`);
  lines.push(`CHARACTER: ${character.name}`);
  lines.push('');

  lines.push(buildReferenceSetupBlock(character));
  lines.push('');

  lines.push('=== VISUAL STYLE ===');
  lines.push(drama.visualStyleBlock);
  lines.push('');

  lines.push('=== EPISODES ===');
  lines.push('');

  for (const episode of drama.episodes) {
    const prompt = getActivePrompt(episode);
    if (episode.status === 'drafted' && prompt) {
      lines.push(prompt);
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
