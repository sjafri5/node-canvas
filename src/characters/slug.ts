/**
 * Produce a URL-safe slug from a character name.
 * Appends a short random suffix to avoid collisions.
 */
export function slugify(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const safeName = base || 'character';
  const suffix = Math.random().toString(36).slice(2, 6);

  return `${safeName}-${suffix}`;
}
