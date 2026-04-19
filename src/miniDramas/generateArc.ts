import type { Episode } from './types';

interface ArcResponse {
  episodes: { number: number; title: string; summary: string }[];
}

/**
 * Strip common GPT markdown fencing from JSON responses.
 */
function stripJsonFences(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

function validateArcResponse(data: unknown): data is ArcResponse {
  if (data == null || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.episodes) || obj.episodes.length !== 5) return false;

  for (const ep of obj.episodes) {
    if (typeof ep !== 'object' || ep == null) return false;
    const e = ep as Record<string, unknown>;
    if (typeof e.number !== 'number' || typeof e.title !== 'string' || typeof e.summary !== 'string') {
      return false;
    }
  }

  return true;
}

export async function generateArc(systemPrompt: string): Promise<Episode[]> {
  const res = await fetch('/api/generate/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemPrompt,
      userMessage: 'Generate the 5-episode arc now.',
      maxTokens: 800,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Arc generation failed (${String(res.status)}): ${text}`);
  }

  const data = (await res.json()) as { text: string };
  const cleaned = stripJsonFences(data.text);

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Failed to parse arc response as JSON. Try again.');
  }

  if (!validateArcResponse(parsed)) {
    throw new Error('Arc response has wrong structure. Try again.');
  }

  return parsed.episodes.map((ep): Episode => ({
    episodeNumber: ep.number,
    title: ep.title,
    summary: ep.summary,
    alternatives: [],
    status: 'undrafted',
  }));
}
