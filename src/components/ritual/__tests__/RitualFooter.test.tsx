// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { t } from '@/lib/copy';
import { renderWithClock } from '@/test/render';
import { RitualFooter } from '../RitualFooter';

describe('RitualFooter', () => {
  it('routes a blocked click to onBlockedClick instead of onNext', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    const onBlockedClick = vi.fn();

    renderWithClock(
      <RitualFooter
        status={{ remaining: 2 }}
        primaryLabel={t('ritual.step1.cta')}
        disabled
        onNext={onNext}
        onBlockedClick={onBlockedClick}
      />,
    );

    const button = screen.getByRole('button', { name: t('ritual.step1.cta') });
    expect(button).toHaveAttribute('aria-disabled', 'true');

    await user.click(button);
    expect(onBlockedClick).toHaveBeenCalledTimes(1);
    expect(onNext).not.toHaveBeenCalled();
  });

  it('shows the remaining count, then the all-handled line', () => {
    const { unmount } = renderWithClock(
      <RitualFooter
        status={{ remaining: 2 }}
        primaryLabel={t('ritual.step1.cta')}
        onNext={vi.fn()}
      />,
    );
    expect(screen.getByText(t('ritual.step1.remaining', { n: 2 }))).toBeInTheDocument();
    unmount();

    renderWithClock(
      <RitualFooter
        status={{ remaining: 0 }}
        primaryLabel={t('ritual.step1.cta')}
        onNext={vi.fn()}
      />,
    );
    expect(screen.getByText(t('ritual.step1.allHandled'))).toBeInTheDocument();
  });
});
