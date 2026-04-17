import { describe, it, expect, vi } from 'vitest';
import { imageGenerationRunner } from './runner';
import type { ImageGenerationNode } from '../../types';
import type { RunContext } from '../../engine/types';

function makeNode(): ImageGenerationNode {
  return {
    id: 'ig1',
    type: 'imageGeneration',
    position: { x: 0, y: 0 },
    status: 'idle',
    data: {} as Record<string, never>,
  };
}

function makeCtx(fetchFn: RunContext['fetchFn']): RunContext {
  return { fetchFn, signal: new AbortController().signal };
}

describe('imageGenerationRunner', () => {
  it('sends prompt to API and returns imageUrl', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ imageUrl: 'https://fal.ai/result.png' }),
    });

    const result = await imageGenerationRunner(
      makeNode(),
      { prompt: 'a cat in space' },
      makeCtx(mockFetch as unknown as typeof fetch),
    );

    expect(result).toEqual({ imageUrl: 'https://fal.ai/result.png' });
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/generate/image',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ prompt: 'a cat in space' }),
      }),
    );
  });

  it('throws on non-2xx response with error text', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    await expect(
      imageGenerationRunner(
        makeNode(),
        { prompt: 'test' },
        makeCtx(mockFetch as unknown as typeof fetch),
      ),
    ).rejects.toThrow('Image generation failed (500): Internal Server Error');
  });

  it('throws when prompt is missing', async () => {
    const mockFetch = vi.fn();

    await expect(
      imageGenerationRunner(makeNode(), {}, makeCtx(mockFetch as unknown as typeof fetch)),
    ).rejects.toThrow('No prompt provided');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('throws when prompt is empty string', async () => {
    const mockFetch = vi.fn();

    await expect(
      imageGenerationRunner(
        makeNode(),
        { prompt: '  ' },
        makeCtx(mockFetch as unknown as typeof fetch),
      ),
    ).rejects.toThrow('No prompt provided');
  });
});
