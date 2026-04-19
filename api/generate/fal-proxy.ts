import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Generic fal.ai proxy — forwards a GET request to any fal.ai URL
 * with the server-side FAL_KEY. Used for queue status polling and
 * result fetching where the client has the URL but not the key.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    res.status(500).json({ error: 'FAL_KEY not configured' });
    return;
  }

  const { url } = req.body as { url?: string };

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Missing url in request body' });
    return;
  }

  // Only allow fal.ai URLs for security
  if (!url.startsWith('https://queue.fal.run/') && !url.startsWith('https://fal.run/')) {
    res.status(400).json({ error: 'Only fal.ai URLs are allowed' });
    return;
  }

  try {
    const r = await fetch(url, {
      headers: { Authorization: `Key ${falKey}` },
    });
    const text = await r.text();
    res.status(r.status).send(text);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
