import { describe, it, expect, vi } from 'vitest';
import { imageToImageRunner } from './runner';
import type { ImageToImageNode } from '../../types';
import type { RunContext } from '../../engine/types';

function makeNode(prompt: string, strength?: number): ImageToImageNode {
  return {
    id: 'i2i1',
    type: 'imageToImage',
    position: { x: 0, y: 0 },
    status: 'idle',
    data: { prompt, strength },
  };
}

function makeCtx(fetchFn: RunContext['fetchFn']): RunContext {
  return { fetchFn, signal: new AbortController().signal };
}

describe('imageToImageRunner', () => {
  it('sends image and prompt to API and returns imageUrl', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ imageUrl: 'https://fal.ai/img2img-result.png' }),
    });

    const result = await imageToImageRunner(
      makeNode('make it noir'),
      { image: 'https://example.com/source.png' },
      makeCtx(mockFetch as unknown as typeof fetch),
    );

    expect(result).toEqual({ imageUrl: 'https://fal.ai/img2img-result.png' });
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/generate/image-to-image',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          imageUrl: 'https://example.com/source.png',
          prompt: 'make it noir',
          strength: 0.7,
        }),
      }),
    );
  });

  it('throws on non-2xx response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Server error',
    });

    await expect(
      imageToImageRunner(
        makeNode('test'),
        { image: 'https://example.com/img.png' },
        makeCtx(mockFetch as unknown as typeof fetch),
      ),
    ).rejects.toThrow('Image-to-image failed (500): Server error');
  });

  it('throws when upstream image is missing', async () => {
    const mockFetch = vi.fn();
    await expect(
      imageToImageRunner(makeNode('test'), {}, makeCtx(mockFetch as unknown as typeof fetch)),
    ).rejects.toThrow('imageToImage requires an upstream image');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
