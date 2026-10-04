// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Banner } from '../Banner';

describe('Banner', () => {
  it('is a status region', () => {
    render(<Banner variant="missedDay" title="Lỡ một ngày không sao." body="Hôm qua…" />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Lỡ một ngày không sao.');
    expect(status).toHaveTextContent('Hôm qua…');
  });

  it('wires both actions and the keyboard hint', async () => {
    const user = userEvent.setup();
    const onPrimary = vi.fn();
    const onSecondary = vi.fn();
    render(
      <Banner
        variant="ritual"
        title="Ngày sắp khép lại"
        primary={{ label: 'Bắt đầu nghi thức tối', onClick: onPrimary, kbd: 'E' }}
        secondary={{ label: 'Để sau', onClick: onSecondary }}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Bắt đầu nghi thức tối/ }));
    await user.click(screen.getByRole('button', { name: 'Để sau' }));

    expect(onPrimary).toHaveBeenCalledTimes(1);
    expect(onSecondary).toHaveBeenCalledTimes(1);
    expect(screen.getByText('E')).toBeInTheDocument();
  });

  it('renders the welcome children', () => {
    render(
      <Banner variant="welcome" title="Chào bạn">
        <p>Viết plan</p>
      </Banner>,
    );
    expect(screen.getByText('Viết plan')).toBeInTheDocument();
  });
});
