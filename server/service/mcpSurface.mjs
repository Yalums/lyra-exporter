function jsonRpcResult(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function jsonRpcError(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

function parseArguments(args) {
  if (!args) {
    return {};
  }

  if (typeof args === 'string') {
    return JSON.parse(args);
  }

  return args;
}

export function handleMcpRequest(archive, body) {
  const { id = null, method, params = {} } = body || {};

  if (method === 'initialize') {
    return jsonRpcResult(id, {
      protocolVersion: '2024-11-05',
      serverInfo: {
        name: 'loominary-local-archive',
        version: '0.1.0'
      },
      capabilities: {
        tools: {}
      }
    });
  }

  if (method === 'tools/list') {
    return jsonRpcResult(id, {
      tools: [
        {
          name: 'list_conversations',
          description: 'List archived conversations with optional favorites/tag filters.',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'number' },
              cursor: { type: 'number' },
              favoriteOnly: { type: 'boolean' },
              tag: { type: 'string' }
            }
          }
        },
        {
          name: 'search_conversations',
          description: 'Full-text search across titles, messages, tags, and captured context.',
          inputSchema: {
            type: 'object',
            required: ['query'],
            properties: {
              query: { type: 'string' },
              favoriteOnly: { type: 'boolean' }
            }
          }
        },
        {
          name: 'get_conversation',
          description: 'Fetch a full normalized conversation record.',
          inputSchema: {
            type: 'object',
            required: ['conversationId'],
            properties: {
              conversationId: { type: 'string' }
            }
          }
        },
        {
          name: 'get_branch_tree',
          description: 'Fetch the branch tree for a conversation.',
          inputSchema: {
            type: 'object',
            required: ['conversationId'],
            properties: {
              conversationId: { type: 'string' }
            }
          }
        },
        {
          name: 'get_tags',
          description: 'List all tags and their usage.',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'get_favorites',
          description: 'List favorite conversations.',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'get_context',
          description: 'Fetch attached project or memory context for a conversation.',
          inputSchema: {
            type: 'object',
            required: ['conversationId'],
            properties: {
              conversationId: { type: 'string' }
            }
          }
        }
      ]
    });
  }

  if (method === 'tools/call') {
    const { name, arguments: rawArguments } = params;
    const args = parseArguments(rawArguments);

    switch (name) {
      case 'list_conversations':
        return jsonRpcResult(id, {
          content: [
            {
              type: 'text',
              text: JSON.stringify(archive.listConversations(args))
            }
          ]
        });
      case 'search_conversations':
        return jsonRpcResult(id, {
          content: [
            {
              type: 'text',
              text: JSON.stringify(archive.searchConversations(args.query, args))
            }
          ]
        });
      case 'get_conversation':
        return jsonRpcResult(id, {
          content: [
            {
              type: 'text',
              text: JSON.stringify(archive.getConversation(args.conversationId))
            }
          ]
        });
      case 'get_branch_tree':
        return jsonRpcResult(id, {
          content: [
            {
              type: 'text',
              text: JSON.stringify(archive.getBranchTree(args.conversationId))
            }
          ]
        });
      case 'get_tags':
        return jsonRpcResult(id, {
          content: [
            {
              type: 'text',
              text: JSON.stringify(archive.getTags())
            }
          ]
        });
      case 'get_favorites':
        return jsonRpcResult(id, {
          content: [
            {
              type: 'text',
              text: JSON.stringify(archive.getFavorites())
            }
          ]
        });
      case 'get_context':
        return jsonRpcResult(id, {
          content: [
            {
              type: 'text',
              text: JSON.stringify(archive.getContext(args.conversationId))
            }
          ]
        });
      default:
        return jsonRpcError(id, -32601, `Unknown tool: ${name}`);
    }
  }

  return jsonRpcError(id, -32601, `Unknown method: ${method}`);
}
