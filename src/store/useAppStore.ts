import { create } from 'zustand';
import type { NodeChange, EdgeChange } from '@xyflow/react';
import { applyNodeChanges as rfApplyNodeChanges, applyEdgeChanges as rfApplyEdgeChanges } from '@xyflow/react';
import type { WorkflowNode, Edge, NodeType } from '../types';
import type { Character, ViewId } from '../characters/types';
import { VIEW_IDS } from '../characters/types';
import type { MiniDrama, TonalPreset } from '../miniDramas/types';
import { generateArc } from '../miniDramas/generateArc';
import { draftEpisode as draftEpisodeHelper } from '../miniDramas/draftEpisode';
import { buildArcSystemPrompt, buildEpisodeDraftPrompt } from '../miniDramas/systemPrompts';
import { buildAvailableLockedViews } from '../miniDramas/referenceSetup';
import { TONAL_PRESETS } from '../miniDramas/tonalPresets';
import { runWorkflow as engineRunWorkflow } from '../engine/runWorkflow';
import type { RunnerRegistry } from '../engine/types';
import { CycleError } from '../engine/types';
import { createId } from '../lib/id';
import { slugify } from '../characters/slug';
import { generateView } from '../characters/generateView';
import { loadFromStorage, createDebouncedSave, isValidWorkflow } from './persistence';

interface AppStore {
  // graph
  nodes: WorkflowNode[];
  edges: Edge[];
  addNode: (type: NodeType, position: { x: number; y: number }) => void;
  updateNodeData: <T extends WorkflowNode['type']>(
    id: string,
    type: T,
    patch: Partial<Extract<WorkflowNode, { type: T }>['data']>,
  ) => void;
  selectVariation: (nodeId: string, index: number) => void;
  connect: (edge: Omit<Edge, 'id'>) => void;
  deleteNode: (id: string) => void;
  applyNodeChanges: (changes: NodeChange<WorkflowNode>[]) => void;
  applyEdgeChanges: (changes: EdgeChange<Edge>[]) => void;

  clearCanvas: () => void;
  exportWorkflow: () => string;
  importWorkflow: (json: string) => void;

  // execution
  isRunning: boolean;
  runWorkflow: (registry: RunnerRegistry) => Promise<void>;

  // characters
  characters: Record<string, Character>;
  createCharacter: (name: string, referenceImageUrl: string) => string;
  deleteCharacter: (id: string) => void;
  startViewGeneration: (characterId: string, viewId: ViewId) => void;
  setViewReady: (characterId: string, viewId: ViewId, imageUrl: string) => void;
  setViewError: (characterId: string, viewId: ViewId, error: string) => void;
  lockView: (characterId: string, viewId: ViewId) => void;
  unlockView: (characterId: string, viewId: ViewId) => void;
  generateAllViews: (characterId: string) => Promise<void>;
  regenerateView: (characterId: string, viewId: ViewId) => Promise<void>;

  // mini dramas
  miniDramas: Record<string, MiniDrama>;
  createMiniDrama: (params: {
    characterId: string;
    premise: string;
    tonalPreset: TonalPreset;
    visualStyleBlock: string;
  }) => string;
  updateMiniDrama: (id: string, patch: Partial<MiniDrama>) => void;
  deleteMiniDrama: (id: string) => void;
  generateArc: (dramaId: string) => Promise<void>;
  draftEpisode: (dramaId: string, episodeNumber: number) => Promise<void>;
  regenerateEpisode: (dramaId: string, episodeNumber: number) => Promise<void>;
}

function createDefaultNode(type: NodeType, position: { x: number; y: number }): WorkflowNode {
  const base = { id: createId(), position, status: 'idle' as const, error: undefined };

  switch (type) {
    case 'textPrompt':
      return { ...base, type, data: { prompt: '' } };
    case 'imageGeneration':
      return {
        ...base,
        type,
        data: { model: 'flux-schnell', aspectRatio: '1:1', variationCount: 1 },
      };
    case 'imageDisplay':
      return { ...base, type, data: {} as Record<string, never> };
    case 'referenceImage':
      return { ...base, type, data: { imageDataUrl: '' } };
    case 'imageToImage':
      return {
        ...base,
        type,
        data: { prompt: '', strength: 0.25, model: 'nano-banana-pro-edit', variationCount: 1 },
      };
    case 'imageToVideo':
      return { ...base, type, data: { model: 'veo-3.1-fast', durationSeconds: 4 } };
    case 'videoDisplay':
      return { ...base, type, data: {} as Record<string, never> };
  }
}

