import type { NodeTypes } from '@xyflow/react';
import type { RunnerRegistry } from '../engine/types';
import { TextPromptNode } from './textPrompt/TextPromptNode';
import { textPromptRunner } from './textPrompt/runner';
import { ImageGenerationNode } from './imageGeneration/ImageGenerationNode';
import { imageGenerationRunner } from './imageGeneration/runner';
import { ImageDisplayNode } from './imageDisplay/ImageDisplayNode';
import { ReferenceImageNode } from './referenceImage/ReferenceImageNode';
import { referenceImageRunner } from './referenceImage/runner';
import { ImageToImageNode } from './imageToImage/ImageToImageNode';
import { imageToImageRunner } from './imageToImage/runner';
import { ImageToVideoNode } from './imageToVideo/ImageToVideoNode';
import { imageToVideoRunner } from './imageToVideo/runner';
import { VideoDisplayNode } from './videoDisplay/VideoDisplayNode';

export const nodeTypes: NodeTypes = {
  textPrompt: TextPromptNode,
  imageGeneration: ImageGenerationNode,
  imageDisplay: ImageDisplayNode,
  referenceImage: ReferenceImageNode,
  imageToImage: ImageToImageNode,
  imageToVideo: ImageToVideoNode,
  videoDisplay: VideoDisplayNode,
};

export const runners: RunnerRegistry = {
  textPrompt: textPromptRunner,
  imageGeneration: imageGenerationRunner,
  referenceImage: referenceImageRunner,
  imageToImage: imageToImageRunner,
  imageToVideo: imageToVideoRunner,
};
