// Fails when a vi.mock factory reads or writes test-mutable state as it runs: Vitest caches a factory's result
// after its first success, so every later case sees the first value. See `scripts/lib/mock-factories.mjs`.
import { mockFactoryFindings } from "./lib/mock-factories.mjs";

const { files, mocking, annotated, findings } = mockFactoryFindings(process.cwd());
if (findings.length === 0) {
  console.log(`no vi.mock factory touches test-mutable state as it runs: ${files} test files read, ${mocking} with vi.mock, ${annotated} annotation(s) checked`);
  process.exit(0);
}
for (const { path, line, name, why } of findings) console.error(`${path}:${line} ${name}: ${why}`);
console.error(`\n${findings.length} finding(s). A factory may carry \`// mock-factory: rerun-on-throw|set-once <name> <reason>\` above its vi.mock; scripts/lib/mock-factories.mjs says when each holds.`);
process.exit(1);
