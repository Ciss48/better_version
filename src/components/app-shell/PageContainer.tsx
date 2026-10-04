import { cn } from '@/lib/utils';

export type PageWidth = 'narrow' | 'wide' | 'onboarding';

export interface PageContainerProps {
  /** narrow = Today/Ritual (760px) · wide = Stats/History/Settings/Phase 2 (1080px) */
  width?: PageWidth;
  className?: string;
  children: React.ReactNode;
}

const MAX_WIDTH: Record<PageWidth, string> = {
  narrow: 'max-w-[760px]',
  wide: 'max-w-[1080px]',
  onboarding: 'max-w-[640px]',
};

/** Centres page content and applies the padding from design/screens.md. */
export function PageContainer({ width = 'wide', className, children }: PageContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 pb-6 pt-5 app:px-11 app:pb-16 app:pt-11',
        MAX_WIDTH[width],
        className,
      )}
    >
      {children}
    </div>
  );
}
