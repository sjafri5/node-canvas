import type { VercelRequest, VercelResponse } from '@vercel/node';

const PROMPT_ENHANCE_SYSTEM = `You are a prompt engineer for an image generation model. Take the user's rough prompt and rewrite it as a detailed, vivid, single-paragraph image prompt. Include style, composition, lighting, and mood. Output only the rewritten prompt — no preamble, no quotes, no explanation.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'OPENAI_API_KEY not configured' });
    return;
  }

  const { prompt, systemPrompt, userMessage, maxTokens } = req.body as {
    prompt?: string;
    systemPrompt?: string;
    userMessage?: string;
    maxTokens?: number;
  };

  // Determine message shape: custom system+user or legacy prompt-enhance
  let messages: { role: string; content: string }[];

  if (systemPrompt && userMessage) {
    messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];
  } else if (prompt && typeof prompt === 'string') {
    messages = [
      { role: 'system', content: PROMPT_ENHANCE_SYSTEM },
      { role: 'user', content: prompt },
    ];
  } else {
    res.status(400).json({ error: 'Missing prompt or systemPrompt+userMessage' });
    return;
  }

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: maxTokens ?? 300,
      }),
    });

    if (!openaiRes.ok) {
      const text = await openaiRes.text();
      res.status(openaiRes.status).json({ error: text });
      return;
    }

    const data = (await openaiRes.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();

    if (!text) {
      res.status(502).json({ error: 'No text returned from OpenAI' });
      return;
    }

    res.status(200).json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
}
