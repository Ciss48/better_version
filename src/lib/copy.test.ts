import { describe, expect, it, vi } from 'vitest';
import { type CopyKey, t, tRaw } from './copy';

describe('t()', () => {
  it('returns a plain string', () => {
    expect(t('app.name')).toBe('Better Every Day');
  });

  it('substitutes a placeholder', () => {
    expect(t('today.planStatus.open', { lockAt: '10:00' })).toBe('Đang mở · khóa lúc 10:00');
  });

  it('substitutes several placeholders and stringifies numbers', () => {
    expect(t('today.progress.count', { done: 3, total: 5 })).toBe('3/5 việc đã định');
  });

  it('leaves a placeholder untouched when no var matches', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(t('today.planStatus.open', {})).toBe('Đang mở · khóa lúc {lockAt}');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('throws on an unknown key outside production', () => {
    expect(() => t('today.nope' as CopyKey)).toThrow(/today\.nope/);
  });

  it('throws when the key points at an object rather than a string', () => {
    expect(() => t('today.planStatus' as CopyKey)).toThrow(/today\.planStatus/);
  });
});

describe('tRaw()', () => {
  it('returns arrays', () => {
    expect(tRaw<string[]>('date.weekdayShort')[1]).toBe('T2');
  });

  it('returns objects', () => {
    expect(tRaw<{ name: string }>('app').name).toBe('Better Every Day');
  });
});
