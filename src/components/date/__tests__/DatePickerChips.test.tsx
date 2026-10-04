// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithClock } from '@/test/render';
import { DatePickerChips } from '../DatePickerChips';

describe('DatePickerChips', () => {
  it('renders the chips dateChipOptions returns, plus "Chọn ngày…" and "Bỏ"', () => {
    // A Saturday: "+1 tuần" collapses into "Cuối tuần", so only 3 date chips.
    renderWithClock(<DatePickerChips today="2026-10-03" onChange={vi.fn()} allowDrop />);
    expect(screen.getAllByRole('radio')).toHaveLength(5);
  });

  it('renders four date chips on a Tuesday', () => {
    renderWithClock(<DatePickerChips today="2026-10-06" onChange={vi.fn()} allowDrop />);
    expect(screen.getAllByRole('radio')).toHaveLength(6);
  });

  it('reports a move decision when a date chip is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithClock(<DatePickerChips today="2026-10-03" onChange={onChange} allowDrop />);

    await user.click(screen.getByRole('radio', { name: 'Mai' }));

    expect(onChange).toHaveBeenCalledWith({ kind: 'move', date: '2026-10-04' });
  });

  it('deselects when the selected chip is clicked again', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithClock(
      <DatePickerChips
        today="2026-10-03"
        value={{ kind: 'move', date: '2026-10-04' }}
        onChange={onChange}
        allowDrop
      />,
    );

    const tomorrow = screen.getByRole('radio', { name: 'Mai' });
    expect(tomorrow).toHaveAttribute('aria-checked', 'true');

    await user.click(tomorrow);
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('labels the dated chips with their day and month', () => {
    renderWithClock(<DatePickerChips today="2026-10-03" onChange={vi.fn()} />);
    expect(screen.getByRole('radio', { name: 'Thứ 2 tới · 5/10' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Cuối tuần · 10/10' })).toBeInTheDocument();
  });

  it('shows a custom date on the "Chọn ngày…" chip and marks it selected', () => {
    renderWithClock(
      <DatePickerChips
        today="2026-10-03"
        value={{ kind: 'move', date: '2026-10-14' }}
        onChange={vi.fn()}
      />,
    );
    const custom = screen.getByRole('radio', { name: 'T4 14/10' });
    expect(custom).toHaveAttribute('aria-checked', 'true');
  });

  it('omits the drop chip unless allowDrop is set', () => {
    renderWithClock(<DatePickerChips today="2026-10-03" onChange={vi.fn()} />);
    expect(screen.queryByRole('radio', { name: 'Bỏ' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(4);
  });
});
