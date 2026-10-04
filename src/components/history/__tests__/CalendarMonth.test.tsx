// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { HISTORY_MONTH, HISTORY_SELECTED, historyDays } from '@/dev/fixtures';
import { t } from '@/lib/copy';
import { formatDateLong } from '@/lib/format';
import { renderWithClock } from '@/test/render';
import { CalendarMonth } from '../CalendarMonth';

const DAYS = historyDays();

function renderMonth(overrides: { canPrev?: boolean; onSelect?: () => void } = {}) {
  return renderWithClock(
    <CalendarMonth
      month={HISTORY_MONTH}
      days={DAYS}
      selected={HISTORY_SELECTED}
      onSelect={overrides.onSelect ?? vi.fn()}
      summary={{ planned: 2, total: 2, avg: 92 }}
      canPrev={overrides.canPrev ?? true}
      canNext={false}
      onPrev={vi.fn()}
      onNext={vi.fn()}
    />,
  );
}

describe('CalendarMonth', () => {
  it('disables the prev button at the first month', () => {
    renderMonth({ canPrev: false });
    expect(screen.getByRole('button', { name: t('datePicker.prevMonth') })).toBeDisabled();
  });

  it('reports the ISO date of a past day', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderMonth({ onSelect });

    const day = DAYS.find((entry) => entry.date === '2026-10-01');
    expect(day).toBeDefined();
    await user.click(
      screen.getByRole('button', {
        name: day!.hasPlan
          ? t('stats.heatmap.cellPlanned', { date: formatDateLong(day!.date), pct: day!.pct })
          : t('stats.heatmap.cellNoPlan', { date: formatDateLong(day!.date) }),
      }),
    );
    expect(onSelect).toHaveBeenCalledWith('2026-10-01');
  });

  it('falls back to the empty-month line', () => {
    renderWithClock(
      <CalendarMonth
        month="2026-11"
        days={[]}
        selected={HISTORY_SELECTED}
        onSelect={vi.fn()}
        summary={null}
        canPrev
        canNext={false}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />,
    );
    expect(screen.getByText(t('history.monthEmpty'))).toBeInTheDocument();
  });
});
