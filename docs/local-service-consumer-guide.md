# Loominary Local Service Consumer Guide

## Start the service

```bash
node server/loominary-local-service.mjs --archive ./tests/fixtures/archive-v1 --port 3788
```

Optional auth:

```bash
LOOMINARY_LOCAL_TOKEN=dev-token node server/loominary-local-service.mjs --archive ./tests/fixtures/archive-v1
```

## HTTP surface

Endpoints:

- `GET /health`
- `GET /v1/conversations`
- `GET /v1/search?q=<query>`
- `GET /v1/conversations/:conversationId`
- `GET /v1/conversations/:conversationId/tree`
- `GET /v1/conversations/:conversationId/context`
- `GET /v1/tags`
- `GET /v1/favorites`
- `POST /mcp`

## Example HTTP query flows

List recent conversations:

```bash
curl http://127.0.0.1:3788/v1/conversations
```

Search across titles, messages, tags, and context:

```bash
curl "http://127.0.0.1:3788/v1/search?q=provider-agnostic"
```

Fetch a full conversation and then its branch tree:

```bash
curl http://127.0.0.1:3788/v1/conversations/conv-alpha
curl http://127.0.0.1:3788/v1/conversations/conv-alpha/tree
```

Fetch project and memory context:

```bash
curl http://127.0.0.1:3788/v1/conversations/conv-alpha/context
```

Filter to favorites or a tag:

```bash
curl "http://127.0.0.1:3788/v1/conversations?favoriteOnly=true"
curl "http://127.0.0.1:3788/v1/conversations?tag=research"
```

## Example MCP flows

List available tools:

```bash
curl -X POST http://127.0.0.1:3788/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

Search conversations via MCP:

```bash
curl -X POST http://127.0.0.1:3788/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "search_conversations",
      "arguments": {
        "query": "project memories"
      }
    }
  }'
```

Fetch attached context via MCP:

```bash
curl -X POST http://127.0.0.1:3788/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "get_context",
      "arguments": {
        "conversationId": "conv-alpha"
      }
    }
  }'
```

## Consumer expectations

- Treat conversation IDs as Loominary-local IDs.
- Prefer `messages[].text` for simple prompt/context assembly.
- Use `messages[].content` when you need typed rendering later.
- Pull context separately so tools can choose when to include project instructions or saved memories.
- Do not depend on provider-specific payloads being present.

## Current limitations

- Archive creation is not yet automated from the browser app.
- Search is in-memory and rebuilt at startup.
- The MCP surface is tool-call oriented and intentionally narrow for v1.
