function normalizeFileBaseName(fileName) {
  return fileName.replace(/\.(jsonl|json)$/i, '');
}

export function groupFilesByConversation(filesData) {
  const groups = new Map();
  const fileNameToIntegrity = new Map();
  const integrityToGroup = new Map();
  const chatIdHashToGroup = new Map();
  const mainChatToGroup = new Map();

  filesData.forEach((fileData) => {
    const metadata = fileData.data[0]?.chat_metadata;
    const integrity = metadata?.integrity;
    const mainChat = metadata?.main_chat;
    const chatIdHash = metadata?.chat_id_hash;

    if (mainChat) return;

    const baseName = normalizeFileBaseName(fileData.fileName);
    const groupKey = integrity || chatIdHash?.toString() || fileData.fileName;

    if (integrity) {
      fileNameToIntegrity.set(baseName, integrity);
      fileNameToIntegrity.set(fileData.fileName, integrity);
      integrityToGroup.set(integrity, groupKey);
    }

    if (chatIdHash) {
      chatIdHashToGroup.set(chatIdHash, groupKey);
    }

    mainChatToGroup.set(baseName, groupKey);
    mainChatToGroup.set(fileData.fileName, groupKey);
  });

  filesData.forEach((fileData) => {
    const metadata = fileData.data[0]?.chat_metadata;
    const integrity = metadata?.integrity;
    const mainChat = metadata?.main_chat;
    const chatIdHash = metadata?.chat_id_hash;

    let groupKey;

    if (mainChat) {
      if (mainChatToGroup.has(mainChat)) {
        groupKey = mainChatToGroup.get(mainChat);
      } else if (mainChatToGroup.has(`${mainChat}.jsonl`)) {
        groupKey = mainChatToGroup.get(`${mainChat}.jsonl`);
      } else if (integrity && integrityToGroup.has(integrity)) {
        groupKey = integrityToGroup.get(integrity);
      } else if (chatIdHash && chatIdHashToGroup.has(chatIdHash)) {
        groupKey = chatIdHashToGroup.get(chatIdHash);
      } else {
        groupKey = mainChat;
        mainChatToGroup.set(mainChat, groupKey);
        if (integrity) integrityToGroup.set(integrity, groupKey);
        if (chatIdHash) chatIdHashToGroup.set(chatIdHash, groupKey);
      }
    } else if (integrity && integrityToGroup.has(integrity)) {
      groupKey = integrityToGroup.get(integrity);
    } else if (chatIdHash && chatIdHashToGroup.has(chatIdHash)) {
      groupKey = chatIdHashToGroup.get(chatIdHash);
    } else {
      groupKey = integrity || chatIdHash?.toString() || fileData.fileName;
    }

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey).push(fileData);
  });

  return Array.from(groups.values());
}
