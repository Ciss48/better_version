// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginScreen } from '../LoginScreen';

const signInWithOtp = vi.fn();
vi.mock('@/data/supabase/client', () => ({
  createBrowserSupabase: () => ({ auth: { signInWithOtp } }),
}));

let searchParams: Record<string, string> = {};
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (key: string) => searchParams[key] ?? null }),
}));

async function submit(email: string): Promise<void> {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Email'), email);
  await user.click(screen.getByRole('button', { name: 'Gửi link đăng nhập' }));
}

describe('LoginScreen', () => {
  beforeEach(() => {
    signInWithOtp.mockReset();
    searchParams = {};
  });

  it('calls signInWithOtp with an /auth/callback redirect carrying ?next=', async () => {
    signInWithOtp.mockResolvedValue({ error: null });
    searchParams = { next: '/ritual' };
    render(<LoginScreen />);

    await submit('vu@example.com');

    await waitFor(() => {
      expect(signInWithOtp).toHaveBeenCalledWith({
        email: 'vu@example.com',
        options: { emailRedirectTo: expect.stringContaining('/auth/callback?next=%2Fritual') },
      });
    });
  });

  it('moves to the sent state and shows the address that was sent to', async () => {
    signInWithOtp.mockResolvedValue({ error: null });
    render(<LoginScreen />);

    await submit('vu@example.com');

    expect(await screen.findByText(/vu@example\.com/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
  });

  it('shows the house copy for an invalid email, without calling signInWithOtp', async () => {
    render(<LoginScreen />);

    await submit('not-an-email');

    expect(await screen.findByRole('alert')).toHaveTextContent('chưa đúng định dạng');
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it('shows the rate-limit copy when Supabase refuses the request', async () => {
    signInWithOtp.mockResolvedValue({ error: { status: 429 } });
    render(<LoginScreen />);

    await submit('vu@example.com');

    expect(await screen.findByRole('alert')).toHaveTextContent('vừa được gửi gần đây');
  });

  it('shows the broken-link copy when the page loads with ?error=link', () => {
    searchParams = { error: 'link' };
    render(<LoginScreen />);

    expect(screen.getByRole('alert')).toHaveTextContent('không dùng được nữa');
  });
});
