import * as esbuild from "esbuild";
const W = "<repo>", G = "<scratch>";
const stub = { name: "stub", setup(b) {
  b.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: G + "/stubs/next-navigation.ts" }));
  b.onResolve({ filter: /^next\/link$/ }, () => ({ path: G + "/stubs/next-link.tsx" }));
  b.onResolve({ filter: /opponent-actions$/ }, () => ({ path: G + "/stubs/opponent-actions.ts" }));
  b.onResolve({ filter: /result-actions$/ }, () => ({ path: G + "/stubs/result-actions.ts" }));
  b.onResolve({ filter: /^(drizzle-orm|@neondatabase|postgres|pg|@clerk\/nextjs\/server|next\/cache|next\/server|next\/headers|server-only|node:.*|stripe|resend|web-push|@vercel\/.*|@sentry\/.*|posthog-node)(\/.*)?$/ }, () => ({ path: G + "/stubs/proxy.cjs" }));
  b.onResolve({ filter: /^@clerk\/nextjs$/ }, () => ({ path: G + "/stubs/clerk.cjs" }));
  b.onLoad({ filter: /\/src\/.*\.tsx?$/ }, async (a) => {
    const fs = await import("node:fs"); const t = fs.readFileSync(a.path, "utf8");
    if (/^\s*(\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*["']use server["']/.test(t) || /\/src\/db\//.test(a.path)) return { contents: fs.readFileSync(G + "/stubs/proxy.cjs", "utf8"), loader: "js" };
    return undefined;
  });
  b.onResolve({ filter: /^@3d-dice/ }, () => ({ path: G + "/stubs/result-actions.ts" }));
}};
await esbuild.build({ entryPoints: [G + "/entry.tsx"], bundle: true, outfile: G + "/out/app.js", format: "esm", jsx: "automatic", nodePaths: [G + "/node_modules"], plugins: [stub], define: { "process.env.NODE_ENV": '"production"' }, logLevel: "error", alias: { "@": W + "/src" } });
console.log("built");
