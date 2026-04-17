import type { ReferenceImageNode } from '../../types';
import type { NodeRunner } from '../../engine/types';

export const referenceImageRunner: NodeRunner<ReferenceImageNode> = async (node) => {
  if (!node.data.imageDataUrl) {
    throw new Error('No image uploaded');
  }
  return { imageUrl: node.data.imageDataUrl };
};
