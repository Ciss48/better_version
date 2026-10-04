// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FIRST_USE, statsDays, TODAY } from '@/dev/fixtures';
import { t } from '@/lib/copy';
import { formatDateLong } from '@/lib/format';
import { renderWithClock } from '@/test/render';
import { Heatmap } from '../Heatmap';

const DAYS = statsDays(13);

function renderMap() {
  return renderWithClock(
    <Heatmap days={DAYS} weeks={13} firstUseDate={FIRST_USE} onSelectDay={vi.fn()} />,
  );
}

describe('Heatmap', () => {
  it('renders no cell for any date after today', () => {
    renderMap();
    const labels = screen
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label') ?? '');

    // Today is a Saturday, so the final column still holds a Sunday.
    for (const date of ['2026-10-04', '2026-10-05', '2026-10-10']) {
      expect(labels.some((label) => label.includes(formatDateLong(date)))).toBe(false);
    }
    expect(labels.some((label) => label.includes(formatDateLong(TODAY)))).toBe(true);
  });

  it('labels a planned cell with the cellPlanned copy', () => {
    renderMap();
    const planned = DAYS.find((day) => day.hasPlan);
    expect(planned).toBeDefined();
    expect(
      screen.getByRole('button', {
        name: t('stats.heatmap.cellPlanned', {
          date: formatDateLong(planned!.date),
          pct: planned!.pct,
        }),
      }),
    ).toBeInTheDocument();
  });

  it('moves focus a week forward on ArrowRight', async () => {
    const user = userEvent.setup();
    renderMap();

    const from = DAYS[0].date;
    const start = screen.getByRole('button', {
      name: DAYS[0].hasPlan
        ? t('stats.heatmap.cellPlanned', { date: formatDateLong(from), pct: DAYS[0].pct })
        : t('stats.heatmap.cellNoPlan', { date: formatDateLong(from) }),
    });
    start.focus();
    await user.keyboard('{ArrowRight}');

    const next = DAYS[7];
    const expected = next.hasPlan
      ? t('stats.heatmap.cellPlanned', { date: formatDateLong(next.date), pct: next.pct })
      : t('stats.heatmap.cellNoPlan', { date: formatDateLong(next.date) });
    expect(document.activeElement).toHaveAttribute('aria-label', expected);
  });
});
