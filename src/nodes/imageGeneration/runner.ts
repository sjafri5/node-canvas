import type { ImageGenerationNode } from '../../types';
import type { NodeRunner } from '../../engine/types';

export const imageGenerationRunner: NodeRunner<ImageGenerationNode> = async (
  _node,
  inputs,
  ctx,
) => {
  const prompt = inputs.prompt;
  if (typeof prompt !== 'string' || prompt.trim() === '') {
    throw new Error('No prompt provided to image generation');
  }

  const res = await ctx.fetchFn('/api/generate/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
    signal: ctx.signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Image generation failed (${String(res.status)}): ${text}`);
  }

  const data = (await res.json()) as { imageUrl: string };
  return { imageUrl: data.imageUrl };
};
