// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { TODAY } from '@/dev/fixtures';
import { t } from '@/lib/copy';
import { formatDateLong, formatWeekdayDayMonth } from '@/lib/format';
import { RitualPlayground } from '../RitualPlayground';

/**
 * End-to-end smoke test of the ritual loop: decide everything, reflect,
 * close the day. It brings its own ClockProvider, so plain `render` is right.
 */
describe('RitualPlayground', () => {
  it('runs steps 1 → 3 and shows the summary', async () => {
    const user = userEvent.setup();
    render(<RitualPlayground />);

    // Step 1: move every undecided task to tomorrow.
    let pending = screen.getAllByRole('radio', { name: t('datePicker.chips.tomorrow') });
    expect(pending.length).toBeGreaterThan(0);
    while (pending.length > 0) {
      await user.click(pending[0]);
      pending = screen
        .getAllByRole('radio', { name: t('datePicker.chips.tomorrow') })
        .filter((chip) => chip.getAttribute('aria-checked') === 'false');
    }
    expect(screen.getByText(t('ritual.step1.allHandled'))).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: t('ritual.step1.cta') }));

    // Step 2: leave the reflection empty and skip ahead.
    expect(screen.getByText(t('ritual.step2.title'))).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: t('ritual.step2.ctaEmpty') }));

    // Step 3: close the day.
    expect(
      screen.getByText(t('ritual.step3.title', { tomorrow: formatDateLong('2026-10-04') })),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: t('ritual.step3.cta') }));

    expect(
      screen.getByText(t('ritual.summary.kicker', { date: formatWeekdayDayMonth(TODAY) })),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('ritual.summary.cta') })).toBeInTheDocument();
  });
});
