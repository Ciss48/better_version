// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TOMORROW_ITEMS } from '@/dev/fixtures';
import { t } from '@/lib/copy';
import { renderWithClock } from '@/test/render';
import { TomorrowPlanList } from '../TomorrowPlanList';

describe('TomorrowPlanList', () => {
  it('offers the X only on removable items', () => {
    renderWithClock(
      <TomorrowPlanList
        items={TOMORROW_ITEMS}
        onToggleMit={vi.fn()}
        onRemove={vi.fn()}
        onAdd={vi.fn()}
      />,
    );
    const removable = TOMORROW_ITEMS.filter((item) => item.removable);
    expect(screen.getAllByRole('button', { name: t('common.remove') })).toHaveLength(
      removable.length,
    );
  });

  it('offers quick add without the syntax legend', () => {
    renderWithClock(
      <TomorrowPlanList
        items={TOMORROW_ITEMS}
        onToggleMit={vi.fn()}
        onRemove={vi.fn()}
        onAdd={vi.fn()}
      />,
    );
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.queryByText(t('today.input.syntax.important'))).not.toBeInTheDocument();
  });

  it('reports a star toggle with the item id', async () => {
    const user = userEvent.setup();
    const onToggleMit = vi.fn();
    renderWithClock(
      <TomorrowPlanList
        items={TOMORROW_ITEMS}
        onToggleMit={onToggleMit}
        onRemove={vi.fn()}
        onAdd={vi.fn()}
      />,
    );

    const stars = screen.getAllByRole('button', { name: t('common.mit') });
    await user.click(stars[1]);
    expect(onToggleMit).toHaveBeenCalledWith(TOMORROW_ITEMS[1].id);
  });

  it('shows the MIT counter and the empty hint', () => {
    const { unmount } = renderWithClock(
      <TomorrowPlanList
        items={TOMORROW_ITEMS}
        onToggleMit={vi.fn()}
        onRemove={vi.fn()}
        onAdd={vi.fn()}
      />,
    );
    expect(screen.getByText(t('ritual.step3.mitCount', { n: 2 }))).toBeInTheDocument();
    unmount();

    renderWithClock(
      <TomorrowPlanList items={[]} onToggleMit={vi.fn()} onRemove={vi.fn()} onAdd={vi.fn()} />,
    );
    expect(screen.getByText(t('ritual.step3.empty'))).toBeInTheDocument();
  });
});
