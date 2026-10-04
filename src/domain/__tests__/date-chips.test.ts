import { describe, expect, it } from 'vitest';

import { dateChipOptions } from '../date-chips';

describe('dateChipOptions', () => {
  it('hides plusWeek on a Saturday because the weekend chip already covers it', () => {
    expect(dateChipOptions('2026-10-03')).toEqual([
      { key: 'tomorrow', date: '2026-10-04' },
      { key: 'nextMonday', date: '2026-10-05' },
      { key: 'weekend', date: '2026-10-10' },
    ]);
  });

  it('hides the weekend chip on a Friday because tomorrow is already Saturday', () => {
    expect(dateChipOptions('2026-10-02')).toEqual([
      { key: 'tomorrow', date: '2026-10-03' },
      { key: 'nextMonday', date: '2026-10-05' },
      { key: 'plusWeek', date: '2026-10-09' },
    ]);
  });

  it('hides nextMonday on a Sunday because tomorrow is already Monday', () => {
    expect(dateChipOptions('2026-10-04')).toEqual([
      { key: 'tomorrow', date: '2026-10-05' },
      { key: 'weekend', date: '2026-10-10' },
      { key: 'plusWeek', date: '2026-10-11' },
    ]);
  });

  it('hides plusWeek on a Monday because nextMonday is already a week away', () => {
    expect(dateChipOptions('2026-10-05')).toEqual([
      { key: 'tomorrow', date: '2026-10-06' },
      { key: 'nextMonday', date: '2026-10-12' },
      { key: 'weekend', date: '2026-10-10' },
    ]);
  });

  it('keeps all four chips on a Tuesday', () => {
    expect(dateChipOptions('2026-10-06')).toEqual([
      { key: 'tomorrow', date: '2026-10-07' },
      { key: 'nextMonday', date: '2026-10-12' },
      { key: 'weekend', date: '2026-10-10' },
      { key: 'plusWeek', date: '2026-10-13' },
    ]);
  });
});
