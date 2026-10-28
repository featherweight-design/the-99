# Workflow (background)

The full text moved out of `AGENTS.md`, verbatim. `AGENTS.md` keeps each section's rules; this file keeps the history, measurements and derivations behind them.

- **Read the part of a file you need, not the whole file.** For anything over a
  few hundred lines, reach for `sed -n 'X,Yp'`, `grep -n` or `rg`, or pass
  `offset`/`limit` to the Read tool. Delegate whole-file reading and broad
  searches to a subagent, whose context is separate and discarded.

  This overrides the general preference for dedicated file tools over shell
  commands, on cost grounds, and only for large files. Measured over 14 recent
  transcripts in this repository (42,650 messages): tool traffic is 93% of all
  context, and within it **206 `Read` calls carried 30.3 MB of characters against
  9.8 MB from 14,147 `Bash` calls** — 147k characters per Read on average, 648k
  at worst, which is most of a context window in one call. The top 1% of tool
  results carry 75% of all result bytes.

  It matters because context is re-read on every turn: a large file read once is
  paid again on every later turn of that session. About 90% of token spend is
  cache reads, and per-turn context size — not session length — is what predicts
  cost. An 11,558-message session holding ~109k context ran $0.25 per message; a
  2,570-message session holding ~581k ran $0.98.

## From AGENTS.md (moved 2026-10-28)

The rule-form bullets `AGENTS.md` carried for this area until 2026-10-28, verbatim. Where they and the text above differ in wording, both are current.

- **Read the part of a file you need, not the whole file.** Over a few hundred lines, use `sed -n`, `grep -n`, `rg` or `offset`/`limit`, and delegate whole-file reads and broad searches to a subagent. Context is re-read every turn, so one big Read is paid for again on every later turn. This overrides the preference for dedicated file tools, for large files only.
- **MEASURE AGAINST `staging`, NOT `local-dev`.** Ruled 2026-09-20. `local-dev` is a probe
  playground — its accounts are built by fixtures that never commit, never buy and never finish a
  deck, so any FREQUENCY read off it is an artefact of the fixtures rather than a fact about the
  app. `staging` carries the real collection and the decks that actually get played, and it is the
  bar a new change is held to: a threshold, a distribution, a payload delta, a "how often would a
  reader see this" — all of them are counted there.

  This has already cost measurable work twice. The deck-status marks were designed against a
  `local-dev` split of 34 of 34 uncommitted decks, where production is 4 of 8, and shipped a phase
  cascade aimed at a state that barely exists. The commander row's gap line reads 5.4% on the
  seeded fixture account and 67.2% on the reference account **in the same database** — an edge
  case on one and the default on the other.

  Read-only measurement against `staging` is free and needs no permission. **What does NOT change
  is where a probe WRITES**: a script that creates fixtures still points at `local-dev` or a
  scratch branch, and `probe:arrivals` — whose `replaceCollection` DELETES every collection row
  for the user it is given — must never be pointed anywhere else. Measure on staging, mutate on
  local-dev.
