import { AppShellLive } from '@/features/app-shell/AppShellLive';
import { ClockBridge } from '@/state/ClockBridge';
import { StoreBootstrap } from '@/state/StoreBootstrap';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreBootstrap>
      <ClockBridge>
        <AppShellLive>{children}</AppShellLive>
      </ClockBridge>
    </StoreBootstrap>
  );
}
