import { Suspense } from 'react';
import { LoginScreen } from '@/features/auth/LoginScreen';

/** `LoginScreen` reads `?next=` and `?error=`, so it needs a Suspense boundary. */
export default function LoginPage() {
  return (
    <Suspense>
      <LoginScreen />
    </Suspense>
  );
}
