const ALTERNATIVE_VARIATIONS = [
  'Produce a more intimate, close-up interpretation of this episode. Tighter framing, emotional focus.',
  'Produce a wider, more environmental interpretation. Character in context, show the world.',
  'Produce a tonally inverted interpretation. Same story beat, opposite mood lighting and camera energy.',
] as const;

/**
 * Draft a single episode via the text proxy.
 * Returns the full 5-layer prompt block as a string.
 */
export async function draftEpisode(systemPrompt: string): Promise<string> {
  const res = await fetch('/api/generate/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemPrompt,
      userMessage: 'Draft this episode now.',
      maxTokens: 1200,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Episode draft failed (${String(res.status)}): ${text}`);
  }

  const data = (await res.json()) as { text: string };
  return data.text.trim();
}

/**
 * Draft an alternative take on an episode with a variation instruction.
 * variationIndex: 0, 1, or 2 — selects which variation lens to apply.
 */
export async function draftAlternative(
  systemPrompt: string,
  variationIndex: number,
): Promise<string> {
  const variation = ALTERNATIVE_VARIATIONS[variationIndex] ?? ALTERNATIVE_VARIATIONS[0]!;

  const res = await fetch('/api/generate/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemPrompt,
      userMessage: `${variation}\n\nDraft this episode now.`,
      maxTokens: 1200,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Alternative draft failed (${String(res.status)}): ${text}`);
  }

  const data = (await res.json()) as { text: string };
  return data.text.trim();
}
