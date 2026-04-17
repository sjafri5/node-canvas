import { describe, it, expect } from 'vitest';
import { textPromptRunner } from './runner';
import type { TextPromptNode } from '../../types';
import type { RunContext } from '../../engine/types';

function makeNode(prompt: string): TextPromptNode {
  return {
    id: 'tp1',
    type: 'textPrompt',
    position: { x: 0, y: 0 },
    status: 'idle',
    data: { prompt },
  };
}

const ctx: RunContext = {
  fetchFn: globalThis.fetch,
  signal: new AbortController().signal,
};

describe('textPromptRunner', () => {
  it('returns the prompt text as output', async () => {
    const result = await textPromptRunner(makeNode('a cat in space'), {}, ctx);
    expect(result).toEqual({ text: 'a cat in space' });
  });

  it('returns empty string when prompt is empty', async () => {
    const result = await textPromptRunner(makeNode(''), {}, ctx);
    expect(result).toEqual({ text: '' });
  });
});
