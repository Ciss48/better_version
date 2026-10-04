import { Suspense } from 'react';
import { TodayScreen } from '@/features/today/TodayScreen';

/**
 * `TodayScreen` reads `?focus=input` (onboarding hands the input the focus), so
 * it needs a Suspense boundary around `useSearchParams`.
 */
export default function TodayPage() {
  return (
    <Suspense>
      <TodayScreen />
    </Suspense>
  );
}
