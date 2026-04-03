# Dependency Review

Date: 2026-04-02

## Current versions inspected

These are the versions/ranges currently pinned in `package.json`:

- `@xenova/transformers` `^2.17.2`
- `fflate` `^0.8.2`
- `file-saver` `^2.0.5`
- `html2canvas` `^1.4.1`
- `jspdf` `^3.0.3`
- `jszip` `^3.10.1`
- `katex` `^0.16.23`
- `lucide-react` `^0.511.0`
- `react` `^19.1.0`
- `react-dom` `^19.1.0`
- `react-markdown` `^8.0.7`
- `react-scripts` `5.0.1`
- `react-syntax-highlighter` `^15.5.0`
- `rehype-katex` `^7.0.1`
- `rehype-raw` `^7.0.0`
- `remark-gfm` `^3.0.1`
- `remark-math` `^6.0.0`

## Outdated deltas found

`npm outdated --json --long` reported newer available releases for:

- `jspdf` `3.0.4` available, `4.2.1` latest
- `react` `19.2.4` available
- `react-dom` `19.2.4` available
- `katex` `0.16.44` available
- `react-markdown` `10.1.0` latest
- `react-syntax-highlighter` `16.1.1` latest
- `remark-gfm` `4.0.1` latest
- `lucide-react` `1.7.0` latest

## Decision

No code upgrade was applied in this pass.

The only clear low-risk bump here is the `jspdf` patch release, but the repo does not carry a lockfile and the rest of the affected dependency set includes major-version jumps. Because this app uses the markdown/rendering/export pipeline heavily, the safer choice is to defer any manifest changes until the major updates can be validated together.

## Risk notes and required migrations

- `jspdf` `3.x` -> `4.x`: verify PDF export APIs and generated output before adopting the major line.
- `react-markdown` `8.x` -> `10.x`: confirm plugin and renderer compatibility in the markdown views.
- `remark-gfm` `3.x` -> `4.x`: recheck markdown parsing behavior alongside `react-markdown`.
- `react-syntax-highlighter` `15.x` -> `16.x`: audit syntax theme/import behavior.
- `lucide-react` `0.x` -> `1.x`: recheck icon imports/usages across the app.

## Verification

- Ran `npm outdated --json --long`
- Ran `npm ls --depth=0 --json`
- Verified the repo currently has no lockfile in this worktree

## Follow-up

If we want an actual dependency upgrade PR later, the next safe pass should be a focused compatibility review on the markdown and export paths, then a controlled bump with build verification.
