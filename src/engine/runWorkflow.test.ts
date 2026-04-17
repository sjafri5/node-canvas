import { describe, it, expect, vi } from 'vitest';
import { runWorkflow } from './runWorkflow';
import { CycleError } from './types';
import type { RunnerRegistry, StatusChangeEvent } from './types';
import type { Workflow, WorkflowNode, Edge } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function textNode(id: string, prompt = ''): WorkflowNode {
  return {
    id,
    type: 'textPrompt',
    position: { x: 0, y: 0 },
    status: 'idle',
    data: { prompt },
  };
}

function imageGenNode(id: string): WorkflowNode {
  return {
    id,
    type: 'imageGeneration',
    position: { x: 0, y: 0 },
    status: 'idle',
    data: {} as Record<string, never>,
  };
}

function displayNode(id: string): WorkflowNode {
  return {
    id,
    type: 'imageDisplay',
    position: { x: 0, y: 0 },
    status: 'idle',
    data: {} as Record<string, never>,
  };
}

function edge(source: string, sourceHandle: string, target: string, targetHandle: string): Edge {
  return { id: `${source}->${target}`, source, target, sourceHandle, targetHandle };
}

function wf(nodes: WorkflowNode[], edges: Edge[]): Workflow {
  return { version: 1, nodes, edges };
}

/** Creates a mock registry where textPrompt echoes its prompt and imageGen returns a URL. */
function mockRegistry(overrides?: Partial<RunnerRegistry>): RunnerRegistry {
  return {
    textPrompt: vi.fn(async (node) => ({ text: node.data.prompt })),
    imageGeneration: vi.fn(async (_node, inputs) => ({
      imageUrl: `https://img.test/${String(inputs.prompt ?? 'unknown')}`,
    })),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('runWorkflow', () => {
  it('executes a linear chain and propagates outputs', async () => {
    // TextPrompt("hello") -> ImageGeneration -> (display sink, skipped by engine)
    const workflow = wf(
      [textNode('t1', 'hello'), imageGenNode('ig1'), displayNode('d1')],
      [
        edge('t1', 'text', 'ig1', 'prompt'),
        edge('ig1', 'image', 'd1', 'image'),
      ],
    );

    const events: StatusChangeEvent[] = [];
    const registry = mockRegistry();

    const outputs = await runWorkflow(workflow, registry, (e) => events.push(e));

    // textPrompt runner was called
    expect(registry.textPrompt).toHaveBeenCalledOnce();
    // imageGeneration runner was called with correct input
    expect(registry.imageGeneration).toHaveBeenCalledOnce();
    const igCall = vi.mocked(registry.imageGeneration).mock.calls[0];
    expect(igCall?.[1]).toEqual({ prompt: 'hello' });

    // Outputs map has entries for executable nodes only
    expect(outputs.get('t1')).toEqual({ text: 'hello' });
    expect(outputs.get('ig1')).toEqual({ imageUrl: 'https://img.test/hello' });
    expect(outputs.has('d1')).toBe(false);
  });

  it('correctly maps inputs by targetHandle from upstream sourceHandle', async () => {
    // Two text prompts feeding different handles (only prompt used here)
    const workflow = wf(
      [textNode('t1', 'cat'), imageGenNode('ig1')],
      [edge('t1', 'text', 'ig1', 'prompt')],
    );

    const registry = mockRegistry();
    await runWorkflow(workflow, registry, () => {});

    const igCall = vi.mocked(registry.imageGeneration).mock.calls[0];
    expect(igCall?.[1]).toEqual({ prompt: 'cat' });
  });

  it('skips display-only nodes without calling any runner', async () => {
    const workflow = wf([displayNode('d1')], []);
    const registry = mockRegistry();

    const outputs = await runWorkflow(workflow, registry, () => {});

    expect(registry.textPrompt).not.toHaveBeenCalled();
    expect(registry.imageGeneration).not.toHaveBeenCalled();
    expect(outputs.size).toBe(0);
  });

  it('halts downstream of a failed node but runs unrelated branches', async () => {
    // Branch 1: t1 -> ig1 (t1 fails, ig1 should be skipped)
    // Branch 2: t2 -> ig2 (should run fine)
    const workflow = wf(
      [textNode('t1', 'fail'), imageGenNode('ig1'), textNode('t2', 'ok'), imageGenNode('ig2')],
      [
        edge('t1', 'text', 'ig1', 'prompt'),
        edge('t2', 'text', 'ig2', 'prompt'),
      ],
    );

    const events: StatusChangeEvent[] = [];
    const registry = mockRegistry({
      textPrompt: vi.fn(async (node) => {
        if (node.id === 't1') throw new Error('prompt service down');
        return { text: node.data.prompt };
      }),
    });

    const outputs = await runWorkflow(workflow, registry, (e) => events.push(e));

    // t1 errored
    expect(events.find((e) => e.nodeId === 't1' && e.status === 'error')).toBeTruthy();
    // ig1 was skipped (downstream of t1)
    expect(events.find((e) => e.nodeId === 'ig1' && e.status === 'error')).toBeTruthy();
    expect(outputs.has('ig1')).toBe(false);

    // Branch 2 ran successfully
    expect(events.find((e) => e.nodeId === 't2' && e.status === 'success')).toBeTruthy();
    expect(events.find((e) => e.nodeId === 'ig2' && e.status === 'success')).toBeTruthy();
    expect(outputs.get('ig2')).toEqual({ imageUrl: 'https://img.test/ok' });
  });

  it('emits status events in correct order: running then success/error', async () => {
    const workflow = wf(
      [textNode('t1', 'hello'), imageGenNode('ig1')],
      [edge('t1', 'text', 'ig1', 'prompt')],
    );

    const events: StatusChangeEvent[] = [];
    await runWorkflow(workflow, mockRegistry(), (e) => events.push(e));

    // t1: running, success — then ig1: running, success
    const statuses = events.map((e) => `${e.nodeId}:${e.status}`);
    expect(statuses).toEqual([
      't1:running',
      't1:success',
      'ig1:running',
      'ig1:success',
    ]);
  });

  it('throws CycleError before any runner is called', async () => {
    const workflow = wf(
      [textNode('t1', 'a'), textNode('t2', 'b')],
      [edge('t1', 'text', 't2', 'prompt'), edge('t2', 'text', 't1', 'prompt')],
    );

    const registry = mockRegistry();

    await expect(runWorkflow(workflow, registry, () => {})).rejects.toThrow(CycleError);
    expect(registry.textPrompt).not.toHaveBeenCalled();
    expect(registry.imageGeneration).not.toHaveBeenCalled();
  });
});
