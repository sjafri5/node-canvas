export type TonalPreset =
  | 'vintageField'
  | 'noir'
  | 'documentary'
  | 'goldenWarm'
  | 'cleanCommercial';

export interface Episode {
  episodeNumber: number;
  title: string;
  summary: string;
  draftedPrompt?: string;
  status: 'undrafted' | 'drafting' | 'drafted' | 'error';
  error?: string;
  draftedAt?: number;
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
