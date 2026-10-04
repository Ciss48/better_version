// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TASK_STATES } from '@/dev/fixtures';
import { t } from '@/lib/copy';
import { renderWithClock } from '@/test/render';
import { ReviewRow } from '../ReviewRow';

const NUDGE = t('ritual.step1.nudge', { n: 3 });

describe('ReviewRow', () => {
  it('shows no date chips for a done task', () => {
    renderWithClock(
      <ReviewRow task={TASK_STATES.done} onToggleDone={vi.fn()} onDecide={vi.fn()} />,
    );
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('reports the tick, and the chips go once the task comes back as done', async () => {
    const user = userEvent.setup();
    const onToggleDone = vi.fn();
    const task = { ...TASK_STATES.todo, status: 'todo' as const };

    const { rerender } = renderWithClock(
      <ReviewRow
        task={task}
        decision={{ kind: 'move', date: '2026-10-04' }}
        onToggleDone={onToggleDone}
        onDecide={vi.fn()}
      />,
    );
    expect(screen.getByRole('radio', { name: t('datePicker.chips.tomorrow') })).toBeChecked();

    await user.click(screen.getByRole('checkbox'));
    expect(onToggleDone).toHaveBeenCalledTimes(1);

    // The screen clears the decision when a task is ticked.
    rerender(
      <ReviewRow
        task={{ ...task, status: 'done' }}
        onToggleDone={onToggleDone}
        onDecide={vi.fn()}
      />,
    );
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('nudges from the third postponement, unless the task is being dropped', () => {
    const { unmount } = renderWithClock(
      <ReviewRow task={TASK_STATES.postponed3} onToggleDone={vi.fn()} onDecide={vi.fn()} />,
    );
    expect(screen.getByText(NUDGE)).toBeInTheDocument();
    unmount();

    renderWithClock(
      <ReviewRow
        task={TASK_STATES.postponed3}
        decision={{ kind: 'drop' }}
        onToggleDone={vi.fn()}
        onDecide={vi.fn()}
      />,
    );
    expect(screen.queryByText(NUDGE)).not.toBeInTheDocument();
  });
});
