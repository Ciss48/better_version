// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { t } from '@/lib/copy';
import { StatCard } from '../StatCard';

describe('StatCard', () => {
  it('shows an em dash and no delta when there is no value', () => {
    render(<StatCard label={t('stats.cards.avg7')} value={null} unit="%" delta={6} />);
    expect(screen.getByText(t('stats.cards.empty'))).toBeInTheDocument();
    expect(screen.queryByText(t('stats.cards.deltaUp', { n: 6 }))).not.toBeInTheDocument();
  });

  it('renders a negative delta neutrally, never in the success tone', () => {
    render(<StatCard label={t('stats.cards.avg30')} value={75} unit="%" delta={-4} />);
    const delta = screen.getByText(t('stats.cards.deltaDown', { n: 4 }));
    expect(delta.textContent).toContain('4');
    expect(delta.className).not.toContain('success');
  });

  it('renders the consistency ratio as n/30', () => {
    render(
      <StatCard label={t('stats.cards.consistency.label')} value={26} unit="ratio30" />,
    );
    expect(screen.getByText('26/30')).toBeInTheDocument();
  });
});
