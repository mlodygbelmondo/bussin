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
  ]),
  {
    // DB-client acquisition seam: app code must go through @/lib/supabase
    // (createWorkspaceClient / escalateToServiceRole), never the raw modules.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/supabase/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/supabase/server",
              message:
                'Use createWorkspaceClient from "@/lib/supabase" instead.',
            },
            {
              name: "@/lib/supabase/admin",
              message:
                'Service role bypasses RLS. Use escalateToServiceRole from "@/lib/supabase" and read its doc comment first.',
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
