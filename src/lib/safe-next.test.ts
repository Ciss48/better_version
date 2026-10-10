import { describe, expect, it } from 'vitest';
import { safeNext } from './safe-next';

describe('safeNext', () => {
  it('passes through an ordinary relative path', () => {
    expect(safeNext('/ritual')).toBe('/ritual');
    expect(safeNext('/history?month=2026-10')).toBe('/history?month=2026-10');
  });

  it('falls back to /today for a missing or empty value', () => {
    expect(safeNext(null)).toBe('/today');
    expect(safeNext(undefined)).toBe('/today');
    expect(safeNext('')).toBe('/today');
  });

  it('rejects an absolute URL', () => {
    expect(safeNext('https://evil.com/phish')).toBe('/today');
    expect(safeNext('http://evil.com')).toBe('/today');
  });

  it('rejects a protocol-relative URL', () => {
    expect(safeNext('//evil.com')).toBe('/today');
  });

  it('rejects the backslash variant of a protocol-relative URL', () => {
    expect(safeNext('/\\evil.com')).toBe('/today');
  });

  it('rejects a path with no leading slash', () => {
    expect(safeNext('today')).toBe('/today');
  });

  it('accepts the bare root path', () => {
    expect(safeNext('/')).toBe('/');
  });
});
