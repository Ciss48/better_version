// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HISTORY_DAY_LOG, HISTORY_SELECTED, historyTasks, TODAY } from '@/dev/fixtures';
import { t } from '@/lib/copy';
import { renderWithClock } from '@/test/render';
import { DayDetail } from '../DayDetail';

describe('DayDetail', () => {
  it('shows the "still running" line and the CTA for today', () => {
    renderWithClock(
      <DayDetail
        date={TODAY}
        tasks={historyTasks()}
        dayLog={null}
        planTiming={{ kind: 'evening', time: '21:10' }}
        mode="today"
        onOpenToday={vi.fn()}
      />,
    );
    expect(screen.getByText(t('history.today'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('history.todayCta') })).toBeInTheDocument();
  });

  it('explains a day without a plan', () => {
    renderWithClock(
      <DayDetail date="2026-09-30" tasks={[]} dayLog={null} planTiming={null} mode="past" />,
    );
    expect(screen.getByText(t('history.noPlan'))).toBeInTheDocument();
  });

  it('renders the reflection, or says it was skipped', () => {
    const { unmount } = renderWithClock(
      <DayDetail
        date={HISTORY_SELECTED}
        tasks={historyTasks()}
        dayLog={HISTORY_DAY_LOG}
        planTiming={{ kind: 'morning', time: '07:59' }}
        mode="past"
      />,
    );
    expect(screen.getByText(HISTORY_DAY_LOG.good)).toBeInTheDocument();
    unmount();

    renderWithClock(
      <DayDetail
        date={HISTORY_SELECTED}
        tasks={historyTasks()}
        dayLog={{ ...HISTORY_DAY_LOG, energy: 0, good: '', improve: '' }}
        planTiming={{ kind: 'morning', time: '07:59' }}
        mode="past"
      />,
    );
    expect(screen.getByText(t('history.noReflection'))).toBeInTheDocument();
  });
});
