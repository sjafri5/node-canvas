import type { VercelRequest, VercelResponse } from '@vercel/node';

const MODEL_ENDPOINTS: Record<string, string> = {
  'veo-3-fast': 'fal-ai/veo3/fast',
  'gen-3-turbo': 'fal-ai/runway-gen3/turbo/image-to-video',
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

  const { imageUrl, motionPrompt, durationSeconds, model } = req.body as {
    imageUrl?: string;
    motionPrompt?: string;
    durationSeconds?: number;
    model?: string;
  };

  if (!imageUrl || typeof imageUrl !== 'string') {
    res.status(400).json({ error: 'Missing or invalid imageUrl' });
    return;
  }

  const modelKey = model ?? 'veo-3-fast';
  const endpoint = MODEL_ENDPOINTS[modelKey] ?? MODEL_ENDPOINTS['veo-3-fast'];

  try {
    const falRes = await fetch(`https://queue.fal.run/${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
        prompt: motionPrompt || 'gentle ambient motion',
        duration: durationSeconds ?? 5,
      }),
    });

    if (!falRes.ok) {
      const text = await falRes.text();
      res.status(falRes.status).json({ error: text });
      return;
    }

    const data = (await falRes.json()) as { request_id?: string };
    const requestId = data.request_id;

    if (!requestId) {
      res.status(502).json({ error: 'No request_id returned from fal.ai' });
      return;
    }

    // Return model alongside jobId so the status endpoint knows which model to poll
    res.status(202).json({ jobId: requestId, status: 'pending', model: modelKey });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
}
