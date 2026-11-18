# scratch-gen · History local times R1 (#2986)

Recipe = move_copy scratch-gen (friends_link stubs): copy main without .git; drop @fwd-stack/* from package.json;
`npm install --ignore-scripts`; tsconfig with paths stubbing @clerk/nextjs, @clerk/nextjs/server and next/navigation;
`node css.mjs`. Before frames: `MODE=before npx tsx dz/render.tsx && MODE=before node dz/shoot.cjs` on main as is.
After frames: `patch -p1 < proposal.diff`, then the same with MODE=after. DATABASE_URL=postgres://x:y@localhost/z.
proposal.diff is a sketch of the logic to make the frames (en-US locale, zone passed as a prop), not the build.
