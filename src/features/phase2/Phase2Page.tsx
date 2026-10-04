import { PageContainer } from '@/components/app-shell/PageContainer';
import { Phase2Notice } from '@/components/common/Phase2Notice';

/**
 * The frame both Phase 2 previews sit in. They read nothing and change nothing,
 * so they are plain server components — and they mark themselves ready at once,
 * because there is no store to wait for.
 */
export function Phase2Page({
  kicker,
  title,
  body,
  children,
}: {
  kicker: string;
  title: React.ReactNode;
  /** The lead paragraph under the title, where a screen has one. */
  body?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <PageContainer>
      <div data-ready="true" className="flex max-w-[860px] flex-col gap-6">
        <Phase2Notice />
        <div className="flex flex-col gap-[22px]">
          <header className="flex flex-col gap-2.5">
            <p className="text-label font-semibold uppercase tracking-[0.08em] text-ink-3">
              {kicker}
            </p>
            <h1 className="font-display text-display-md app:text-display-xl">{title}</h1>
            {body === undefined ? null : (
              <p className="max-w-[560px] text-pretty text-ink-2">{body}</p>
            )}
          </header>
          {children}
        </div>
      </div>
    </PageContainer>
  );
}
