import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import { loadArchive } from '../server/archive/loadArchive.mjs';
import { createServer } from '../server/service/httpServer.mjs';

const fixtureRoot = path.resolve('tests/fixtures/archive-v1');

async function startFixtureServer(token = '') {
  const archive = await loadArchive(fixtureRoot);
  const service = createServer({
    archive,
    token,
    port: 0
  });
  const address = await service.listen();
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => service.close()
  };
}

test('HTTP endpoints list, search, and fetch context', async () => {
  const server = await startFixtureServer();

  try {
    const listResponse = await fetch(`${server.baseUrl}/v1/conversations`);
    const listPayload = await listResponse.json();
    assert.equal(listPayload.total, 2);

    const searchResponse = await fetch(`${server.baseUrl}/v1/search?q=provider-agnostic`);
    const searchPayload = await searchResponse.json();
    assert.equal(searchPayload.items[0].id, 'conv-alpha');

    const contextResponse = await fetch(`${server.baseUrl}/v1/conversations/conv-alpha/context`);
    const contextPayload = await contextResponse.json();
    assert.equal(contextPayload.memories.saved[0].id, 'memory-saved-1');
  } finally {
    await server.close();
  }
});

test('MCP endpoint exposes tools and serves tool calls', async () => {
  const server = await startFixtureServer('secret-token');

  try {
    const toolsResponse = await fetch(`${server.baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer secret-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list'
      })
    });
    const toolsPayload = await toolsResponse.json();
    assert.ok(toolsPayload.result.tools.some(tool => tool.name === 'get_context'));

    const callResponse = await fetch(`${server.baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer secret-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'get_favorites',
          arguments: {}
        }
      })
    });
    const callPayload = await callResponse.json();
    const favorites = JSON.parse(callPayload.result.content[0].text);
    assert.equal(favorites[0].id, 'conv-alpha');
  } finally {
    await server.close();
  }
});

test('token mode rejects unauthenticated requests', async () => {
  const server = await startFixtureServer('secret-token');

  try {
    const response = await fetch(`${server.baseUrl}/v1/conversations`);
    assert.equal(response.status, 401);
  } finally {
    await server.close();
  }
});
