import path from 'node:path';

import { loadArchive } from './archive/loadArchive.mjs';
import { createServer } from './service/httpServer.mjs';

function readArgument(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return fallback;
  }

  return process.argv[index + 1] || fallback;
}

async function main() {
  const archiveRoot = path.resolve(readArgument('--archive', process.env.LOOMINARY_ARCHIVE_PATH || './example-archive'));
  const host = readArgument('--host', process.env.LOOMINARY_LOCAL_HOST || '127.0.0.1');
  const port = Number(readArgument('--port', process.env.LOOMINARY_LOCAL_PORT || '3788'));
  const token = process.env.LOOMINARY_LOCAL_TOKEN || '';

  const archive = await loadArchive(archiveRoot);
  const service = createServer({ archive, host, port, token });
  const address = await service.listen();

  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        archiveId: archive.manifest.archiveId,
        host: address.address,
        port: address.port,
        auth: token ? 'bearer-token' : 'loopback-only'
      },
      null,
      2
    ) + '\n'
  );
}

main().catch(error => {
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
});
