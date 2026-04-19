import type { ImageToImageNode } from '../../types';
import type { NodeRunner } from '../../engine/types';

export const imageToImageRunner: NodeRunner<ImageToImageNode> = async (node, inputs, ctx) => {
  const upstreamImage = inputs.image;
  if (typeof upstreamImage !== 'string' || upstreamImage.trim() === '') {
    throw new Error('imageToImage requires an upstream image');
  }

  const { prompt, strength, model, variationCount, selectedVariationIndex } = node.data;
  const count = variationCount ?? 1;

  const generateOne = async (): Promise<string> => {
    const res = await ctx.fetchFn('/api/generate/image-to-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: upstreamImage,
        prompt,
        strength: strength ?? 0.7,
        model,
      }),
      signal: ctx.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Image-to-image failed (${String(res.status)}): ${text}`);
    }

    const data = (await res.json()) as { imageUrl: string };
    return data.imageUrl;
  };

  if (count === 1) {
    const imageUrl = await generateOne();
    return { output: imageUrl };
  }

  const variations = await Promise.all(
    Array.from({ length: count }, () => generateOne()),
  );

  const selected = selectedVariationIndex ?? 0;
  const safeIndex = selected < variations.length ? selected : 0;

  return { output: variations[safeIndex] ?? variations[0]!, variations };
};
