import { describe, it, expect } from 'vitest';
import { sanitizeFtsInput, buildFtsQueryVariants, buildLikePattern } from '../../src/utils/fts-query.js';

describe('sanitizeFtsInput', () => {
  it('strips FTS5 special characters', () => {
    expect(sanitizeFtsInput('"hello" AND (world)')).toBe('hello AND world');
  });

  it('collapses whitespace', () => {
    expect(sanitizeFtsInput('  data   protection  ')).toBe('data protection');
  });
});

describe('buildFtsQueryVariants', () => {
  it('returns empty array for empty input', () => {
    expect(buildFtsQueryVariants('')).toEqual([]);
  });

  it('returns single-term variants: AND, prefix', () => {
    const variants = buildFtsQueryVariants('cybercrime');
    expect(variants).toContain('cybercrime');
    expect(variants).toContain('cybercrime*');
  });

  it('returns multi-term variants including OR fallback', () => {
    const variants = buildFtsQueryVariants('penalty offence');
    expect(variants).toContain('"penalty offence"');
    expect(variants).toContain('penalty AND offence');
    expect(variants.some(v => v.includes(' OR '))).toBe(true);
  });

  it('includes prefix AND variant for multi-term', () => {
    const variants = buildFtsQueryVariants('data protection');
    expect(variants).toContain('data AND protection*');
  });
});

describe('buildLikePattern', () => {
  it('creates LIKE pattern from query terms', () => {
    const pattern = buildLikePattern('penalty offence');
    expect(pattern).toBe('%penalty%offence%');
  });

  it('handles single term', () => {
    const pattern = buildLikePattern('cybercrime');
    expect(pattern).toBe('%cybercrime%');
  });
});
