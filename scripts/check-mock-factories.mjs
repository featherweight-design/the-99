// Fails when a vi.mock factory reads or writes test-mutable state as it runs: Vitest caches a factory's result
// after its first success, so every later case sees the first value. See `scripts/lib/mock-factories.mjs`.
import { mockFactoryFindings } from "./lib/mock-factories.mjs";

const { files, annotated, findings } = mockFactoryFindings(process.cwd());
if (findings.length === 0) {
  console.log(`no vi.mock factory touches test-mutable state as it runs, ${files} files read, ${annotated} rerun-on-throw annotation(s) honoured`);
  process.exit(0);
}
for (const { path, line, name, why } of findings) console.error(`${path}:${line} ${name}: ${why}`);
console.error(`\n${findings.length} finding(s). A factory that only re-runs because it throws may carry \`// mock-factory: rerun-on-throw <reason>\` on the line above its vi.mock.`);
process.exit(1);
