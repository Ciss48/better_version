import { PageContainer } from '@/components/app-shell/PageContainer';
import { t } from '@/lib/copy';

/** Lives outside the (app) group: no sidebar, no bottom tabs. */
export default function OnboardingPage() {
  return (
    <div className="min-h-dvh bg-paper text-ink">
      <PageContainer width="onboarding">
        <p className="text-label font-semibold uppercase text-ink-3">{t('onboarding.stepLabel', { n: 1 })}</p>
        <h1 className="mt-3 text-display-md app:text-display-lg">{t('onboarding.step1.title')}</h1>
        <p className="mt-3 text-body text-ink-2">{t('onboarding.step1.body')}</p>
      </PageContainer>
    </div>
  );
}
