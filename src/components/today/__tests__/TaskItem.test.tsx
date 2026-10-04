// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TASK_STATES, TODAY } from '@/dev/fixtures';
import type { Task } from '@/domain';
import { TaskItem } from '../TaskItem';

function renderItem(task: Task, overrides: { expanded?: boolean; onToggleDone?: () => void } = {}) {
  const onToggleDone = overrides.onToggleDone ?? vi.fn();
  const { unmount } = render(
    <TaskItem
      task={task}
      today={TODAY}
      expanded={overrides.expanded ?? false}
      onToggleExpand={vi.fn()}
      onToggleDone={onToggleDone}
      onPatch={vi.fn()}
      onMove={vi.fn()}
      onDrop={vi.fn()}
      onRestore={vi.fn()}
    />,
  );
  return { onToggleDone, unmount };
}

describe('TaskItem', () => {
  it('exposes the tick as a checkbox whose aria-checked follows the status', () => {
    const { unmount } = renderItem(TASK_STATES.todo);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'false');
    unmount();

    renderItem(TASK_STATES.done);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
  });

  it('does not tick a moved task', async () => {
    const user = userEvent.setup();
    const { onToggleDone } = renderItem(TASK_STATES.moved);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();
    await user.click(checkbox);
    expect(onToggleDone).not.toHaveBeenCalled();
  });

  it('renders a toolbar when expanded', () => {
    renderItem(TASK_STATES.todo, { expanded: true });
    const toolbar = screen.getByRole('toolbar');
    expect(toolbar).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dời sang mai' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bỏ' })).toBeInTheDocument();
  });

  it('offers only Khôi phục for moved and dropped tasks', () => {
    for (const task of [TASK_STATES.moved, TASK_STATES.dropped]) {
      const { unmount } = renderItem(task, { expanded: true });
      const toolbar = screen.getByRole('toolbar');
      const labels = [...toolbar.querySelectorAll('button')].map((b) => b.textContent);
      expect(labels).toEqual(['Khôi phục']);
      unmount();
    }
  });

  it('shows the warning copy at three postponements', () => {
    renderItem(TASK_STATES.postponed3);
    expect(screen.getByText('Dời 3 lần · chia nhỏ hoặc cân nhắc bỏ?')).toBeInTheDocument();
    expect(screen.queryByText('đã dời 3 lần')).not.toBeInTheDocument();
  });

  it('shows the plain postponed count below three', () => {
    renderItem(TASK_STATES.postponed1);
    expect(screen.getByText('đã dời 1 lần')).toBeInTheDocument();
  });

  it('shows the move target and the adhoc time', () => {
    const { unmount } = renderItem(TASK_STATES.moved);
    expect(screen.getByText('Đã dời → T4 14/10')).toBeInTheDocument();
    unmount();

    renderItem(TASK_STATES.adhoc);
    expect(screen.getByText('thêm lúc 14:10')).toBeInTheDocument();
  });
});
