import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import { loadArchive } from '../server/archive/loadArchive.mjs';

const fixtureRoot = path.resolve('tests/fixtures/archive-v1');

test('loadArchive reads manifest, conversations, contexts, and annotations', async () => {
  const archive = await loadArchive(fixtureRoot);

  assert.equal(archive.manifest.archiveId, 'fixture-archive');
  assert.equal(archive.listConversations().total, 2);
  assert.equal(archive.getFavorites().length, 1);
  assert.equal(archive.getTags().length, 3);
  assert.equal(archive.getContext('conv-alpha').project.name, 'Loominary Sprint 2');
});

test('searchConversations matches message and context content', async () => {
  const archive = await loadArchive(fixtureRoot);

  const archiveShapeResults = archive.searchConversations('archive shape');
  assert.equal(archiveShapeResults[0].id, 'conv-alpha');

  const memoryResults = archive.searchConversations('project memories');
  assert.equal(memoryResults[0].id, 'conv-alpha');
});

test('getBranchTree returns parent-child structure and branch points', async () => {
  const archive = await loadArchive(fixtureRoot);
  const tree = archive.getBranchTree('conv-alpha');

  assert.deepEqual(tree.rootMessageIds, ['msg-1']);
  const branchPoint = tree.nodes.find(node => node.id === 'msg-2');
  assert.equal(branchPoint.isBranchPoint, true);
  assert.deepEqual(branchPoint.childIds, ['msg-3', 'msg-4']);
});
