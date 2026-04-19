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

  const { model, motionPrompt, durationSeconds } = node.data;

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

  const submitData = (await submitRes.json()) as { jobId: string; status: string; model?: string };
  const { jobId } = submitData;
  const resolvedModel = submitData.model ?? model;

  // Poll for completion
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS, ctx.signal);

    const statusRes = await ctx.fetchFn(
      `/api/generate/video-status?jobId=${jobId}&model=${resolvedModel}`,
      { signal: ctx.signal },
    );

    if (!statusRes.ok) {
      const text = await statusRes.text();
      throw new Error(`Video status check failed (${String(statusRes.status)}): ${text}`);
    }

    const statusData = (await statusRes.json()) as {
      status: string;
      videoUrl?: string;
      error?: string;
    };

    if (statusData.status === 'completed' && statusData.videoUrl) {
      return { video: statusData.videoUrl };
    }

    if (statusData.status === 'failed') {
      throw new Error(statusData.error ?? 'Video generation failed');
    }

    // status === 'pending' — continue polling
  }

  throw new Error('Video generation timed out after 180 seconds');
};
