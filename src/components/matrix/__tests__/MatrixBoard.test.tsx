// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { MATRIX_TASKS } from '@/dev/fixtures';
import { MatrixBoard } from '../MatrixBoard';

describe('MatrixBoard (tap)', () => {
  it('opens the quadrant sheet from a chip and reports the chosen quadrant', async () => {
    const user = userEvent.setup();
    const onSetQuadrant = vi.fn();
    render(
      <MatrixBoard
        tasks={MATRIX_TASKS}
        interaction="tap"
        onSetQuadrant={onSetQuadrant}
        onToggleDone={vi.fn()}
      />,
    );

    // The q1 chip, clicked on its title rather than its checkbox.
    await user.click(screen.getByRole('button', { name: 'Hoàn thiện slide demo quý 4' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAccessibleName('Chuyển sang ô…');

    await user.click(screen.getByRole('button', { name: /Lên lịch/ }));

    expect(onSetQuadrant).toHaveBeenCalledWith('m1', 'q2');
  });

  it('ticks a chip without opening the sheet', async () => {
    const user = userEvent.setup();
    const onToggleDone = vi.fn();
    render(
      <MatrixBoard
        tasks={MATRIX_TASKS}
        interaction="tap"
        onSetQuadrant={vi.fn()}
        onToggleDone={onToggleDone}
      />,
    );

    await user.click(
      screen.getByRole('checkbox', { name: 'Hoàn thiện slide demo quý 4' }),
    );

    expect(onToggleDone).toHaveBeenCalledWith('m1');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps moved and dropped tasks off the board', () => {
    render(
      <MatrixBoard
        tasks={[
          ...MATRIX_TASKS,
          { ...MATRIX_TASKS[0], id: 'gone', title: 'Đã dời', status: 'moved' },
        ]}
        interaction="tap"
        onSetQuadrant={vi.fn()}
        onToggleDone={vi.fn()}
      />,
    );
    expect(screen.queryByText('Đã dời')).not.toBeInTheDocument();
  });
});
