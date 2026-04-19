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
      model: 'seedance-2.0',
      durationSeconds: 5,
      ...overrides,
    },
  };
}

function makeCtx(fetchFn: RunContext['fetchFn']): RunContext {
  return { fetchFn, signal: new AbortController().signal };
}

describe('imageToVideoRunner', () => {
  it('submits job and polls until completed', async () => {
    let proxyCallCount = 0;
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/generate/video') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            jobId: 'job-123',
            status: 'pending',
            statusUrl: 'https://queue.fal.run/status/123',
            responseUrl: 'https://queue.fal.run/response/123',
          }),
        });
      }
      if (url === '/api/generate/fal-proxy') {
        proxyCallCount++;
        // First two calls: status check returns pending, then COMPLETED
        // Third call: result fetch returns video
        if (proxyCallCount === 1) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ status: 'IN_PROGRESS' }),
          });
        }
        if (proxyCallCount === 2) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ status: 'COMPLETED' }),
          });
        }
        // Result fetch
        return Promise.resolve({
          ok: true,
          json: async () => ({ video: { url: 'https://video.test/result.mp4' } }),
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
          json: async () => ({
            jobId: 'job-456',
            status: 'pending',
            statusUrl: 'https://queue.fal.run/status/456',
            responseUrl: 'https://queue.fal.run/response/456',
          }),
        });
      }
      // Status check returns COMPLETED immediately
      if (url === '/api/generate/fal-proxy') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ status: 'COMPLETED' }),
        });
      }
      return Promise.resolve({ ok: false, status: 404, text: async () => 'Not found' });
    });

    // This will fail at result fetch (no video), but we just need to check the submission
    try {
      await imageToVideoRunner(
        makeNode({ model: 'kling-v3-pro', durationSeconds: 10 }),
        { image: 'https://example.com/img.png' },
        makeCtx(mockFetch as unknown as typeof fetch),
      );
    } catch {
      // Expected — result fetch returns COMPLETED again instead of video
    }

    const submitCall = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(submitCall[1].body as string) as Record<string, unknown>;
    expect(body.model).toBe('kling-v3-pro');
    expect(body.durationSeconds).toBe(10);
  });

  it('returns directly for synchronous models', async () => {
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/generate/video') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ status: 'completed', videoUrl: 'https://video.test/sync.mp4' }),
        });
      }
      return Promise.resolve({ ok: false, status: 404, text: async () => 'Not found' });
    });

    const result = await imageToVideoRunner(
      makeNode({ model: 'veo-3.1-fast' }),
      { image: 'https://example.com/img.png' },
      makeCtx(mockFetch as unknown as typeof fetch),
    );

    expect(result).toEqual({ video: 'https://video.test/sync.mp4' });
    // No polling calls should have been made
    expect(mockFetch).toHaveBeenCalledTimes(1);
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
          json: async () => ({
            jobId: 'job-fail',
            status: 'pending',
            statusUrl: 'https://queue.fal.run/status/fail',
            responseUrl: 'https://queue.fal.run/response/fail',
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ status: 'FAILED' }),
      });
    });

    await expect(
      imageToVideoRunner(
        makeNode(),
        { image: 'https://example.com/img.png' },
        makeCtx(mockFetch as unknown as typeof fetch),
      ),
    ).rejects.toThrow('Video generation failed on fal.ai');
  });
});
