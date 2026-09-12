---
name: check
description: Run typecheck, lint and tests, then list which docs must change for the current diff under the documentation rule. Use before committing.
disable-model-invocation: true
allowed-tools: Bash(npm run check) Bash(git status *) Bash(git diff *)
---

# Check before committing

## What changed

```!
git status --short || true
git diff --stat HEAD || true
```

## Steps

1. Run `npm run check` (typecheck, lint, tests). Report the result and any failure output.
2. **Docs.** For every changed code path above, find its doc in the code → doc map in `docs/README.md`. For each one:
   - If the doc still describes the code correctly, say so.
   - If not, update it in this change: mechanics, config keys, actions, events, file references.
   - New files or folders get a row in the code → doc map.
   - A new design decision, or a reversal of one, gets an ADR in `docs/decisions/` and a row in its index.
   - A number change in `engine/config/defaults.ts` gets a line in `TUNING.md`.
3. **Report.** Check result, then a table of changed code path → doc → status (up to date / updated / missing). Don't commit; the user decides when.
