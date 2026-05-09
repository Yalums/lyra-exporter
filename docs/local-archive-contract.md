# Loominary Local Archive Contract v1

This sprint adds the first stable local archive surface for Loominary. The goal is to keep the protocol small, provider-agnostic, and durable enough for other local AI tools to consume directly.

## Design goals

- Local-first source of truth.
- Provider-agnostic normalized records.
- Separate immutable-ish archive records from rebuildable indexes.
- Expose captured context beside the conversation it belongs to.
- Keep auth simple for local-only use, with an opt-in token for stricter setups.

## On-disk layout

```text
archive-root/
  manifest.json
  annotations.json
  conversations/
    <conversation-id>.json
  contexts/
    <conversation-id>.json
```

## Source of truth vs derived state

Source of truth:

- `manifest.json`
- `annotations.json`
- `conversations/*.json`
- `contexts/*.json`

Derived state:

- Full-text search indexes
- Conversation summary views
- Branch tree projections

Derived state can be rebuilt at service startup. Consumers should not treat indexes as canonical.

## `manifest.json`

```json
{
  "schemaVersion": "loominary.archive/v1",
  "archiveId": "workspace-or-user-archive",
  "createdAt": "2026-05-08T00:00:00.000Z",
  "updatedAt": "2026-05-08T00:00:00.000Z",
  "layout": {
    "conversationsDir": "conversations",
    "contextsDir": "contexts",
    "annotationsFile": "annotations.json"
  },
  "lifecycle": {
    "sourceOfTruth": [
      "manifest.json",
      "conversations/*.json",
      "contexts/*.json",
      "annotations.json"
    ],
    "derivedIndexes": [
      "rebuild-in-memory"
    ]
  },
  "trust": {
    "defaultBind": "127.0.0.1",
    "authMode": "loopback-or-token"
  }
}
```

## Conversation record

Each conversation is a self-contained normalized record:

```json
{
  "schemaVersion": "loominary.conversation/v1",
  "conversation": {
    "id": "conv-alpha",
    "title": "Sprint architecture notes",
    "platform": "claude",
    "provider": "anthropic",
    "providerConversationId": "provider-alpha",
    "createdAt": "2026-05-07T12:00:00.000Z",
    "updatedAt": "2026-05-08T02:00:00.000Z",
    "favorite": true
  },
  "branches": [
    {
      "id": "main",
      "rootMessageId": "msg-1",
      "leafMessageIds": ["msg-3", "msg-4"]
    }
  ],
  "messages": [
    {
      "id": "msg-1",
      "parentId": null,
      "branchId": "main",
      "role": "user",
      "createdAt": "2026-05-07T12:00:00.000Z",
      "text": "Summarize the local archive shape for Loominary.",
      "content": [
        { "type": "text", "text": "Summarize the local archive shape for Loominary." }
      ]
    }
  ]
}
```

Normalized rules:

- `conversation.id` is Loominary-local and stable within the archive.
- `providerConversationId` is optional provider metadata and not the primary key.
- `messages[].text` is the consumer-friendly plain text projection.
- `messages[].content` preserves extensible typed blocks.
- `branches[]` describes branch membership without exposing provider-specific tree formats.

## Context record

Context lives beside the conversation, not mixed into message bodies:

```json
{
  "schemaVersion": "loominary.context/v1",
  "conversationId": "conv-alpha",
  "project": {
    "id": "project-1",
    "name": "Loominary Sprint 2",
    "description": "First local integration surface.",
    "instructions": "Keep outputs provider-agnostic and durable.",
    "knowledgeFiles": [
      {
        "id": "kf-1",
        "name": "README.md",
        "summary": "Product promise and archive framing."
      }
    ]
  },
  "memories": {
    "global": [],
    "project": [],
    "saved": []
  }
}
```

This covers the captured context called out in the README:

- project descriptions and instructions
- project memories
- saved memories
- knowledge-file metadata

## Annotations record

Tags and favorites are normalized into a single annotations file:

```json
{
  "schemaVersion": "loominary.annotations/v1",
  "favorites": ["conv-alpha"],
  "tags": [
    {
      "tag": "important",
      "conversationId": "conv-alpha",
      "messageId": "msg-2",
      "createdAt": "2026-05-08T00:00:00.000Z",
      "source": "loominary"
    }
  ]
}
```

Rules:

- Favorites are conversation-level only.
- Tags can target a whole conversation or a specific message.
- Message tags stay stable via `messageId`, not array index.

## Trust and auth model

Default trust model:

- Bind only to `127.0.0.1`.
- Treat loopback traffic as trusted when no token is configured.
- If `LOOMINARY_LOCAL_TOKEN` is set, require `Authorization: Bearer <token>` even on loopback.

Non-goals for v1:

- multi-user auth
- remote exposure
- browser-session identity forwarding

## Storage and index lifecycle

- Archive JSON files are the durable layer.
- Search and branch projections are rebuilt when the service starts.
- If a conversation or context file changes, restarting the service is enough to pick it up.
- Future sprint work can add file watching or persisted indexes without changing the record contract.

## Mapping from current Loominary state

This v1 contract is designed to absorb current product concepts cleanly:

- browser `localStorage` favorites map -> `annotations.favorites`
- browser mark/tag state -> `annotations.tags`
- normalized parser output `chat_history` -> `messages`
- detected branches -> `branches`
- export-time project/memory payloads -> `contexts/<conversation-id>.json`
