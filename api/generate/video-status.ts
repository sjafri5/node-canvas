import type { VercelRequest, VercelResponse } from '@vercel/node';

const MODEL_ENDPOINTS: Record<string, string> = {
  'veo-3-fast': 'fal-ai/veo3/fast',
  'gen-3-turbo': 'fal-ai/runway-gen3/turbo/image-to-video',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    res.status(500).json({ error: 'FAL_KEY not configured' });
    return;
  }

  const { jobId, model } = req.query as { jobId?: string; model?: string };
  if (!jobId || typeof jobId !== 'string') {
    res.status(400).json({ error: 'Missing jobId' });
    return;
  }

  const endpoint = MODEL_ENDPOINTS[model ?? 'veo-3-fast'] ?? MODEL_ENDPOINTS['veo-3-fast'];

  try {
    // Check job status
    const statusRes = await fetch(
      `https://queue.fal.run/${endpoint}/requests/${jobId}/status`,
      {
        headers: { Authorization: `Key ${falKey}` },
      },
    );

    if (!statusRes.ok) {
      const text = await statusRes.text();
      res.status(statusRes.status).json({ error: text });
      return;
    }

    const statusData = (await statusRes.json()) as { status: string };

    if (statusData.status === 'COMPLETED') {
      // Fetch the result
      const resultRes = await fetch(
        `https://queue.fal.run/${endpoint}/requests/${jobId}`,
        {
          headers: { Authorization: `Key ${falKey}` },
        },
      );

      if (!resultRes.ok) {
        const text = await resultRes.text();
        res.status(resultRes.status).json({ error: text });
        return;
      }

      const resultData = (await resultRes.json()) as { video?: { url: string } };
      const videoUrl = resultData.video?.url;

      if (!videoUrl) {
        res.status(502).json({ error: 'No video URL in completed result' });
        return;
      }

      res.status(200).json({ status: 'completed', videoUrl });
      return;
    }

    if (statusData.status === 'FAILED') {
      res.status(200).json({ status: 'failed', error: 'Video generation failed on fal.ai' });
      return;
    }

    // IN_QUEUE, IN_PROGRESS, etc.
    res.status(200).json({ status: 'pending' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
}
