import { describe, expect, it } from 'vitest';

import { DomainError } from '../errors';

describe('DomainError', () => {
  it('carries the code and defaults the message to it', () => {
    const e = new DomainError('empty_title');
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe('empty_title');
    expect(e.message).toBe('empty_title');
    expect(e.name).toBe('DomainError');
  });

  it('keeps an explicit message', () => {
    expect(new DomainError('not_tickable', 'nope').message).toBe('nope');
  });
});
