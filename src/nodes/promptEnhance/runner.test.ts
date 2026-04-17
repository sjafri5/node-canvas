import { describe, it, expect, vi } from 'vitest';
import { promptEnhanceRunner } from './runner';
import type { PromptEnhanceNode } from '../../types';
import type { RunContext } from '../../engine/types';

function makeNode(): PromptEnhanceNode {
  return {
    id: 'pe1',
    type: 'promptEnhance',
    position: { x: 0, y: 0 },
    status: 'idle',
    data: {} as Record<string, never>,
  };
}

function makeCtx(fetchFn: RunContext['fetchFn']): RunContext {
  return { fetchFn, signal: new AbortController().signal };
}

describe('promptEnhanceRunner', () => {
  it('sends prompt to API and returns enhanced text', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: 'A vivid, detailed scene of a cat floating in space...' }),
    });

    const result = await promptEnhanceRunner(
      makeNode(),
      { 'text-in': 'a cat in space' },
      makeCtx(mockFetch as unknown as typeof fetch),
    );

    expect(result).toEqual({ text: 'A vivid, detailed scene of a cat floating in space...' });
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/generate/text',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ prompt: 'a cat in space' }),
      }),
    );
  });

  it('throws on non-2xx response with error text', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    await expect(
      promptEnhanceRunner(
        makeNode(),
        { 'text-in': 'test' },
        makeCtx(mockFetch as unknown as typeof fetch),
      ),
    ).rejects.toThrow('Prompt enhancement failed (500): Internal Server Error');
  });

  it('throws when text-in is missing', async () => {
    const mockFetch = vi.fn();

    await expect(
      promptEnhanceRunner(makeNode(), {}, makeCtx(mockFetch as unknown as typeof fetch)),
    ).rejects.toThrow('No text provided');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
