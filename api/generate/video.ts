import type { VercelRequest, VercelResponse } from '@vercel/node';

/** Queue-based models — async, need polling. */
const QUEUE_MODELS: Record<string, string> = {
  'seedance-2.0': 'fal-ai/bytedance/seedance-2.0/image-to-video',
  'kling-v3-pro': 'fal-ai/kling-video/v3/pro/image-to-video',
};

/** Synchronous models — block until result. */
const SYNC_MODELS: Record<string, string> = {
  'veo-3.1-fast': 'fal-ai/veo3.1/fast/image-to-video',
  'veo-3.1': 'fal-ai/veo3.1/image-to-video',
};

function buildBody(
  model: string,
  imageUrl: string,
  motionPrompt: string,
  duration: number,
): Record<string, unknown> {
  switch (model) {
    case 'seedance-2.0':
      return { image_url: imageUrl, prompt: motionPrompt, duration: `${String(duration)}s` };
    case 'kling-v3-pro':
      // Kling expects duration as plain number string: '5', not '5s'
      return { image_url: imageUrl, prompt: motionPrompt, duration: String(duration) };
    case 'veo-3.1-fast':
    case 'veo-3.1':
      return { image_url: imageUrl, prompt: motionPrompt, duration: `${String(duration)}s` };
    default:
      return { image_url: imageUrl, prompt: motionPrompt, duration: `${String(duration)}s` };
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

  const DEFAULT_MODEL = 'veo-3.1-fast';
  const rawKey = model ?? DEFAULT_MODEL;
  const modelKey = (QUEUE_MODELS[rawKey] || SYNC_MODELS[rawKey]) ? rawKey : DEFAULT_MODEL;
  const queueEndpoint = QUEUE_MODELS[modelKey];
  const syncEndpoint = SYNC_MODELS[modelKey];

  if (!queueEndpoint && !syncEndpoint) {
    res.status(400).json({ error: `Unknown video model: ${modelKey}` });
    return;
  }

  const prompt = motionPrompt || 'gentle ambient motion';
  const dur = durationSeconds ?? 5;

  try {
    if (queueEndpoint) {
      const falRes = await fetch(`https://queue.fal.run/${queueEndpoint}`, {
        method: 'POST',
        headers: {
          Authorization: `Key ${falKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildBody(modelKey, imageUrl, prompt, dur)),
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

      if (!data.request_id) {
        res.status(502).json({ error: 'No request_id returned from fal.ai' });
        return;
      }

      res.status(202).json({
        jobId: data.request_id,
        status: 'pending',
        model: modelKey,
        statusUrl: data.status_url,
        responseUrl: data.response_url,
      });
    } else {
      const falRes = await fetch(`https://fal.run/${syncEndpoint!}`, {
        method: 'POST',
        headers: {
          Authorization: `Key ${falKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildBody(modelKey, imageUrl, prompt, dur)),
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

      res.status(200).json({ status: 'completed', videoUrl, model: modelKey });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
}
