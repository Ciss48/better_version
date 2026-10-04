// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Reflection } from '@/domain';
import { tRaw } from '@/lib/copy';
import { renderWithClock } from '@/test/render';
import { ReflectionForm } from '../ReflectionForm';

const LEVELS = tRaw<string[]>('ritual.step2.energyLevels');
const EMPTY: Reflection = { energy: 0, good: '', improve: '' };

describe('ReflectionForm', () => {
  it('picks an energy level', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithClock(<ReflectionForm value={EMPTY} onChange={onChange} />);

    await user.click(screen.getByRole('radio', { name: LEVELS[3] }));
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY, energy: 4 });
  });

  it('clears the level when the selected circle is clicked again', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithClock(<ReflectionForm value={{ ...EMPTY, energy: 4 }} onChange={onChange} />);

    await user.click(screen.getByRole('radio', { name: LEVELS[3] }));
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY, energy: 0 });
  });
});
