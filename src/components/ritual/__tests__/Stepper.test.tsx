// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { tRaw } from '@/lib/copy';
import { renderWithClock } from '@/test/render';
import { Stepper } from '../Stepper';

const STEPS = tRaw<string[]>('ritual.steps');

describe('Stepper', () => {
  it('marks the current step with aria-current', () => {
    renderWithClock(<Stepper steps={STEPS} current={1} onStepClick={vi.fn()} />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).not.toHaveAttribute('aria-current');
    expect(items[1]).toHaveAttribute('aria-current', 'step');
    expect(items[2]).not.toHaveAttribute('aria-current');
  });

  it('goes back to an earlier step but never forward', async () => {
    const user = userEvent.setup();
    const onStepClick = vi.fn();
    renderWithClock(<Stepper steps={STEPS} current={1} onStepClick={onStepClick} />);

    await user.click(screen.getByRole('button', { name: `1${STEPS[0]}` }));
    expect(onStepClick).toHaveBeenCalledWith(0);

    onStepClick.mockClear();
    await user.click(screen.getByRole('button', { name: `3${STEPS[2]}` }));
    expect(onStepClick).not.toHaveBeenCalled();
  });
});
