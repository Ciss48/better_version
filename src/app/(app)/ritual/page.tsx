import { PageContainer } from '@/components/app-shell/PageContainer';
import { t } from '@/lib/copy';

export default function RitualPage() {
  return (
    <PageContainer width="narrow">
      <p className="text-label font-semibold uppercase text-ink-3">{t('ritual.kicker')}</p>
      <h1 className="mt-3 text-display-md app:text-display-xl">{t('nav.ritual')}</h1>
    </PageContainer>
  );
}
