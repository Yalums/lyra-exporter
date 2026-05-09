# Sprint 1 Architecture Note

Sprint 1 narrows [`/src/App.js`](C:/Users/pmacl/.codex/worktrees/6c61/loominary/src/App.js) back to app composition by moving critical workflows into dedicated seams:

- `src/hooks/useFileManager.js` owns file loading, parsing, metadata extraction, and merged JSONL file registration.
- `src/services/import/fileImportService.js` provides the shared parse/process pipeline used by both file management and global search.
- `src/services/import/conversationGroupingService.js` reconstructs JSONL branch groupings before merged import.
- `src/services/zip/zipConversationService.js` handles ZIP import parsing plus remote ZIP sync card refreshes.
- `src/hooks/useGlobalSearchIndex.js` centralizes index rebuild timing while `src/utils/globalSearchManager.js` stays focused on indexing/querying.
- `src/services/export/exportOrchestrator.js` coordinates Markdown and PDF export entry points and keeps config lookup out of `App.js`.
- `src/services/runtime/runtimeAdapterService.js` isolates browser runtime payload/session handling for extension and web viewers.

The result is that `App.js` now orchestrates view state and UI interactions, while parsing, import, search, export, and runtime integration are independently testable.
