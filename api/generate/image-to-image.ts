import type { VercelRequest, VercelResponse } from '@vercel/node';

const MODEL_ENDPOINTS: Record<string, string> = {
  'flux-schnell': 'fal-ai/flux/schnell/image-to-image',
  'flux-dev': 'fal-ai/flux/dev/image-to-image',
};

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

  const endpoint = MODEL_ENDPOINTS[model ?? 'flux-dev'] ?? MODEL_ENDPOINTS['flux-dev'];

  try {
    const falRes = await fetch(`https://fal.run/${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
        prompt,
        strength: strength ?? 0.7,
        num_images: 1,
      }),
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
