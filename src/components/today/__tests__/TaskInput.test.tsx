// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TaskInput } from '../TaskInput';

describe('TaskInput', () => {
  it('previews the quick-add syntax and adds the parsed task on Enter', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<TaskInput locked={false} onAdd={onAdd} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'Học * ~L');

    // Preview chips: MIT and the size. "MIT" also appears in the syntax hint row,
    // so the chips are matched on the accent-soft pill itself.
    expect(screen.getByText('Độ lớn L')).toBeInTheDocument();
    expect(screen.getAllByText('MIT')).toHaveLength(2);

    await user.keyboard('{Enter}');

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith({
      title: 'Học',
      mit: true,
      important: false,
      urgent: false,
      size: 'L',
    });
    expect(input).toHaveValue('');
  });

  it('ignores Enter on a blank field', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<TaskInput locked={false} onAdd={onAdd} />);

    const input = screen.getByRole('textbox');
    await user.type(input, '   ');
    await user.keyboard('{Enter}');

    expect(onAdd).not.toHaveBeenCalled();
    expect(input).toHaveValue('   ');
  });

  it('shows the locked hint only for the today scope', () => {
    const { unmount } = render(<TaskInput locked onAdd={vi.fn()} />);
    expect(screen.getByText('· việc mới sẽ vào Phát sinh')).toBeInTheDocument();
    unmount();

    render(<TaskInput locked onAdd={vi.fn()} scope="tomorrow" />);
    expect(screen.queryByText('· việc mới sẽ vào Phát sinh')).not.toBeInTheDocument();
  });
});
