import type { NextConfig } from 'next';

/**
 * The `/dev/*` gallery and playgrounds are named `page.dev.tsx`, so they are
 * only a route when `dev.tsx` counts as a page extension — i.e. in development.
 * A production build therefore never pulls in `src/dev/fixtures.ts` or the
 * seeds, and no sample data reaches `.next/static`.
 */
const pageExtensions =
  process.env.NODE_ENV === 'production'
    ? ['tsx', 'ts']
    : ['dev.tsx', 'tsx', 'ts'];

const nextConfig: NextConfig = {
  pageExtensions,
  // CLAUDE.md is hand-written and owned by this project; `next dev` otherwise
  // appends its own "nextjs-agent-rules" block to it on every run.
  agentRules: false,
  // The floating dev badge is fixed-position and lands inside `pnpm shots`
  // screenshots of individual sections.
  devIndicators: false,
  // `next dev`'s lockfile (`<distDir>/dev/lock`) is keyed by distDir, not by
  // port: e2e's `supabase` project runs a second `next dev` on :3001 from the
  // same checkout, so it needs its own distDir or the two collide.
  // `playwright.config.ts` sets NEXT_DIST_DIR for that server only.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
};

export default nextConfig;
