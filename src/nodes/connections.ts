/**
 * Valid connection rules. Consumed by Canvas.tsx isValidConnection and
 * template subgraph builders. Each tuple is [sourceType.handle, targetType.handle].
 */
export const VALID_CONNECTIONS: [string, string][] = [
  // Text flow
  ['textPrompt.text', 'imageGeneration.prompt'],

  // Image generation → display
  ['imageGeneration.image', 'imageDisplay.image'],

  // Reference image → img2img / img2video
  ['referenceImage.image', 'imageToImage.image'],
  ['referenceImage.image', 'imageToVideo.image'],
  ['referenceImage.image', 'imageDisplay.image'],

  // img2img chaining and output
  ['imageToImage.output', 'imageToImage.image'],
  ['imageToImage.output', 'imageToVideo.image'],
  ['imageToImage.output', 'imageDisplay.image'],

  // Image generation → img2img / img2video
  ['imageGeneration.image', 'imageToImage.image'],
  ['imageGeneration.image', 'imageToVideo.image'],

  // Video → display
  ['imageToVideo.video', 'videoDisplay.video'],
];
