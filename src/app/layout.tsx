import type { Metadata } from 'next';
import { Be_Vietnam_Pro, Caprasimo, Fraunces } from 'next/font/google';
import { Toaster } from '@/components/common/Toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { t } from '@/lib/copy';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  axes: ['SOFT', 'opsz'],
  variable: '--font-fraunces',
  display: 'swap',
});

const beVietnam = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-be-vietnam',
  display: 'swap',
});

const caprasimo = Caprasimo({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-caprasimo',
  display: 'swap',
});

export const metadata: Metadata = {
  title: t('app.name'),
  description: t('app.tagline'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${fraunces.variable} ${beVietnam.variable} ${caprasimo.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
