import { describe, expect, it } from 'vitest';

import { parseQuickAdd } from '../quick-add';

describe('parseQuickAdd', () => {
  it('reads a trailing MIT flag and size', () => {
    expect(parseQuickAdd('Học Databricks * ~L')).toEqual({
      title: 'Học Databricks',
      mit: true,
      important: false,
      urgent: false,
      size: 'L',
    });
  });

  it('reads combined important + urgent flags in one word', () => {
    expect(parseQuickAdd('Gửi báo cáo !^')).toEqual({
      title: 'Gửi báo cáo',
      mit: false,
      important: true,
      urgent: true,
      size: null,
    });
  });

  it('leaves symbols inside other words as text', () => {
    expect(parseQuickAdd('C++ basics')).toEqual({
      title: 'C++ basics',
      mit: false,
      important: false,
      urgent: false,
      size: null,
    });
    expect(parseQuickAdd('hi!')).toEqual({
      title: 'hi!',
      mit: false,
      important: false,
      urgent: false,
      size: null,
    });
  });

  it('accepts markers before the title and a lowercase size', () => {
    expect(parseQuickAdd('* ! ^ ~m Chạy bộ')).toEqual({
      title: 'Chạy bộ',
      mit: true,
      important: true,
      urgent: true,
      size: 'M',
    });
  });

  it('lets the last size win', () => {
    expect(parseQuickAdd('~S ~L test')?.size).toBe('L');
  });

  it('returns null when only markers are given', () => {
    expect(parseQuickAdd('   *  ')).toBeNull();
    expect(parseQuickAdd('')).toBeNull();
    expect(parseQuickAdd('~l')).toBeNull();
  });

  it('collapses runs of whitespace in the title', () => {
    expect(parseQuickAdd('a   b')?.title).toBe('a b');
    expect(parseQuickAdd('\ta\nb ')?.title).toBe('a b');
  });

  it('treats a repeated marker word as a single flag', () => {
    expect(parseQuickAdd('**!! x')).toEqual({
      title: 'x',
      mit: true,
      important: true,
      urgent: false,
      size: null,
    });
  });

  it('does not treat ~xl or ~ as a size marker', () => {
    expect(parseQuickAdd('~xl report')?.title).toBe('~xl report');
    expect(parseQuickAdd('~ report')?.size).toBeNull();
  });
});
