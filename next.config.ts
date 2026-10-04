import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // CLAUDE.md is hand-written and owned by this project; `next dev` otherwise
  // appends its own "nextjs-agent-rules" block to it on every run.
  agentRules: false,
  // The floating dev badge is fixed-position and lands inside `pnpm shots`
  // screenshots of individual sections.
  devIndicators: false,
};

export default nextConfig;
