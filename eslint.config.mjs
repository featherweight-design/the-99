import { defineConfig, globalIgnores } from "eslint/config";
import next from "@fwd-stack/eslint-config/next";

const eslintConfig = defineConfig([
  // The shared preset: eslint-config-next's core-web-vitals and typescript configs, the rules
  // every fwd-stack project shares (unused vars with the `_` escape, type-only imports, `any` as a
  // warning), and the ignores: build output, `next-env.d.ts`, `.worktrees/` and `.claude/worktrees/`.
  ...next,
  globalIgnores([
    "out/**",
    "build/**",
    // Vendored design-handoff assets — not app code.
    "design/**",
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
