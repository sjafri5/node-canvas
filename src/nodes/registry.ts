import type { NodeTypes } from '@xyflow/react';
import type { RunnerRegistry } from '../engine/types';
import { TextPromptNode } from './textPrompt/TextPromptNode';
import { textPromptRunner } from './textPrompt/runner';
import { PromptEnhanceNode } from './promptEnhance/PromptEnhanceNode';
import { promptEnhanceRunner } from './promptEnhance/runner';
import { ImageGenerationNode } from './imageGeneration/ImageGenerationNode';
import { imageGenerationRunner } from './imageGeneration/runner';
import { ImageDisplayNode } from './imageDisplay/ImageDisplayNode';

export const nodeTypes: NodeTypes = {
  textPrompt: TextPromptNode,
  promptEnhance: PromptEnhanceNode,
  imageGeneration: ImageGenerationNode,
  imageDisplay: ImageDisplayNode,
};

// Placeholder runners for V2 node types — replaced with real implementations in Milestones 1–4
const notImplemented = async () => {
  throw new Error('Runner not implemented yet');
};

export const runners: RunnerRegistry = {
  textPrompt: textPromptRunner,
  promptEnhance: promptEnhanceRunner,
  imageGeneration: imageGenerationRunner,
  referenceImage: notImplemented as RunnerRegistry['referenceImage'],
  imageToImage: notImplemented as RunnerRegistry['imageToImage'],
  imageToVideo: notImplemented as RunnerRegistry['imageToVideo'],
};
