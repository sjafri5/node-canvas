import type { VercelRequest, VercelResponse } from '@vercel/node';

const ENDPOINTS: Record<string, string> = {
  'flux-schnell': 'fal-ai/flux/schnell',
  'nano-banana-pro': 'fal-ai/nano-banana-pro',
  'flux-dev': 'fal-ai/flux/dev',
  'recraft-v4-pro': 'fal-ai/recraft/v4/pro/text-to-image',
};

const ASPECT_RATIO_MAP: Record<string, string | { width: number; height: number }> = {
  '1:1': 'square_hd',
  '16:9': 'landscape_16_9',
  '9:16': 'portrait_9_16',
  '4:5': { width: 832, height: 1040 },
  '2:3': { width: 832, height: 1248 },
};

function buildBody(model: string, prompt: string, aspectRatio: string): Record<string, unknown> {
  const imageSize = ASPECT_RATIO_MAP[aspectRatio] ?? 'square_hd';

  switch (model) {
    case 'recraft-v4-pro':
      return { prompt, image_size: imageSize };
    default:
      return { prompt, image_size: imageSize, num_images: 1 };
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

  const { prompt, model, aspectRatio } = req.body as {
    prompt?: string;
    model?: string;
    aspectRatio?: string;
  };

  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'Missing or invalid prompt' });
    return;
  }

  const modelKey = model ?? 'flux-schnell';
  const endpoint = ENDPOINTS[modelKey] ?? ENDPOINTS['flux-schnell'];

  try {
    const falRes = await fetch(`https://fal.run/${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildBody(modelKey, prompt, aspectRatio ?? '1:1')),
    });

    if (!falRes.ok) {
      const text = await falRes.text();
      res.status(falRes.status).json({ error: text });
      return;
    }

    const data = (await falRes.json()) as { images?: { url: string }[] };
    const imageUrl = data.images?.[0]?.url;

    if (!imageUrl) {
      res.status(502).json({ error: 'No image returned from fal.ai' });
      return;
    }

    res.status(200).json({ imageUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
}
