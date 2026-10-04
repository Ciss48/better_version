// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProgressBar } from '../ProgressBar';

describe('ProgressBar', () => {
  it('is a progressbar carrying its value', () => {
    render(<ProgressBar value={64} done={2} total={4} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '64');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    // The count sits in the label and, split by a <br>, beside the bar.
    expect(bar).toHaveAccessibleName('2/4 việc đã định');
    expect(bar).toHaveTextContent('2/4 việc đã định');
  });

  it('clamps and rounds the value', () => {
    const { unmount } = render(<ProgressBar value={-12} done={0} total={3} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    unmount();

    render(<ProgressBar value={118.6} done={3} total={3} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });
});
