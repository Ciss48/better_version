'use client';

import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer';
import { cn } from '@/lib/utils';

/**
 * Bottom sheet, built on Base UI's own Drawer — swipe-down to dismiss, scrim
 * tap, Esc, focus trap and focus return are all handled by the primitive, so
 * neither vaul nor a hand-rolled sheet is needed.
 * Motion follows design/handoff/motion.md §3.
 */
function Drawer(props: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return <DrawerPrimitive.Root {...props} />;
}

function DrawerTrigger(props: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerClose(props: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerTitle({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      className={cn('font-display text-display-xs text-ink', className)}
      {...props}
    />
  );
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      className={cn('text-[13.5px] text-ink-3', className)}
      {...props}
    />
  );
}

/** The 40x5 grab handle from design/handoff/components.md. */
function DrawerHandle() {
  return (
    <div className="flex justify-center">
      <span className="h-[5px] w-10 rounded-pill bg-line" aria-hidden />
    </div>
  );
}

function DrawerContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Popup>) {
  return (
    <DrawerPrimitive.Portal>
      <DrawerPrimitive.Backdrop
        className={cn(
          'fixed inset-0 z-50 min-h-dvh bg-scrim',
          'opacity-[calc(1-var(--drawer-swipe-progress))] transition-opacity duration-[250ms] ease-out',
          'data-swiping:duration-0 data-starting-style:opacity-0 data-ending-style:opacity-0',
          'data-ending-style:duration-[200ms]',
        )}
      />
      <DrawerPrimitive.Viewport className="fixed inset-0 z-50 flex items-end justify-center">
        <DrawerPrimitive.Popup
          data-slot="drawer-content"
          className={cn(
            'flex w-full max-h-[86dvh] flex-col gap-3.5 overflow-y-auto overscroll-contain',
            'rounded-t-panel bg-paper px-4 pb-6 pt-3 text-ink shadow-lg outline-none',
            'touch-auto [transform:translateY(var(--drawer-swipe-movement-y))]',
            'transition-transform duration-[280ms] [transition-timing-function:var(--ease-out-soft)]',
            'data-swiping:select-none data-swiping:duration-0',
            'data-starting-style:[transform:translateY(100%)]',
            'data-ending-style:[transform:translateY(100%)] data-ending-style:duration-[220ms]',
            'data-ending-style:[transition-timing-function:cubic-bezier(0.4,0,1,1)]',
            className,
          )}
          {...props}
        >
          <DrawerHandle />
          <DrawerPrimitive.Content className="flex flex-col gap-3.5">
            {children}
          </DrawerPrimitive.Content>
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPrimitive.Portal>
  );
}

export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
};
