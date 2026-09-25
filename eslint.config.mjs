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
    // Vendored design-handoff assets — not app code.
    "design/**",
    // Feature worktrees live inside the repo. The ".next/**" pattern above is
    // anchored to the root, so without this, linting the main checkout also
    // lints every worktree's src/ and its .next/ build output. Both places
    // worktrees are made: `.worktrees/` by hand, `.claude/worktrees/` by Claude
    // Code's own worktree tool — whose Turbopack chunks put 1,265 errors on the
    // main checkout's lint before this second line existed.
    ".worktrees/**",
    ".claude/worktrees/**",
  ]),
  {
    files: ["src/**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          // Scoped to interactive elements: an inline style can only kill a
          // hover state on something that has one. Inline colour on a static
          // div is a different (and far larger) concern, out of scope here.
          selector:
            "JSXOpeningElement[name.name=/^(button|a|Link)$/] > JSXAttribute[name.name='style'] Property[key.name=/^(background|backgroundColor|border|borderColor|color)$/]",
          message:
            "Deliver background, colour and border through Tailwind classes, not inline style — an inline style outranks hover: utilities and silently kills the hover state. Use PrimaryButton/GhostButton from src/components/ui/button.tsx, or disable this rule with a reason if the value is genuinely dynamic.",
        },
      ],
    },
  },
]);

export default eslintConfig;
