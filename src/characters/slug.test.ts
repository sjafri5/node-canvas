import { describe, it, expect } from 'vitest';
import { slugify } from './slug';

describe('slugify', () => {
  it('converts a simple name to a lowercase slug with suffix', () => {
    const result = slugify('John Doe');
    expect(result).toMatch(/^john-doe-[a-z0-9]{4}$/);
  });

  it('strips special characters', () => {
    const result = slugify("O'Brien & Co.");
    expect(result).toMatch(/^o-brien-co-[a-z0-9]{4}$/);
  });

  it('collapses multiple separators', () => {
    const result = slugify('  hello   world  ');
    expect(result).toMatch(/^hello-world-[a-z0-9]{4}$/);
  });

  it('handles names with only special characters', () => {
    const result = slugify('!!!@@@');
    expect(result).toMatch(/^character-[a-z0-9]{4}$/);
  });

  it('handles empty string', () => {
    const result = slugify('');
    expect(result).toMatch(/^character-[a-z0-9]{4}$/);
  });

  it('handles whitespace-only string', () => {
    const result = slugify('   ');
    expect(result).toMatch(/^character-[a-z0-9]{4}$/);
  });

  it('produces different suffixes for the same name (collision avoidance)', () => {
    const a = slugify('Same Name');
    const b = slugify('Same Name');
    // Extremely unlikely to collide with 4 random chars
    expect(a).not.toBe(b);
    expect(a.replace(/-[a-z0-9]{4}$/, '')).toBe(b.replace(/-[a-z0-9]{4}$/, ''));
  });

  it('handles unicode by stripping non-ascii', () => {
    const result = slugify('Café Résumé');
    expect(result).toMatch(/^caf-r-sum-[a-z0-9]{4}$/);
  });

  it('handles numbers in name', () => {
    const result = slugify('Agent 47');
    expect(result).toMatch(/^agent-47-[a-z0-9]{4}$/);
  });
});
