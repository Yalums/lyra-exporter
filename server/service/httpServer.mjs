import http from 'node:http';
import { URL } from 'node:url';

import { handleMcpRequest } from './mcpSurface.mjs';

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8'
  });
  response.end(JSON.stringify(payload, null, 2));
}

function notFound(response) {
  sendJson(response, 404, { error: 'Not found' });
}

function unauthorized(response) {
  sendJson(response, 401, { error: 'Unauthorized' });
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const body = Buffer.concat(chunks).toString('utf8');
  return body ? JSON.parse(body) : {};
}

function isLoopback(remoteAddress = '') {
  return (
    remoteAddress === '127.0.0.1' ||
    remoteAddress === '::1' ||
    remoteAddress === '::ffff:127.0.0.1'
  );
}

function authorize(request, token) {
  if (isLoopback(request.socket.remoteAddress) && !token) {
    return true;
  }

  if (isLoopback(request.socket.remoteAddress) && token) {
    return request.headers.authorization === `Bearer ${token}`;
  }

  return false;
}

export function createServer({ archive, token = '', host = '127.0.0.1', port = 3788 }) {
  const server = http.createServer(async (request, response) => {
    try {
      if (!authorize(request, token)) {
        unauthorized(response);
        return;
      }

      const url = new URL(request.url, `http://${request.headers.host || `${host}:${port}`}`);
      const pathname = url.pathname;

      if (request.method === 'GET' && pathname === '/health') {
        sendJson(response, 200, {
          ok: true,
          archiveId: archive.manifest.archiveId,
          schemaVersion: archive.manifest.schemaVersion
        });
        return;
      }

      if (request.method === 'GET' && pathname === '/v1/conversations') {
        sendJson(response, 200, archive.listConversations({
          limit: Number(url.searchParams.get('limit') || 50),
          cursor: Number(url.searchParams.get('cursor') || 0),
          favoriteOnly: url.searchParams.get('favoriteOnly') === 'true',
          tag: url.searchParams.get('tag')
        }));
        return;
      }

      if (request.method === 'GET' && pathname === '/v1/search') {
        sendJson(response, 200, {
          items: archive.searchConversations(url.searchParams.get('q') || '', {
            favoriteOnly: url.searchParams.get('favoriteOnly') === 'true'
          })
        });
        return;
      }

      if (request.method === 'GET' && pathname === '/v1/tags') {
        sendJson(response, 200, { items: archive.getTags() });
        return;
      }

      if (request.method === 'GET' && pathname === '/v1/favorites') {
        sendJson(response, 200, { items: archive.getFavorites() });
        return;
      }

      if (request.method === 'POST' && pathname === '/mcp') {
        const body = await readJsonBody(request);
        sendJson(response, 200, handleMcpRequest(archive, body));
        return;
      }

      const conversationMatch = pathname.match(/^\/v1\/conversations\/([^/]+)$/);
      if (request.method === 'GET' && conversationMatch) {
        const record = archive.getConversation(decodeURIComponent(conversationMatch[1]));
        if (!record) {
          notFound(response);
          return;
        }
        sendJson(response, 200, record);
        return;
      }

      const branchTreeMatch = pathname.match(/^\/v1\/conversations\/([^/]+)\/tree$/);
      if (request.method === 'GET' && branchTreeMatch) {
        const record = archive.getBranchTree(decodeURIComponent(branchTreeMatch[1]));
        if (!record) {
          notFound(response);
          return;
        }
        sendJson(response, 200, record);
        return;
      }

      const contextMatch = pathname.match(/^\/v1\/conversations\/([^/]+)\/context$/);
      if (request.method === 'GET' && contextMatch) {
        const record = archive.getContext(decodeURIComponent(contextMatch[1]));
        if (!record) {
          notFound(response);
          return;
        }
        sendJson(response, 200, record);
        return;
      }

      notFound(response);
    } catch (error) {
      sendJson(response, 500, {
        error: error.message
      });
    }
  });

  return {
    server,
    listen() {
      return new Promise(resolve => {
        server.listen(port, host, () => resolve(server.address()));
      });
    },
    close() {
      return new Promise((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve());
      });
    }
  };
}
