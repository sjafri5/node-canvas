import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateArc } from './generateArc';

describe('generateArc', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('parses valid JSON arc response into 5 episodes', async () => {
    const arcJson = JSON.stringify({
      episodes: [
        { number: 1, title: 'The Arrival', summary: 'A stranger walks into town.' },
        { number: 2, title: 'The Warning', summary: 'An old friend delivers bad news.' },
        { number: 3, title: 'The Chase', summary: 'Danger closes in from all sides.' },
        { number: 4, title: 'The Stand', summary: 'A choice must be made.' },
        { number: 5, title: 'The Departure', summary: 'Nothing is the same.' },
      ],
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: arcJson }),
    });

    const episodes = await generateArc('system prompt');

    expect(episodes).toHaveLength(5);
    expect(episodes[0]!.title).toBe('The Arrival');
    expect(episodes[0]!.status).toBe('undrafted');
    expect(episodes[4]!.episodeNumber).toBe(5);
  });

  it('strips markdown json fences before parsing', async () => {
    const arcJson = '```json\n' + JSON.stringify({
      episodes: Array.from({ length: 5 }, (_, i) => ({
        number: i + 1, title: `Ep ${String(i + 1)}`, summary: 'test',
      })),
    }) + '\n```';

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: arcJson }),
    });

    const episodes = await generateArc('system prompt');
    expect(episodes).toHaveLength(5);
  });

  it('throws on invalid JSON response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: 'This is not JSON at all' }),
    });

    await expect(generateArc('system prompt')).rejects.toThrow('Failed to parse arc response');
  });

  it('throws on wrong structure (missing episodes)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: JSON.stringify({ scenes: [] }) }),
    });

    await expect(generateArc('system prompt')).rejects.toThrow('wrong structure');
  });

  it('throws on wrong episode count', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        text: JSON.stringify({
          episodes: [{ number: 1, title: 'Only One', summary: 'test' }],
        }),
      }),
    });

    await expect(generateArc('system prompt')).rejects.toThrow('wrong structure');
  });

  it('throws on API error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Server error',
    });

    await expect(generateArc('system prompt')).rejects.toThrow('Arc generation failed (500)');
  });
});
