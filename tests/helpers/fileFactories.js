export function createTextFile(name, contents, type = 'application/json', lastModified = 1) {
  const bytes = Buffer.from(contents, 'utf8');

  return {
    name,
    type,
    lastModified,
    size: bytes.length,
    text: async () => contents,
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  };
}

export function createBinaryFile(name, bytes, type = 'application/octet-stream', lastModified = 1) {
  const uint8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);

  return {
    name,
    type,
    lastModified,
    size: uint8.length,
    arrayBuffer: async () => uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength),
  };
}
