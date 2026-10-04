import { describe, expect, it } from 'vitest';

import { makeEvent } from '../events';
import { ctx } from './helpers';

describe('makeEvent', () => {
  it('stamps the injected id and clock', () => {
    const c = ctx('2026-10-03T03:00:00Z');
    const event = makeEvent('task_created', 't1', '2026-10-03', { title: 'A' }, c);
    expect(event).toEqual({
      id: 'id1',
      type: 'task_created',
      taskId: 't1',
      planDate: '2026-10-03',
      occurredAt: '2026-10-03T03:00:00.000Z',
      payload: { title: 'A' },
    });
  });

  it('allows a null taskId for day_closed', () => {
    const event = makeEvent('day_closed', null, '2026-10-03', {}, ctx('2026-10-03T15:00:00Z'));
    expect(event.taskId).toBeNull();
    expect(event.type).toBe('day_closed');
  });
});
