import type { VercelRequest, VercelResponse } from '@vercel/node';

const ENDPOINTS: Record<string, string> = {
  'nano-banana-pro-edit': 'fal-ai/nano-banana-pro/edit',
  'flux-pro-kontext': 'fal-ai/flux-pro/kontext',
};

function buildBody(
  model: string,
  imageUrl: string,
  prompt: string,
  strength: number,
): Record<string, unknown> {
  switch (model) {
    case 'nano-banana-pro-edit':
      // nano-banana-pro/edit takes image_urls (array)
      return { image_urls: [imageUrl], prompt };
    case 'flux-pro-kontext':
      return { image_url: imageUrl, prompt };
    default:
      return { image_url: imageUrl, prompt, strength, num_images: 1 };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    res.status(500).json({ error: 'FAL_KEY not configured' });
    return;
  }

  const { imageUrl, prompt, strength, model } = req.body as {
    imageUrl?: string;
    prompt?: string;
    strength?: number;
    model?: string;
  };

  if (!imageUrl || typeof imageUrl !== 'string') {
    res.status(400).json({ error: 'Missing or invalid imageUrl' });
    return;
  }
  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'Missing or invalid prompt' });
    return;
  }

  const DEFAULT_MODEL = 'nano-banana-pro-edit';
  const modelKey = ENDPOINTS[model ?? ''] ? (model ?? DEFAULT_MODEL) : DEFAULT_MODEL;
  const endpoint = ENDPOINTS[modelKey]!;

  try {
    const falRes = await fetch(`https://fal.run/${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildBody(modelKey, imageUrl, prompt, strength ?? 0.25)),
    });

    if (!falRes.ok) {
      const text = await falRes.text();
      res.status(falRes.status).json({ error: text });
      return;
    }

    const data = (await falRes.json()) as { images?: { url: string }[] };
    const resultUrl = data.images?.[0]?.url;

    if (!resultUrl) {
      res.status(502).json({ error: 'No image returned from fal.ai' });
      return;
    }

    res.status(200).json({ imageUrl: resultUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
}
