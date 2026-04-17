import type { TextPromptNode } from '../../types';
import type { NodeRunner } from '../../engine/types';

export const textPromptRunner: NodeRunner<TextPromptNode> = async (node) => {
  return { text: node.data.prompt };
};
