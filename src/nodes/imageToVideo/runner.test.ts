import { describe, it, expect, vi } from 'vitest';
import { imageToVideoRunner } from './runner';
import type { ImageToVideoNode } from '../../types';
import type { RunContext } from '../../engine/types';

function makeNode(overrides?: Partial<ImageToVideoNode['data']>): ImageToVideoNode {
  return {
    id: 'i2v1',
    type: 'imageToVideo',
    position: { x: 0, y: 0 },
    status: 'idle',
    data: {
      model: 'veo-3-fast',
      durationSeconds: 5,
      ...overrides,
    },
  };
}

function makeCtx(fetchFn: RunContext['fetchFn']): RunContext {
  return { fetchFn, signal: new AbortController().signal };
}

describe('imageToVideoRunner', () => {
  it('submits job with model and polls until completed', async () => {
    let pollCount = 0;
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/generate/video') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ jobId: 'job-123', status: 'pending', model: 'veo-3-fast' }),
        });
      }
      if (typeof url === 'string' && url.includes('/api/generate/video-status')) {
        pollCount++;
        if (pollCount >= 2) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ status: 'completed', videoUrl: 'https://video.test/result.mp4' }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ status: 'pending' }),
        });
      }
      return Promise.resolve({ ok: false, status: 404, text: async () => 'Not found' });
    });

    const result = await imageToVideoRunner(
      makeNode({ motionPrompt: 'slow push in' }),
      { image: 'https://example.com/frame.png' },
      makeCtx(mockFetch as unknown as typeof fetch),
    );

    expect(result).toEqual({ video: 'https://video.test/result.mp4' });
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/generate/video',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('passes model and duration in submission body', async () => {
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/generate/video') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ jobId: 'job-456', status: 'pending', model: 'gen-3-turbo' }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ status: 'completed', videoUrl: 'https://video.test/v2.mp4' }),
      });
    });

    await imageToVideoRunner(
      makeNode({ model: 'gen-3-turbo', durationSeconds: 10 }),
      { image: 'https://example.com/img.png' },
      makeCtx(mockFetch as unknown as typeof fetch),
    );

    const submitCall = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(submitCall[1].body as string) as Record<string, unknown>;
    expect(body.model).toBe('gen-3-turbo');
    expect(body.durationSeconds).toBe(10);
  });

  it('passes model to status polling URL', async () => {
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/generate/video') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ jobId: 'job-789', status: 'pending', model: 'gen-3-turbo' }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ status: 'completed', videoUrl: 'https://video.test/v.mp4' }),
      });
    });

    await imageToVideoRunner(
      makeNode({ model: 'gen-3-turbo' }),
      { image: 'https://example.com/img.png' },
      makeCtx(mockFetch as unknown as typeof fetch),
    );

    const statusCall = mockFetch.mock.calls[1] as [string, RequestInit];
    expect(statusCall[0]).toContain('model=gen-3-turbo');
  });

  it('throws when upstream image is missing', async () => {
    const mockFetch = vi.fn();
    await expect(
      imageToVideoRunner(makeNode(), {}, makeCtx(mockFetch as unknown as typeof fetch)),
    ).rejects.toThrow('imageToVideo requires an upstream image');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('throws when job submission fails', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Server error',
    });

    await expect(
      imageToVideoRunner(
        makeNode(),
        { image: 'https://example.com/img.png' },
        makeCtx(mockFetch as unknown as typeof fetch),
      ),
    ).rejects.toThrow('Video submission failed (500): Server error');
  });

  it('throws when poll returns failed status', async () => {
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/generate/video') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ jobId: 'job-fail', status: 'pending', model: 'veo-3-fast' }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ status: 'failed', error: 'GPU out of memory' }),
      });
    });

    await expect(
      imageToVideoRunner(
        makeNode(),
        { image: 'https://example.com/img.png' },
        makeCtx(mockFetch as unknown as typeof fetch),
      ),
    ).rejects.toThrow('GPU out of memory');
  });
});
