// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TODAY } from '@/dev/fixtures';
import { t } from '@/lib/copy';
import { renderWithClock } from '@/test/render';
import { RitualSummary } from '../RitualSummary';

function renderSummary(pct: number) {
  return renderWithClock(
    <RitualSummary
      date={TODAY}
      pct={pct}
      done={5}
      total={8}
      adhocDone={0}
      moved={2}
      dropped={1}
      energy={4}
      good=""
      tomorrow={{ items: [{ title: 'A', mit: false }, { title: 'B', mit: false }, { title: 'C', mit: false }] }}
      consistencyPlanned={26}
      onDone={vi.fn()}
    />,
  );
}

describe('RitualSummary', () => {
  it('picks the headline by percentage band', () => {
    const { unmount } = renderSummary(74);
    expect(screen.getByText(t('ritual.summary.headline.p50'))).toBeInTheDocument();
    unmount();

    renderSummary(75);
    expect(screen.getByText(t('ritual.summary.headline.p75'))).toBeInTheDocument();
  });
});
