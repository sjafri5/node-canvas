export type ViewId =
  | 'front'
  | 'threeQuarterLeft'
  | 'threeQuarterRight'
  | 'sideProfile'
  | 'lowAngle'
  | 'closeUp'
  | 'fullBody'
  | 'environment';

export const VIEW_IDS: readonly ViewId[] = [
  'front',
  'threeQuarterLeft',
  'threeQuarterRight',
  'sideProfile',
  'lowAngle',
  'closeUp',
  'fullBody',
  'environment',
] as const;

export const VIEW_LABELS: Record<ViewId, string> = {
  front: 'Front Portrait',
  threeQuarterLeft: '3/4 Left',
  threeQuarterRight: '3/4 Right',
  sideProfile: 'Side Profile',
  lowAngle: 'Low Angle',
  closeUp: 'Close-up',
  fullBody: 'Full Body',
  environment: 'In Environment',
};

export type CharacterViewStatus = 'pending' | 'ready' | 'locked' | 'error';

export interface CharacterView {
  viewId: ViewId;
  status: CharacterViewStatus;
  imageUrl?: string;
  error?: string;
  generatedAt?: number;
}

export interface Character {
  id: string;
  name: string;
  referenceImageUrl: string;
  views: Record<ViewId, CharacterView>;
  isComplete: boolean;
  createdAt: number;
  updatedAt: number;
}
