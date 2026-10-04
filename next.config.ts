import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // CLAUDE.md is hand-written and owned by this project; `next dev` otherwise
  // appends its own "nextjs-agent-rules" block to it on every run.
  agentRules: false,
};

export default nextConfig;
