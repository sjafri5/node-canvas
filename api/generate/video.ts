import type { VercelRequest, VercelResponse } from '@vercel/node';

const QUEUE_MODELS: Record<string, string> = {
  'gen-3-turbo': 'fal-ai/runway-gen3/turbo/image-to-video',
};

const SYNC_MODELS: Record<string, string> = {
  'veo-3-fast': 'fal-ai/veo3/fast',
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
  const queueEndpoint = QUEUE_MODELS[modelKey];
  const syncEndpoint = SYNC_MODELS[modelKey];

  if (!queueEndpoint && !syncEndpoint) {
    res.status(400).json({ error: `Unknown video model: ${modelKey}` });
    return;
  }

  try {
    if (queueEndpoint) {
      // Async queue-based model (gen-3-turbo)
      const falRes = await fetch(`https://queue.fal.run/${queueEndpoint}`, {
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

      const data = (await falRes.json()) as {
        request_id?: string;
        status_url?: string;
        response_url?: string;
      };
      const requestId = data.request_id;

      if (!requestId) {
        res.status(502).json({ error: 'No request_id returned from fal.ai' });
        return;
      }

      res.status(202).json({
        jobId: requestId,
        status: 'pending',
        model: modelKey,
        statusUrl: data.status_url,
        responseUrl: data.response_url,
      });
    } else {
      // Synchronous model (veo-3-fast) — blocks until result is ready
      // veo3 expects duration as a string like '4s', '6s', '8s'
      const dur = durationSeconds ?? 4;
      const falRes = await fetch(`https://fal.run/${syncEndpoint!}`, {
        method: 'POST',
        headers: {
          Authorization: `Key ${falKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: imageUrl,
          prompt: motionPrompt || 'gentle ambient motion',
          duration: `${String(dur)}s`,
        }),
      });

      if (!falRes.ok) {
        const text = await falRes.text();
        res.status(falRes.status).json({ error: text });
        return;
      }

      const data = (await falRes.json()) as { video?: { url: string } };
      const videoUrl = data.video?.url;

      if (!videoUrl) {
        res.status(502).json({ error: 'No video URL returned from fal.ai' });
        return;
      }

      // Return completed result directly — no polling needed
      res.status(200).json({ status: 'completed', videoUrl, model: modelKey });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
}
