import type { ViewId } from './types';
import { VIEW_PROMPTS } from './viewPrompts';

/**
 * Generate a single character view via the img2img proxy.
 * Uses nano-banana-pro/edit for best subject identity preservation.
 * Returns the fal.ai CDN image URL on success.
 */
export async function generateView(
  referenceImageUrl: string,
  viewId: ViewId,
): Promise<string> {
  const res = await fetch('/api/generate/image-to-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'nano-banana-pro-edit',
      imageUrl: referenceImageUrl,
      prompt: VIEW_PROMPTS[viewId],
      strength: 0.6,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`View generation failed (${String(res.status)}): ${text}`);
  }

  const data = (await res.json()) as { imageUrl: string };
  return data.imageUrl;
}
