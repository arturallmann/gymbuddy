# Graphify

Graphify builds a knowledge graph of this repo: code, docs and how they connect.
It is a developer tool only. The app does not use it, and it is not in `package.json`.

Use it to get an overview, to find which code and docs belong together,
and to spot docs that repeat each other or are not linked from anywhere.
The graph is a map, not the truth. `src/` and `docs/` always win.

## Install

```
pipx install "graphifyy[sql]"           # [sql] also reads the migrations in drizzle/
graphify install --platform claude      # adds the /graphify skill to Claude Code
```

## Commands

| Command | What it does |
|---|---|
| `/graphify .` (in Claude Code) | Full build: code (no LLM) plus docs (read by Claude). Writes `graphify-out/`. |
| `graphify update .` | Re-reads changed code files only. No LLM, fast. Run it after a branch changes code. |
| `/graphify . --update` (in Claude Code) | Also re-reads changed docs. Run it after a branch changes `docs/` or `CLAUDE.md`. |
| `graphify update . --force` | Rebuild after deleting files. Without `--force`, graphify refuses to write a smaller graph. |
| `/graphify query "<question>"` | Answers a question from the graph, for example "what calls getDatabase?" |
| `graphify path "A" "B"` | Shortest path between two nodes. |
| `graphify explain "X"` | One node and its neighbours in plain words. |

## Output (`graphify-out/`)

| File | Holds |
|---|---|
| `graph.html` | Interactive graph. Open it in a browser. |
| `GRAPH_REPORT.md` | Most connected nodes, surprising connections, suggested questions, communities. |
| `graph.json` | Raw graph for queries. |

`graphify-out/` is in `.gitignore`. Never commit it: every developer builds their own.

## How to read the report

- Edges marked `EXTRACTED` come straight from the files (imports, calls, links).
  Edges marked `INFERRED` or `semantically_similar_to` are guesses by the LLM. Check them in the files.
- Two doc nodes that are "semantically similar" often mean the same rule is written in two places.
  Keep the rule in one place and link to it from the other.
- A doc node with few connections is often a doc that nothing links to.
- Low cohesion for `src/db/schema.ts` is expected. The schema is one file by design,
  and it already holds tables for later phases.
- The most connected nodes include config and test tools (`vitest`, `compilerOptions`).
  The app's own core shows up below them: `useSettings()`, `createTestDatabase()`, `getDatabase()`.

## Known limits

- Without the `[sql]` extra, the SQL migrations in `drizzle/` add nothing to the graph.
- The `.gradle` files in `android/` do not parse and add no nodes.
- The Android splash screens and launcher icons carry no knowledge. Skip them in the doc pass.
