**Conversations shouldn't just live in a scrollbar.**
**Loominary gives your AI conversations a home — a local archive, yours to keep.**

I built this because I kept losing track of my own conversations. Hundreds of chats were scattered across Claude, ChatGPT, and Gemini, with no good way to search any of them. So, I made a tool to fix that.

*Formerly known as Lyra Exporter.*

-----

## What It Does

**Loominary is a local-first conversation manager**. Load your chats from Claude, ChatGPT, Gemini, Grok, NotebookLM, Google AI Studio, or SillyTavern. Search them, tag them, navigate their branches, and export them however you want.

(Note: While the Userscript version doesn't support SillyTavern, you can still manually load files/directories or use the Chrome/Firefox/Edge extension instead.)

It supports full account exports for Claude, ChatGPT, Grok, and SillyTavern, complete with timeline visualization across all conversations. To my knowledge, no other tool covers all four platforms in this way.

Everything runs in your browser. Your data stays on your machine. Mobile support is currently in the works—once released, navigation will intelligently hide on scroll, search will feature a dedicated mobile layout, and back gestures will work exactly as expected.

-----

## Realtime Recording

Most platforms overwrite your previous response the moment you edit a prompt. Once you hit save, the old answer is gone—and so is the comparison you wanted to make.

Loominary's **Realtime mode** records every version in the background. Every regeneration, every prompt edit. Open the preview, and you'll see all the branches laid out on a tree, side by side.

For example, after recent platform updates, many users found that reworking a prompt sometimes yielded worse results, leaving them without a way to revert. If you're generating images and want to compare four variations, Realtime keeps all of them. Because Loominary's global search indexes every branch, you can easily find content from older revisions that the platform itself has already buried.

Just install the Loominary, enable **Realtime Recording**, and let it handle the rest.

-----

## Capturing Context

Loominary goes beyond the chat and captures the context around each conversation:

  * **Claude:** Archives project descriptions, instructions, project memory, knowledge files, user preferences, and saved memories alongside the chat.
  * **ChatGPT:** Exports your ChatGPT memories alongside your conversations.
  * **SillyTavern:** Archives character cards, world books, and your current preset. Loominary loads all branch JSONL files and merges them into a single timeline—a feature not natively supported by SillyTavern.

-----

## What Else It Can Do

  * **Global Search:** Search across all conversations by content, title, or semantically (if you connect your own embedding model). Filter by images, thinking processes, Artifacts, or tool calls.
  * **Branch Navigation:** Loominary automatically detects branches and displays them on a timeline. Jump to the latest branch with a single click.
  * **Tagging:** Tag messages as completed, important, or deleted. Tags persist across sessions and carry through to your exports.
  * **Flexible Exports:** Export to Markdown, PDF (with LaTeX and image support)~~, or long screenshots~~. Choose exactly what to include: timestamps, thinking processes, Artifacts, tool calls, or citations.
  * **Batch Processing:** Batch export hundreds of conversations into a ZIP file, or choose to export only the latest branch of each when you don't need the full history (perfect for handling massive Claude account exports).
  * **Favorites:** Loominary preserves Claude's native conversation favorites and allows you to add your own.

-----

## Supported Platforms

| Platform | Load Chats | Project&Memories | Realtime Branches |
|---|---|---|---|
| Claude | Yes | Yes | Yes |
| ChatGPT | Yes | — | Yes |
| Gemini | Yes | — | Yes |
| Grok | Yes | — | Yes |
| NotebookLM | Yes | — | Whiteboard mode |
| Google AI Studio | Yes | — | — |
| SillyTavern | Yes | Yes | Merged branch files |

-----

## Getting Started

Try it online at [Loominary](https://laumss.github.io/react/welcome/).

[Greasyfork](https://greasyfork.org/en/scripts/539579-loominary-one-click-ai-chat-backup)

-----

## For Developers

While the online version runs entirely in your browser, building locally adds a backend that can serve your conversation data to other tools on your machine.

Tags, memories, project instructions, conversation history—anything Loominary archives can be exposed to local AI clients via MCP or similar protocols. If you mark a set of conversations as important, or save Claude project context alongside a chat, that information becomes available as context for whatever AI tool you're running locally.

This is still taking shape. While the architecture supports it, the integration surface is still in its early stages. If you're interested in building on top of this—or have ideas about how to bridge Loominary with other AI clients—[open an issue](https://github.com/Laumss/Loominary/issues) and let's figure it out together.

### Test Commands

- `npm test` runs the Jest suite locally.
- `npm run test:ci` runs the CI-ready, non-watch test command with coverage.
- [`docs/sprint-1-architecture.md`](C:/Users/pmacl/.codex/worktrees/6c61/loominary/docs/sprint-1-architecture.md) summarizes the Sprint 1 module boundaries.

-----

## Privacy

No analytics, no telemetry, no data collection. Conversations are processed entirely in your browser and stored locally. The extension only activates on supported platforms and communicates solely with your local Loominary instance.

-----

## Background

Loominary is a ground-up rewrite of the original Lyra Exporter. The old codebase grew too fast and became difficult to maintain, so I started fresh with a cleaner architecture. All original features have been successfully carried over.

-----

## Contributing

A contributing guide and development roadmap are on the way. In the meantime, if you have any idea, please [open an discussion](https://github.com/Laumss/Loominary/discussions).
