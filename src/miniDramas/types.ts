export type TonalPreset =
  | 'vintageField'
  | 'noir'
  | 'documentary'
  | 'goldenWarm'
  | 'cleanCommercial';

export interface EpisodeAlternative {
  id: string;
  prompt: string;
  generatedAt: number;
}

export interface Episode {
  episodeNumber: number;
  title: string;
  summary: string;
  alternatives: EpisodeAlternative[];
  activeAlternativeId?: string;
  status: 'undrafted' | 'drafting' | 'drafted' | 'generatingAlternatives' | 'error';
  error?: string;
  draftedAt?: number;
  /** @deprecated Use alternatives[activeAlternativeId].prompt instead */
  draftedPrompt?: string;
}

export interface MiniDrama {
  id: string;
  characterId: string;
  premise: string;
  tonalPreset: TonalPreset;
  visualStyleBlock: string;
  episodes: Episode[];
  arcStatus: 'pending' | 'generated' | 'error';
  arcError?: string;
  createdAt: number;
  updatedAt: number;
}
