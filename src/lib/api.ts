export async function generateImage(prompt: string): Promise<{ imageUrl: string }> {
  const res = await fetch('/api/generate/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Image generation failed: ${text}`);
  }

  return res.json() as Promise<{ imageUrl: string }>;
}
