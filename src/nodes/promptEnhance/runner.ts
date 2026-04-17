import type { PromptEnhanceNode } from '../../types';
import type { NodeRunner } from '../../engine/types';

export const promptEnhanceRunner: NodeRunner<PromptEnhanceNode> = async (
  _node,
  inputs,
  ctx,
) => {
  const textIn = inputs['text-in'];
  if (typeof textIn !== 'string' || textIn.trim() === '') {
    throw new Error('No text provided to prompt enhance');
  }

  const res = await ctx.fetchFn('/api/generate/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: textIn }),
    signal: ctx.signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Prompt enhancement failed (${String(res.status)}): ${text}`);
  }

  const data = (await res.json()) as { text: string };
  return { text: data.text };
};
