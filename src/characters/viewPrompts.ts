import type { ViewId } from './types';

export const VIEW_PROMPTS: Record<ViewId, string> = {
  front:
    'Same subject, eye-level front portrait, neutral expression, looking directly at camera, studio lighting, same character identity preserved.',
  threeQuarterLeft:
    'Same subject, 3/4 view facing slightly left, looking at camera, same character identity preserved, studio lighting.',
  threeQuarterRight:
    'Same subject, 3/4 view facing slightly right, looking at camera, same character identity preserved, studio lighting.',
  sideProfile:
    'Same subject, pure side profile facing left, looking forward, same character identity preserved, studio lighting.',
  lowAngle:
    'Same subject, dramatic low camera angle looking up, cinematic, same character identity preserved.',
  closeUp:
    'Same subject, expressive close-up, intense emotional look, tight framing on face, same character identity preserved.',
  fullBody:
    'Same subject, full body standing shot, head to toe, neutral pose, same character identity preserved.',
  environment:
    'Same subject in an environmental context, medium shot, background matches the scene tone of the original, same character identity preserved.',
};
