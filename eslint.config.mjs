import { defineConfig, globalIgnores } from "eslint/config";
import next from "@fwd-stack/eslint-config/next";
import { MINT, REVEAL, REVEAL_ALLOW, TESTING } from "./scripts/lib/third-party-names-rules.mjs";

// Another reader's name (`src/lib/person-name/`): who may import the mint, the reveal and tests' helper. The table is
// `scripts/lib/third-party-names-rules.mjs`; `pnpm check:third-party-names` is the authority (it resolves every import
// and re-export, and checks what the type cannot), this is the same rule in the editor. Later blocks override earlier.
const restrictedName = (...modules) => [
  "error",
  {
    patterns: modules.map((file) => {
      const stem = file.replace(/^src\/lib\/person-name\//, "").replace(/\.ts$/, "");
      return {
        group: [`**/person-name/${stem}`, `**/person-name/${stem}.ts`],
        message:
          stem === "mint"
            ? "Only src/lib/social mints a ThirdPartyName (named)."
            : stem === "reveal"
              ? "Draw a name with PersonName, PersonText or personAttrs; reveal() is for the files in REVEAL_ALLOW."
              : "Tests only.",
      };
    }),
  },
];
const nameRules = [
  { files: ["src/**/*.{ts,tsx,mts}"], rules: { "no-restricted-imports": restrictedName(MINT, REVEAL, TESTING) } },
  { files: ["src/lib/social/**/*.{ts,tsx}"], rules: { "no-restricted-imports": restrictedName(REVEAL, TESTING) } },
  { files: REVEAL_ALLOW.filter((f) => f.startsWith("src/lib/social/")), rules: { "no-restricted-imports": restrictedName(TESTING) } },
  { files: REVEAL_ALLOW.filter((f) => !f.startsWith("src/lib/social/") && !f.startsWith("src/lib/person-name/")), rules: { "no-restricted-imports": restrictedName(MINT, TESTING) } },
  { files: ["src/lib/person-name/**/*.{ts,tsx}", "src/**/*.test.{ts,tsx,mts}"], rules: { "no-restricted-imports": "off" } },
];

// Every Sentry log goes through `logEvent` (`src/lib/sentry/log-event.ts`), whose closed event names and allowlisted attributes
// keep a name, an email or a Clerk id out of Sentry (`docs/agents/ops.md`). A raw `Sentry.logger` call, or `logger` imported from
// a Sentry package, fails lint everywhere but that file.
const SENTRY_LOGGER = [
  {
    selector: "MemberExpression[object.name='Sentry'][property.name='logger']",
    message: "Write Sentry logs through logEvent (src/lib/sentry/log-event.ts): its allowlist keeps player data out.",
  },
  {
    selector: "ImportDeclaration[source.value=/^@sentry\\u002F/] > ImportSpecifier[imported.name='logger']",
    message: "Write Sentry logs through logEvent (src/lib/sentry/log-event.ts): its allowlist keeps player data out.",
  },
];

// A copy leaf's parameters are the fill-ins its text may use, and an editor may drop any of them from the text (the copy
// sheet and the on-page editor allow it), so an unused parameter in a copy file is not a mistake. Only there:
// `scripts/lib/copy-sheet/lint-scope.test.mts` fails if the exemption reaches any other file.
// Every other option is read from the shared preset, so a change there reaches copy files too.
const UNUSED = "@typescript-eslint/no-unused-vars";
const presetUnused = next.findLast((c) => c.rules?.[UNUSED])?.rules[UNUSED];
if (!Array.isArray(presetUnused) || typeof presetUnused[1] !== "object") throw new Error(`eslint.config.mjs: the shared preset no longer sets ${UNUSED} with options`);
const copyArgs = {
  files: ["src/lib/copy/**/*.ts"],
  ignores: ["src/lib/copy/**/*.test.ts"],
  rules: { [UNUSED]: [presetUnused[0], { ...presetUnused[1], args: "none" }] },
};

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
  ...nameRules,
  copyArgs,
  { files: ["src/**/*.{ts,mts}"], ignores: ["src/lib/sentry/log-event.ts"], rules: { "no-restricted-syntax": ["error", ...SENTRY_LOGGER] } },
  {
    files: ["src/**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...SENTRY_LOGGER,
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
