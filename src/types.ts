export type NodeType = 'textPrompt' | 'promptEnhance' | 'imageGeneration' | 'imageDisplay';
export type NodeStatus = 'idle' | 'running' | 'success' | 'error';

interface BaseNode {
  id: string;
  type: NodeType;
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

export type WorkflowNode = TextPromptNode | PromptEnhanceNode | ImageGenerationNode | ImageDisplayNode;

/** Nodes that have a runner and produce output. ImageDisplayNode is a sink — no runner, no output. */
export type ExecutableNode = TextPromptNode | PromptEnhanceNode | ImageGenerationNode;

/** Single source of truth for executable node type literals — used at both type and runtime level. */
export const executableTypes = ['textPrompt', 'promptEnhance', 'imageGeneration'] as const;

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
