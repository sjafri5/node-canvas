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
