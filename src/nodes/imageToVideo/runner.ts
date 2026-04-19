import type { ImageToVideoNode } from '../../types';
import type { NodeRunner } from '../../engine/types';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 180_000;

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

export const imageToVideoRunner: NodeRunner<ImageToVideoNode> = async (node, inputs, ctx) => {
  const upstreamImage = inputs.image;
  if (typeof upstreamImage !== 'string' || upstreamImage.trim() === '') {
    throw new Error('imageToVideo requires an upstream image');
  }

  const { model, motionPrompt } = node.data;
  // Clamp to valid values per model; old localStorage data may have stale durations
  const VEO_DURATIONS = [4, 6, 8];
  const STANDARD_DURATIONS = [5, 10];
  const DURATION_MAP: Record<string, number[]> = {
    'seedance-2.0': STANDARD_DURATIONS,
    'kling-v3-pro': STANDARD_DURATIONS,
    'veo-3.1-fast': VEO_DURATIONS,
    'veo-3.1': VEO_DURATIONS,
  };
  const validDurations = DURATION_MAP[model] ?? STANDARD_DURATIONS;
  const raw = node.data.durationSeconds ?? validDurations[0]!;
  const durationSeconds = validDurations.includes(raw) ? raw : validDurations[0]!;

  // Submit job
  const submitRes = await ctx.fetchFn('/api/generate/video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageUrl: upstreamImage,
      motionPrompt,
      durationSeconds: durationSeconds ?? 5,
      model,
    }),
    signal: ctx.signal,
  });

  if (!submitRes.ok) {
    const text = await submitRes.text();
    throw new Error(`Video submission failed (${String(submitRes.status)}): ${text}`);
  }

  const submitData = (await submitRes.json()) as {
    jobId?: string;
    status: string;
    model?: string;
    videoUrl?: string;
    statusUrl?: string;
    responseUrl?: string;
  };

  // Synchronous models (e.g. veo-3-fast) return the result directly
  if (submitData.status === 'completed' && submitData.videoUrl) {
    return { video: submitData.videoUrl };
  }

  const { statusUrl, responseUrl } = submitData;
  if (!statusUrl || !responseUrl) {
    throw new Error('No polling URLs returned from video submission');
  }

  // Poll for completion (queue-based models like gen-3-turbo)
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS, ctx.signal);

    // Check job status via generic fal.ai proxy
    const statusRes = await ctx.fetchFn('/api/generate/fal-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: statusUrl }),
      signal: ctx.signal,
    });

    if (!statusRes.ok) {
      const text = await statusRes.text();
      throw new Error(`Video status check failed (${String(statusRes.status)}): ${text}`);
    }

    const statusData = (await statusRes.json()) as { status: string };

    if (statusData.status === 'COMPLETED') {
      // Fetch the result via proxy
      const resultRes = await ctx.fetchFn('/api/generate/fal-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: responseUrl }),
        signal: ctx.signal,
      });

      if (!resultRes.ok) {
        const text = await resultRes.text();
        throw new Error(`Video result fetch failed (${String(resultRes.status)}): ${text}`);
      }

      const resultData = (await resultRes.json()) as { video?: { url: string } };
      if (!resultData.video?.url) {
        throw new Error('No video URL in completed result');
      }

      return { video: resultData.video.url };
    }

    if (statusData.status === 'FAILED') {
      throw new Error('Video generation failed on fal.ai');
    }

    // IN_QUEUE, IN_PROGRESS — continue polling
  }

  throw new Error('Video generation timed out after 180 seconds');
};
