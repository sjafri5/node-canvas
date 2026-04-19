import type { ImageGenerationNode } from '../../types';
import type { NodeRunner } from '../../engine/types';

export const imageGenerationRunner: NodeRunner<ImageGenerationNode> = async (
  node,
  inputs,
  ctx,
) => {
  const prompt = inputs.prompt;
  if (typeof prompt !== 'string' || prompt.trim() === '') {
    throw new Error('No prompt provided to image generation');
  }

  const { model, aspectRatio, variationCount, selectedVariationIndex } = node.data;
  const count = variationCount ?? 1;

  const generateOne = async (): Promise<string> => {
    const res = await ctx.fetchFn('/api/generate/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model, aspectRatio }),
      signal: ctx.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Image generation failed (${String(res.status)}): ${text}`);
    }

    const data = (await res.json()) as { imageUrl: string };
    return data.imageUrl;
  };

  if (count === 1) {
    const imageUrl = await generateOne();
    return { image: imageUrl };
  }

  const variations = await Promise.all(
    Array.from({ length: count }, () => generateOne()),
  );

  const selected = selectedVariationIndex ?? 0;
  const safeIndex = selected < variations.length ? selected : 0;

  return { image: variations[safeIndex] ?? variations[0]!, variations };
};
