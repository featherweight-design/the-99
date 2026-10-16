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
