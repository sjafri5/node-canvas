import type { ImageToImageNode } from '../../types';
import type { NodeRunner } from '../../engine/types';

export const imageToImageRunner: NodeRunner<ImageToImageNode> = async (node, inputs, ctx) => {
  const upstreamImage = inputs.image;
  if (typeof upstreamImage !== 'string' || upstreamImage.trim() === '') {
    throw new Error('imageToImage requires an upstream image');
  }

  const res = await ctx.fetchFn('/api/generate/image-to-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageUrl: upstreamImage,
      prompt: node.data.prompt,
      strength: node.data.strength ?? 0.7,
    }),
    signal: ctx.signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Image-to-image failed (${String(res.status)}): ${text}`);
  }

  const data = (await res.json()) as { imageUrl: string };
  return { imageUrl: data.imageUrl };
};