function createEmptyViews(): Record<ViewId, Character['views'][ViewId]> {
  const views = {} as Record<ViewId, Character['views'][ViewId]>;
  for (const viewId of VIEW_IDS) {
    views[viewId] = { viewId, status: 'pending' };
  }
  return views;
}

function deriveIsComplete(views: Record<ViewId, Character['views'][ViewId]>): boolean {
  return VIEW_IDS.every((id) => views[id]?.status === 'locked');
}

function updateCharacterView(
  characters: Record<string, Character>,
  characterId: string,
  viewId: ViewId,
  patch: Partial<Character['views'][ViewId]>,
): Record<string, Character> {
  const character = characters[characterId];
  if (!character) return characters;

  const updatedView = { ...character.views[viewId], ...patch };
  const updatedViews = { ...character.views, [viewId]: updatedView };

  return {
    ...characters,
    [characterId]: {
      ...character,
      views: updatedViews,
      isComplete: deriveIsComplete(updatedViews),
      updatedAt: Date.now(),
    },
  };
}

/**
 * Collect all node IDs that are transitively downstream of a source node.
 */
function getDownstreamNodeIds(nodeId: string, edges: Edge[]): Set<string> {
  const downstream = new Set<string>();
  const queue = [nodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of edges) {
      if (edge.source === current && !downstream.has(edge.target)) {
        downstream.add(edge.target);
        queue.push(edge.target);
      }
    }
  }
  return downstream;
}

const initial = loadFromStorage();
const debouncedSave = createDebouncedSave();

