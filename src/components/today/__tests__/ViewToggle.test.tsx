// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ViewToggle } from '../ViewToggle';

describe('ViewToggle', () => {
  it('switches on `m` when the focus is not in a field', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ViewToggle value="list" onChange={onChange} enableShortcut />);

    await user.keyboard('m');

    expect(onChange).toHaveBeenCalledWith('matrix');
  });

  it('ignores `m` typed into an input', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <>
        <input aria-label="field" />
        <ViewToggle value="list" onChange={onChange} enableShortcut />
      </>,
    );

    await user.click(screen.getByRole('textbox'));
    await user.keyboard('m');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not register the shortcut unless asked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ViewToggle value="list" onChange={onChange} />);

    await user.keyboard('m');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('reports the clicked segment', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ViewToggle value="list" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /Ma trận/ }));

    expect(onChange).toHaveBeenCalledWith('matrix');
  });
});
