export type NodeType = 'textPrompt' | 'imageGeneration' | 'imageDisplay';
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

export interface ImageDisplayNode extends BaseNode {
  type: 'imageDisplay';
  data: Record<string, never>;
}

export type WorkflowNode = TextPromptNode | ImageGenerationNode | ImageDisplayNode;

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
