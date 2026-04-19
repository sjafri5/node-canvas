import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateView } from './generateView';
import { VIEW_PROMPTS } from './viewPrompts';

describe('generateView', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('calls the img2img proxy with correct model and prompt', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ imageUrl: 'https://fal.ai/result.png' }),
    });
    globalThis.fetch = mockFetch;

    const result = await generateView('data:image/jpeg;base64,abc', 'front');

    expect(result).toBe('https://fal.ai/result.png');
    expect(mockFetch).toHaveBeenCalledOnce();

    const call = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(call[0]).toBe('/api/generate/image-to-image');

    const body = JSON.parse(call[1].body as string) as Record<string, unknown>;
    expect(body.model).toBe('nano-banana-pro-edit');
    expect(body.prompt).toBe(VIEW_PROMPTS.front);
    expect(body.strength).toBe(0.6);
    expect(body.imageUrl).toBe('data:image/jpeg;base64,abc');
  });

  it('throws on non-2xx response with status and body', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => 'Invalid parameters',
    });

    await expect(
      generateView('data:image/jpeg;base64,abc', 'closeUp'),
    ).rejects.toThrow('View generation failed (422): Invalid parameters');
  });

  it('throws on network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));

    await expect(
      generateView('data:image/jpeg;base64,abc', 'sideProfile'),
    ).rejects.toThrow('Network failure');
  });

  it('uses the correct prompt for each view', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ imageUrl: 'https://fal.ai/env.png' }),
    });

    await generateView('ref-url', 'environment');

    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(call[1].body as string) as Record<string, unknown>;
    expect(body.prompt).toBe(VIEW_PROMPTS.environment);
    expect(body.prompt).toContain('same character identity preserved');
  });
});
