'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { PageContainer } from '@/components/app-shell/PageContainer';
import { MORE_NAV } from '@/components/app-shell/nav-config';
import { t } from '@/lib/copy';

/** The mobile "More" list. At ≥720px every entry already sits in the sidebar. */
export default function MorePage() {
  const router = useRouter();

  useEffect(() => {
    const wide = window.matchMedia('(min-width: 45rem)');
    if (wide.matches) router.replace('/today');

    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) router.replace('/today');
    };
    wide.addEventListener('change', onChange);
    return () => wide.removeEventListener('change', onChange);
  }, [router]);

  return (
    <PageContainer>
      <h1 className="text-display-md">{t('more.title')}</h1>
      <div className="mt-4 flex flex-col gap-1.5">
        {MORE_NAV.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              className="flex min-h-[60px] items-center gap-3.5 rounded-[24px] bg-surface px-[18px] text-body-lg hover:bg-hover"
            >
              <Icon size={20} strokeWidth={2.75} aria-hidden />
              <span className="flex-1">{t(item.labelKey)}</span>
              {item.phase2 ? (
                <span className="rounded-pill bg-line-2 px-2.5 py-0.5 text-micro font-semibold text-ink-3">
                  {t('nav.tag.phase2')}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </PageContainer>
  );
}
