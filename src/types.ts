export type NodeStatus = 'idle' | 'running' | 'success' | 'error';

interface BaseNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  status: NodeStatus;
  error?: string;
}

export type ImageModel = 'flux-schnell' | 'nano-banana-pro' | 'flux-dev' | 'recraft-v4-pro';
export type ImageToImageModel = 'nano-banana-pro-edit' | 'flux-pro-kontext';
export type VideoModel = 'seedance-2.0' | 'kling-v3-pro' | 'veo-3.1-fast' | 'veo-3.1';
export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:5' | '2:3';
export type VariationCount = 1 | 2 | 4;
export type ReferenceLabel = 'character' | 'location' | 'style' | 'other';

export interface TextPromptNode extends BaseNode {
  type: 'textPrompt';
  data: { prompt: string };
  output?: { text: string };
}

export interface ImageGenerationNode extends BaseNode {
  type: 'imageGeneration';
  data: {
    model: ImageModel;
    aspectRatio: AspectRatio;
    variationCount: VariationCount;
    selectedVariationIndex?: number;
  };
  output?: { image: string; variations?: string[] };
}

export interface ImageDisplayNode extends BaseNode {
  type: 'imageDisplay';
  data: Record<string, never>;
}

export interface ReferenceImageNode extends BaseNode {
  type: 'referenceImage';
  data: { imageDataUrl: string; label?: ReferenceLabel };
  output?: { image: string };
}

export interface ImageToImageNode extends BaseNode {
  type: 'imageToImage';
  data: {
    prompt: string;
    strength: number;
    model: ImageToImageModel;
    variationCount: VariationCount;
    selectedVariationIndex?: number;
  };
  output?: { output: string; variations?: string[] };
}

export interface ImageToVideoNode extends BaseNode {
  type: 'imageToVideo';
  data: {
    motionPrompt?: string;
    durationSeconds: number;
    model: VideoModel;
  };
  output?: { video: string };
}

export interface VideoDisplayNode extends BaseNode {
  type: 'videoDisplay';
  data: Record<string, never>;
}

export type WorkflowNode =
  | TextPromptNode
  | ImageGenerationNode
  | ImageDisplayNode
  | ReferenceImageNode
  | ImageToImageNode
  | ImageToVideoNode
  | VideoDisplayNode;

/** Derived from WorkflowNode union — adding a node type updates this automatically. */
export type NodeType = WorkflowNode['type'];

/** Nodes that have a runner and produce output. Display nodes are sinks — no runner, no output. */
export type ExecutableNode =
  | TextPromptNode
  | ImageGenerationNode
  | ReferenceImageNode
  | ImageToImageNode
  | ImageToVideoNode;

/** Single source of truth for executable node type literals — used at both type and runtime level. */
export const executableTypes = [
  'textPrompt',
  'imageGeneration',
  'referenceImage',
  'imageToImage',
  'imageToVideo',
] as const;

/** Derived from executableTypes so the type and runtime list can never drift. */
export type ExecutableNodeType = (typeof executableTypes)[number];

export interface Edge {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
}

export interface Workflow {
  version: 1;
  nodes: WorkflowNode[];
  edges: Edge[];
}
