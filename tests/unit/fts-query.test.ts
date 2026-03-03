import { describe, it, expect } from 'vitest';
import { sanitizeFtsInput, buildFtsQueryVariants, buildLikePattern, hasBooleanOperators } from '../../src/utils/fts-query.js';

describe('hasBooleanOperators', () => {
  it('detects OR', () => {
    expect(hasBooleanOperators('murder OR theft')).toBe(true);
  });

  it('detects NOT', () => {
    expect(hasBooleanOperators('murder NOT premeditated')).toBe(true);
  });

  it('detects AND', () => {
    expect(hasBooleanOperators('data AND protection')).toBe(true);
  });

  it('returns false for plain queries', () => {
    expect(hasBooleanOperators('data protection')).toBe(false);
  });

  it('does not match lowercase or/not/and', () => {
    expect(hasBooleanOperators('data or protection')).toBe(false);
  });
});

describe('sanitizeFtsInput', () => {
  it('strips FTS5 special characters for plain queries', () => {
    expect(sanitizeFtsInput('"hello" (world)')).toBe('hello world');
  });

  it('preserves boolean operators and quotes', () => {
    expect(sanitizeFtsInput('murder OR theft')).toBe('murder OR theft');
    expect(sanitizeFtsInput('"data protection" NOT repealed')).toBe('"data protection" NOT repealed');
  });

  it('collapses whitespace', () => {
    expect(sanitizeFtsInput('  data   protection  ')).toBe('data protection');
  });
});

describe('buildFtsQueryVariants', () => {
  it('returns empty array for empty input', () => {
    expect(buildFtsQueryVariants('')).toEqual([]);
  });

  it('returns single-term variants: exact, prefix', () => {
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

  it('passes boolean queries through as-is', () => {
    const variants = buildFtsQueryVariants('murder OR theft');
    expect(variants).toEqual(['murder OR theft']);
  });

  it('passes NOT queries through as-is', () => {
    const variants = buildFtsQueryVariants('murder NOT premeditated');
    expect(variants).toEqual(['murder NOT premeditated']);
  });

  it('includes stemmed variant for multi-term', () => {
    const variants = buildFtsQueryVariants('penalties offences');
    expect(variants.some(v => v.includes('penalt') && v.includes('*'))).toBe(true);
  });

  it('includes stemmed variant for single term', () => {
    const variants = buildFtsQueryVariants('controllers');
    expect(variants.some(v => v.includes('controll') && v.includes('*'))).toBe(true);
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
