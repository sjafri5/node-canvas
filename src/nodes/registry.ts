import type { NodeTypes } from '@xyflow/react';
import type { RunnerRegistry } from '../engine/types';
import { TextPromptNode } from './textPrompt/TextPromptNode';
import { textPromptRunner } from './textPrompt/runner';
import { ImageGenerationNode } from './imageGeneration/ImageGenerationNode';
import { imageGenerationRunner } from './imageGeneration/runner';
import { ImageDisplayNode } from './imageDisplay/ImageDisplayNode';

export const nodeTypes: NodeTypes = {
  textPrompt: TextPromptNode,
  imageGeneration: ImageGenerationNode,
  imageDisplay: ImageDisplayNode,
};

export const runners: RunnerRegistry = {
  textPrompt: textPromptRunner,
  imageGeneration: imageGenerationRunner,
};
