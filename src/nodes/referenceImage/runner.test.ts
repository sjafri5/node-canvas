import { describe, it, expect } from 'vitest';
import { referenceImageRunner } from './runner';
import type { ReferenceImageNode } from '../../types';
import type { RunContext } from '../../engine/types';

function makeNode(imageDataUrl: string): ReferenceImageNode {
  return {
    id: 'ref1',
    type: 'referenceImage',
    position: { x: 0, y: 0 },
    status: 'idle',
    data: { imageDataUrl },
  };
}

const ctx: RunContext = {
  fetchFn: globalThis.fetch.bind(globalThis),
  signal: new AbortController().signal,
};

describe('referenceImageRunner', () => {
  it('returns the data URL as imageUrl', async () => {
    const result = await referenceImageRunner(makeNode('data:image/jpeg;base64,abc123'), {}, ctx);
    expect(result).toEqual({ image: 'data:image/jpeg;base64,abc123' });
  });

  it('throws when no image is uploaded', async () => {
    await expect(referenceImageRunner(makeNode(''), {}, ctx)).rejects.toThrow('No image uploaded');
  });
});
