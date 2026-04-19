import type { TonalPreset } from './types';

export const TONAL_PRESETS: Record<TonalPreset, { label: string; block: string }> = {
  vintageField: {
    label: 'Vintage field',
    block: 'Shot on expired Kodak Gold 200, mid-1990s. Flat single-source lighting — bare bulb or overhead fluorescent, no dramatic shadows. Visible analogue film grain, medium-coarse. Warm yellow-green colour cast, desaturated palette — yellowed whites, olive-tinted greens, amber skin tones. Faded colours as if the footage has been sitting in a drawer for ten years. No post-processing look. Surveillance or field documentation aesthetic. Contact sheet energy — real, not staged.',
  },
  noir: {
    label: 'Noir',
    block: 'Hard side lighting from a single practical source, chiaroscuro with crushed blacks and blown highlights. 16mm film grain, medium-heavy. Desaturated blue-green shadow palette with warm amber key lights. Volumetric atmosphere — cigarette smoke, haze, wet streets. 1940s detective aesthetic, moral ambiguity in the shadows.',
  },
  documentary: {
    label: 'Documentary',
    block: 'Natural overcast daylight or available light only. Handheld camera, subtle ambient jitter, no stabilization. 16mm film grain, medium. Slightly desaturated natural color palette — muted skin tones, accurate whites. National Geographic field documentation aesthetic. Observational, not staged.',
  },
  goldenWarm: {
    label: 'Golden warm',
    block: 'Golden hour natural sunlight, low-angle warm key light with long shadows. 35mm film tone, fine grain. Warm amber colour cast, rich skin tones, subtle lens flare. Soft diffusion in highlights. Saturated but not pushed. Nostalgic, emotional warmth — Terrence Malick energy.',
  },
  cleanCommercial: {
    label: 'Clean commercial',
    block: 'Soft key light from 45 degrees with negative fill. Teal and orange color grade, high clarity. Anamorphic lens flares, subtle lens breathing. Shallow depth of field. Polished, intentional, commercial polish — high-end automotive or fashion spot aesthetic.',
  },
};

export const TONAL_PRESET_OPTIONS: { value: TonalPreset; label: string }[] = [
  { value: 'vintageField', label: 'Vintage field' },
  { value: 'noir', label: 'Noir' },
  { value: 'documentary', label: 'Documentary' },
  { value: 'goldenWarm', label: 'Golden warm' },
  { value: 'cleanCommercial', label: 'Clean commercial' },
];
