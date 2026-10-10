import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The `supabase` Playwright project's dist dir (see playwright.config.ts).
    ".next-e2e-supabase/**",
    // Read-only design handoff — never edited, never linted.
    "design/**",
  ]),
]);

export default eslintConfig;
