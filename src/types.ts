export type NodeStatus = 'idle' | 'running' | 'success' | 'error';

interface BaseNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  status: NodeStatus;
  error?: string;
}

export interface TextPromptNode extends BaseNode {
  type: 'textPrompt';
  data: { prompt: string };
  output?: { text: string };
}

export interface ImageGenerationNode extends BaseNode {
  type: 'imageGeneration';
  data: Record<string, never>;
  output?: { imageUrl: string };
}

export interface PromptEnhanceNode extends BaseNode {
  type: 'promptEnhance';
  data: Record<string, never>;
  output?: { text: string };
}

export interface ImageDisplayNode extends BaseNode {
  type: 'imageDisplay';
  data: Record<string, never>;
}

export interface ReferenceImageNode extends BaseNode {
  type: 'referenceImage';
  data: { imageDataUrl: string; label?: string };
  output?: { imageUrl: string };
}

export interface ImageToImageNode extends BaseNode {
  type: 'imageToImage';
  data: { prompt: string; strength?: number };
  output?: { imageUrl: string };
}

export interface ImageToVideoNode extends BaseNode {
  type: 'imageToVideo';
  data: { motionPrompt?: string; durationSeconds?: number };
  output?: { videoUrl: string };
}

export interface VideoDisplayNode extends BaseNode {
  type: 'videoDisplay';
  data: Record<string, never>;
}

export type WorkflowNode =
  | TextPromptNode
  | PromptEnhanceNode
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
  | PromptEnhanceNode
  | ImageGenerationNode
  | ReferenceImageNode
  | ImageToImageNode
  | ImageToVideoNode;

/** Single source of truth for executable node type literals — used at both type and runtime level. */
export const executableTypes = [
  'textPrompt',
  'promptEnhance',
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
