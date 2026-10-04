import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { ClockBridge } from '@/state/ClockBridge';
import { StoreBootstrap } from '@/state/StoreBootstrap';

/** Lives outside the (app) group: no sidebar, no bottom tabs. */
export default function OnboardingPage() {
  return (
    <StoreBootstrap>
      <ClockBridge>
        <OnboardingScreen />
      </ClockBridge>
    </StoreBootstrap>
  );
}