export const useAppStore = create<AppStore>((set, get) => ({
  nodes: initial.nodes,
  edges: initial.edges,

  addNode: (type, position) => {
    const node = createDefaultNode(type, position);
    set((s) => ({ nodes: [...s.nodes, node] }));
  },

  updateNodeData: (id, _type, patch) => {
    set((s) => ({
      nodes: s.nodes.map((n) => {
        if (n.id !== id) return n;
        return { ...n, data: { ...n.data, ...patch } } as WorkflowNode;
      }),
    }));
  },

  selectVariation: (nodeId, index) => {
    const { edges } = get();
    const downstreamIds = getDownstreamNodeIds(nodeId, edges);

    set((s) => ({
      nodes: s.nodes.map((n) => {
        if (n.id === nodeId && 'output' in n && n.output != null) {
          const output = n.output as Record<string, unknown>;
          const variations = output.variations as string[] | undefined;
          if (!variations || index < 0 || index >= variations.length) return n;

          const outputKey = n.type === 'imageToImage' ? 'output' : 'image';
          return {
            ...n,
            data: { ...n.data, selectedVariationIndex: index },
            output: { ...output, [outputKey]: variations[index] },
          } as WorkflowNode;
        }
        if (downstreamIds.has(n.id)) {
          return { ...n, status: 'idle' as const, error: undefined, output: undefined } as WorkflowNode;
        }
        return n;
      }),
    }));
  },

  connect: (edge) => {
    set((s) => ({ edges: [...s.edges, { ...edge, id: createId() }] }));
  },

  deleteNode: (id) => {
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
    }));
  },

  applyNodeChanges: (changes) => {
    set((s) => ({
      nodes: rfApplyNodeChanges(changes, s.nodes) as WorkflowNode[],
    }));
  },

  applyEdgeChanges: (changes) => {
    set((s) => ({
      edges: rfApplyEdgeChanges(changes, s.edges) as Edge[],
    }));
  },

  clearCanvas: () => {
    set({ nodes: [], edges: [] });
  },

  exportWorkflow: () => {
    const { nodes, edges, characters, miniDramas } = get();
    const stripped = nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: n.data,
    }));
    return JSON.stringify({ version: 3, nodes: stripped, edges, characters, miniDramas }, null, 2);
  },

  importWorkflow: (json: string) => {
    const parsed: unknown = JSON.parse(json);
    if (!isValidWorkflow(parsed)) {
      throw new Error('Invalid workflow file: wrong version or shape');
    }
    const resetNodes = parsed.nodes.map((n: WorkflowNode) => ({
      ...n,
      status: 'idle' as const,
      error: undefined,
      output: undefined,
    })) as WorkflowNode[];
    const imported = parsed as { characters?: Record<string, Character>; miniDramas?: Record<string, MiniDrama> };
    set({
      nodes: resetNodes,
      edges: parsed.edges,
      characters: imported.characters ?? {},
      miniDramas: imported.miniDramas ?? {},
    });
  },

  isRunning: false,

  runWorkflow: async (registry) => {
    const { nodes, edges } = get();

    set({
      isRunning: true,
      nodes: nodes.map((n) => ({ ...n, status: 'idle' as const, error: undefined })),
    });

    const workflow = { version: 1 as const, nodes: get().nodes, edges };

    try {
      const outputs = await engineRunWorkflow(
        workflow,
        registry,
        (event) => {
          set((s) => ({
            nodes: s.nodes.map((n) =>
              n.id === event.nodeId
                ? { ...n, status: event.status, error: event.error }
                : n,
            ),
          }));
        },
      );

      set((s) => ({
        isRunning: false,
        nodes: s.nodes.map((n) => {
          const output = outputs.get(n.id);
          if (output !== undefined) {
            return { ...n, output } as WorkflowNode;
          }
          return n;
        }),
      }));
    } catch (err) {
      if (err instanceof CycleError) {
        set((s) => ({
          isRunning: false,
          nodes: s.nodes.map((n) =>
            err.nodeIds.includes(n.id)
              ? { ...n, status: 'error' as const, error: 'Part of a dependency cycle' }
              : n,
          ),
        }));
      } else {
        set({ isRunning: false });
        throw err;
      }
    }
  },

  // ---- Characters ----

  characters: initial.characters,

  createCharacter: (name, referenceImageUrl) => {
    const id = slugify(name);
    const now = Date.now();
    const character: Character = {
      id,
      name,
      referenceImageUrl,
      views: createEmptyViews(),
      isComplete: false,
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({
      characters: { ...s.characters, [id]: character },
    }));
    return id;
  },

  deleteCharacter: (id) => {
    set((s) => {
      const next = { ...s.characters };
      delete next[id];
      return { characters: next };
    });
  },

  startViewGeneration: (characterId, viewId) => {
    set((s) => ({
      characters: updateCharacterView(s.characters, characterId, viewId, {
        status: 'pending',
        imageUrl: undefined,
        error: undefined,
      }),
    }));
  },

  setViewReady: (characterId, viewId, imageUrl) => {
    set((s) => ({
      characters: updateCharacterView(s.characters, characterId, viewId, {
        status: 'ready',
        imageUrl,
        error: undefined,
        generatedAt: Date.now(),
      }),
    }));
  },

  setViewError: (characterId, viewId, error) => {
    set((s) => ({
      characters: updateCharacterView(s.characters, characterId, viewId, {
        status: 'error',
        error,
      }),
    }));
  },

  lockView: (characterId, viewId) => {
    set((s) => ({
      characters: updateCharacterView(s.characters, characterId, viewId, {
        status: 'locked',
      }),
    }));
  },

  unlockView: (characterId, viewId) => {
    set((s) => ({
      characters: updateCharacterView(s.characters, characterId, viewId, {
        status: 'ready',
      }),
    }));
  },

  generateAllViews: async (characterId) => {
    const { characters } = get();
    const character = characters[characterId];
    if (!character) return;

    // Mark all views as pending
    for (const viewId of VIEW_IDS) {
      get().startViewGeneration(characterId, viewId);
    }

    // Fire all 8 generations in parallel
    await Promise.all(
      VIEW_IDS.map(async (viewId) => {
        try {
          const imageUrl = await generateView(character.referenceImageUrl, viewId);
          get().setViewReady(characterId, viewId, imageUrl);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          get().setViewError(characterId, viewId, message);
        }
      }),
    );
  },

  regenerateView: async (characterId, viewId) => {
    const { characters } = get();
    const character = characters[characterId];
    if (!character) return;

    get().startViewGeneration(characterId, viewId);

    try {
      const imageUrl = await generateView(character.referenceImageUrl, viewId);
      get().setViewReady(characterId, viewId, imageUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      get().setViewError(characterId, viewId, message);
    }
  },

  // ---- Mini Dramas ----

  miniDramas: initial.miniDramas,

  createMiniDrama: (params) => {
    const id = createId();
    const now = Date.now();
    const drama: MiniDrama = {
      id,
      characterId: params.characterId,
      premise: params.premise,
      tonalPreset: params.tonalPreset,
      visualStyleBlock: params.visualStyleBlock,
      episodes: [],
      arcStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({
      miniDramas: { ...s.miniDramas, [id]: drama },
    }));
    return id;
  },

  updateMiniDrama: (id, patch) => {
    set((s) => {
      const existing = s.miniDramas[id];
      if (!existing) return s;
      return {
        miniDramas: {
          ...s.miniDramas,
          [id]: { ...existing, ...patch, updatedAt: Date.now() },
        },
      };
    });
  },

  deleteMiniDrama: (id) => {
    set((s) => {
      const next = { ...s.miniDramas };
      delete next[id];
      return { miniDramas: next };
    });
  },

  generateArc: async (dramaId) => {
    const { miniDramas, characters } = get();
    const drama = miniDramas[dramaId];
    if (!drama) return;
    const character = characters[drama.characterId];
    if (!character) return;

    get().updateMiniDrama(dramaId, { arcStatus: 'pending', arcError: undefined });

    const tonalLabel = TONAL_PRESETS[drama.tonalPreset]?.label ?? drama.tonalPreset;
    const systemPrompt = buildArcSystemPrompt({
      characterName: character.name,
      premise: drama.premise,
      tonalLabel,
    });

    try {
      const episodes = await generateArc(systemPrompt);
      get().updateMiniDrama(dramaId, {
        episodes,
        arcStatus: 'generated',
        arcError: undefined,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      get().updateMiniDrama(dramaId, { arcStatus: 'error', arcError: message });
    }
  },

  draftEpisode: async (dramaId, episodeNumber) => {
    const { miniDramas, characters } = get();
    const drama = miniDramas[dramaId];
    if (!drama) return;
    const character = characters[drama.characterId];
    if (!character) return;

    const episode = drama.episodes.find((e) => e.episodeNumber === episodeNumber);
    if (!episode) return;

    // Mark as drafting
    const updatedEpisodes = drama.episodes.map((e) =>
      e.episodeNumber === episodeNumber
        ? { ...e, status: 'drafting' as const, error: undefined }
        : e,
    );
    get().updateMiniDrama(dramaId, { episodes: updatedEpisodes });

    const tonalLabel = TONAL_PRESETS[drama.tonalPreset]?.label ?? drama.tonalPreset;
    const priorEpisodes = drama.episodes
      .filter((e) => e.episodeNumber < episodeNumber)
      .map((e) => `Episode ${String(e.episodeNumber)} — "${e.title}": ${e.summary}`)
      .join('\n');

    const systemPrompt = buildEpisodeDraftPrompt({
      characterName: character.name,
      availableLockedViews: buildAvailableLockedViews(character),
      premise: drama.premise,
      tonalLabel,
      priorEpisodes: priorEpisodes || 'None (this is the first episode)',
      thisEpisodeNumber: episode.episodeNumber,
      thisEpisodeTitle: episode.title,
      thisEpisodeSummary: episode.summary,
      visualStyleBlock: drama.visualStyleBlock,
    });

    try {
      const draftedPrompt = await draftEpisodeHelper(systemPrompt);
      const freshDrama = get().miniDramas[dramaId];
      if (!freshDrama) return;
      const finalEpisodes = freshDrama.episodes.map((e) =>
        e.episodeNumber === episodeNumber
          ? { ...e, status: 'drafted' as const, draftedPrompt, draftedAt: Date.now(), error: undefined }
          : e,
      );
      get().updateMiniDrama(dramaId, { episodes: finalEpisodes });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const freshDrama = get().miniDramas[dramaId];
      if (!freshDrama) return;
      const errorEpisodes = freshDrama.episodes.map((e) =>
        e.episodeNumber === episodeNumber
          ? { ...e, status: 'error' as const, error: message }
          : e,
      );
      get().updateMiniDrama(dramaId, { episodes: errorEpisodes });
    }
  },

  regenerateEpisode: async (dramaId, episodeNumber) => {
    await get().draftEpisode(dramaId, episodeNumber);
  },
}));

// Auto-save on state changes via subscription
useAppStore.subscribe((state) => {
  debouncedSave(state.nodes, state.edges, state.characters, state.miniDramas);
});
