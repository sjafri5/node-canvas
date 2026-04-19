import { describe, it, expect, vi } from 'vitest';
import { imageGenerationRunner } from './runner';
import type { ImageGenerationNode } from '../../types';
import type { RunContext } from '../../engine/types';

function makeNode(overrides?: Partial<ImageGenerationNode['data']>): ImageGenerationNode {
  return {
    id: 'ig1',
    type: 'imageGeneration',
    position: { x: 0, y: 0 },
    status: 'idle',
    data: {
      model: 'flux-schnell',
      aspectRatio: '1:1',
      variationCount: 1,
      ...overrides,
    },
  };
}

function makeCtx(fetchFn: RunContext['fetchFn']): RunContext {
  return { fetchFn, signal: new AbortController().signal };
}

describe('imageGenerationRunner', () => {
  it('sends prompt, model, and aspectRatio to API', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ imageUrl: 'https://fal.ai/result.png' }),
    });

    const result = await imageGenerationRunner(
      makeNode({ model: 'flux-dev', aspectRatio: '16:9' }),
      { prompt: 'a cat in space' },
      makeCtx(mockFetch as unknown as typeof fetch),
    );

    expect(result).toEqual({ image: 'https://fal.ai/result.png' });
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/generate/image',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ prompt: 'a cat in space', model: 'flux-dev', aspectRatio: '16:9' }),
      }),
    );
  });

  it('generates variations in parallel when variationCount > 1', async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(async () => {
      callCount++;
      return {
        ok: true,
        json: async () => ({ imageUrl: `https://fal.ai/img-${String(callCount)}.png` }),
      };
    });

    const result = await imageGenerationRunner(
      makeNode({ variationCount: 4 }),
      { prompt: 'test' },
      makeCtx(mockFetch as unknown as typeof fetch),
    );

    expect(mockFetch).toHaveBeenCalledTimes(4);
    expect(result.variations).toHaveLength(4);
    expect(result.image).toBe(result.variations![0]);
  });

  it('uses selectedVariationIndex for the primary image', async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(async () => {
      callCount++;
      return {
        ok: true,
        json: async () => ({ imageUrl: `https://fal.ai/img-${String(callCount)}.png` }),
      };
    });

    const result = await imageGenerationRunner(
      makeNode({ variationCount: 2, selectedVariationIndex: 1 }),
      { prompt: 'test' },
      makeCtx(mockFetch as unknown as typeof fetch),
    );

    expect(result.variations).toHaveLength(2);
    expect(result.image).toBe(result.variations![1]);
  });

  it('returns single image without variations when count is 1', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ imageUrl: 'https://fal.ai/single.png' }),
    });

    const result = await imageGenerationRunner(
      makeNode(),
      { prompt: 'test' },
      makeCtx(mockFetch as unknown as typeof fetch),
    );

    expect(result).toEqual({ image: 'https://fal.ai/single.png' });
    expect(result.variations).toBeUndefined();
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
