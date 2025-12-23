// granularExportManager.js
// Exportação granular de conversas com nomenclatura estruturada
// Formato: DDD-AUTOR-BRANCH-SSS-TIPO.ext

import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { DateTimeUtils } from '../fileParser/helpers.js';
import { getRenameManager } from '../renameManager';
import { formatThinking, formatArtifact, formatTool, formatCitations } from '../formatHelpers';

/**
 * Configuração de exportação granular
 */
export const GranularExportConfig = {
  // Tipos de elementos exportáveis
  ELEMENT_TYPES: {
    MESSAGE: 'message',
    THINKING: 'thinking',
    ARTIFACT: 'artefato',
    TOOL: 'tool',
    CITATION: 'citation',
    ATTACHMENT: 'anexo',
    IMAGE: 'imagem',
    CONSOLE: 'console'
  },

  // Autores
  AUTHORS: {
    USER: 'USER',
    AI: 'IA'
  },

  // Extensões de arquivo por tipo
  EXTENSIONS: {
    message: 'md',
    thinking: 'md',
    artefato: null, // Determinado pelo tipo do artefato
    tool: 'md',
    citation: 'md',
    anexo: null, // Mantém extensão original
    imagem: null, // Mantém extensão original
    console: 'md'
  }
};

/**
 * Formata número com padding de zeros
 * @param {number} num - Número a formatar
 * @param {number} digits - Quantidade de dígitos
 * @returns {string} - Número formatado
 */
const padNumber = (num, digits = 3) => {
  return String(num).padStart(digits, '0');
};

/**
 * Determina o marcador de branch para uma mensagem
 * @param {Object} msg - Mensagem
 * @returns {string} - Marcador de branch (M para main, Tdd para branch)
 */
const getBranchMarker = (msg) => {
  if (!msg.branch_id || msg.branch_id === 'main') {
    return 'M';
  }
  // Extrai o número do branch do branch_id
  const branchMatch = msg.branch_id.match(/branch[_.]?(\d+)/i);
  if (branchMatch) {
    return `T${padNumber(parseInt(branchMatch[1]), 2)}`;
  }
  // Se não conseguir extrair, usa hash do branch_id
  const hash = Math.abs(msg.branch_id.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0)) % 100;
  return `T${padNumber(hash, 2)}`;
};

/**
 * Determina o autor da mensagem
 * @param {Object} msg - Mensagem
 * @returns {string} - USER ou IA
 */
const getAuthor = (msg) => {
  return msg.sender === 'human' ? GranularExportConfig.AUTHORS.USER : GranularExportConfig.AUTHORS.AI;
};

/**
 * Gera nome de arquivo seguindo o padrão de nomenclatura
 * @param {number} msgIndex - Índice da mensagem (DDD)
 * @param {string} author - Autor (USER|IA)
 * @param {string} branchMarker - Marcador de branch (M|Tdd)
 * @param {number} elementIndex - Índice do elemento dentro da mensagem (SSS)
 * @param {string} elementType - Tipo do elemento
 * @param {string} extension - Extensão do arquivo
 * @returns {string} - Nome do arquivo formatado
 */
const generateFileName = (msgIndex, author, branchMarker, elementIndex, elementType, extension) => {
  return `${padNumber(msgIndex)}-${author}-${branchMarker}-${padNumber(elementIndex)}-${elementType}.${extension}`;
};

/**
 * Determina a extensão do artefato baseado no tipo
 * @param {Object} artifact - Artefato
 * @returns {string} - Extensão do arquivo
 */
const getArtifactExtension = (artifact) => {
  const type = artifact.type?.toLowerCase() || '';
  const language = artifact.language?.toLowerCase() || '';

  // Mapeamento de tipos para extensões
  const typeMap = {
    'html': 'html',
    'css': 'css',
    'javascript': 'js',
    'js': 'js',
    'typescript': 'ts',
    'ts': 'ts',
    'python': 'py',
    'java': 'java',
    'cpp': 'cpp',
    'c++': 'cpp',
    'c': 'c',
    'csharp': 'cs',
    'c#': 'cs',
    'ruby': 'rb',
    'go': 'go',
    'rust': 'rs',
    'php': 'php',
    'swift': 'swift',
    'kotlin': 'kt',
    'scala': 'scala',
    'sql': 'sql',
    'shell': 'sh',
    'bash': 'sh',
    'powershell': 'ps1',
    'yaml': 'yaml',
    'yml': 'yml',
    'json': 'json',
    'xml': 'xml',
    'markdown': 'md',
    'md': 'md',
    'text': 'txt',
    'svg': 'svg',
    'react': 'jsx',
    'jsx': 'jsx',
    'tsx': 'tsx',
    'vue': 'vue'
  };

  // Verifica primeiro pelo language, depois pelo type
  const ext = typeMap[language] || typeMap[type] || 'txt';
  return ext;
};

/**
 * Classe para exportação granular de mensagens
 */
export class GranularExportManager {
  constructor() {
    this.renameManager = getRenameManager();
  }

  /**
   * Extrai elementos de uma mensagem e retorna como array de arquivos
   * @param {Object} msg - Mensagem a processar
   * @param {number} msgIndex - Índice da mensagem (baseado em 1)
   * @returns {Array} - Array de objetos {fileName, content, type}
   */
  extractMessageElements(msg, msgIndex) {
    const elements = [];
    const author = getAuthor(msg);
    const branchMarker = getBranchMarker(msg);
    let elementCounter = 1;

    // 1. Mensagem principal (texto)
    if (msg.display_text || msg.raw_text) {
      const content = this.formatMessageContent(msg);
      elements.push({
        fileName: generateFileName(msgIndex, author, branchMarker, elementCounter++, 'message', 'md'),
        content,
        type: 'message'
      });
    }

    // 2. Thinking (se existir e for IA)
    if (msg.thinking && msg.sender !== 'human') {
      const content = this.formatThinkingContent(msg);
      elements.push({
        fileName: generateFileName(msgIndex, author, branchMarker, elementCounter++, 'thinking', 'md'),
        content,
        type: 'thinking'
      });
    }

    // 3. Artefatos (se existirem)
    if (msg.artifacts && msg.artifacts.length > 0) {
      msg.artifacts.forEach((artifact, idx) => {
        const ext = getArtifactExtension(artifact);
        const content = artifact.content || '';
        elements.push({
          fileName: generateFileName(msgIndex, author, branchMarker, elementCounter++, 'artefato', ext),
          content,
          type: 'artifact',
          metadata: {
            title: artifact.title,
            type: artifact.type,
            language: artifact.language
          }
        });
      });
    }

    // 4. Tools (se existirem)
    if (msg.tools && msg.tools.length > 0) {
      msg.tools.forEach((tool, idx) => {
        const content = this.formatToolContent(tool);
        elements.push({
          fileName: generateFileName(msgIndex, author, branchMarker, elementCounter++, 'tool', 'md'),
          content,
          type: 'tool'
        });
      });
    }

    // 5. Citations (se existirem)
    if (msg.citations && msg.citations.length > 0) {
      const content = this.formatCitationsContent(msg.citations);
      elements.push({
        fileName: generateFileName(msgIndex, author, branchMarker, elementCounter++, 'citation', 'md'),
        content,
        type: 'citation'
      });
    }

    // 6. Attachments (se existirem)
    if (msg.attachments && msg.attachments.length > 0) {
      msg.attachments.forEach((att, idx) => {
        const ext = att.file_name?.split('.').pop() || 'bin';
        elements.push({
          fileName: generateFileName(msgIndex, author, branchMarker, elementCounter++, 'anexo', ext),
          content: att.extracted_content || `[Anexo: ${att.file_name}]`,
          type: 'attachment',
          metadata: att
        });
      });
    }

    // 7. Images (se existirem)
    if (msg.images && msg.images.length > 0) {
      msg.images.forEach((img, idx) => {
        const ext = img.file_type?.split('/').pop() || 'png';
        elements.push({
          fileName: generateFileName(msgIndex, author, branchMarker, elementCounter++, 'imagem', ext),
          content: img.embedded_image?.data || null,
          type: 'image',
          metadata: img,
          isBase64: true
        });
      });
    }

    return elements;
  }

  /**
   * Formata conteúdo da mensagem para Markdown
   */
  formatMessageContent(msg) {
    const lines = [];

    // Cabeçalho
    lines.push(`# Mensagem`);
    lines.push('');
    lines.push(`**Autor:** ${msg.sender === 'human' ? 'Usuário' : 'IA'}`);
    if (msg.timestamp) {
      lines.push(`**Data:** ${msg.timestamp}`);
    }
    if (msg.branch_id && msg.branch_id !== 'main') {
      lines.push(`**Branch:** ${msg.branch_id}`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');

    // Conteúdo
    lines.push(msg.display_text || msg.raw_text || '');

    return lines.join('\n');
  }

  /**
   * Formata thinking para Markdown
   */
  formatThinkingContent(msg) {
    const lines = [];

    lines.push(`# Processo de Pensamento`);
    lines.push('');
    lines.push(`**Mensagem:** #${msg.index + 1}`);
    if (msg.timestamp) {
      lines.push(`**Data:** ${msg.timestamp}`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push(msg.thinking);

    return lines.join('\n');
  }

  /**
   * Formata tool para Markdown
   */
  formatToolContent(tool) {
    const lines = [];

    lines.push(`# Uso de Ferramenta`);
    lines.push('');
    lines.push(`**Ferramenta:** ${tool.name || 'Desconhecida'}`);
    lines.push('');

    if (tool.query) {
      lines.push(`**Consulta:** ${tool.query}`);
      lines.push('');
    }

    if (tool.input) {
      lines.push('## Parâmetros de Entrada');
      lines.push('```json');
      lines.push(JSON.stringify(tool.input, null, 2));
      lines.push('```');
      lines.push('');
    }

    if (tool.result) {
      lines.push('## Resultado');
      lines.push('```');
      lines.push(typeof tool.result === 'string' ? tool.result : JSON.stringify(tool.result, null, 2));
      lines.push('```');
    }

    return lines.join('\n');
  }

  /**
   * Formata citations para Markdown
   */
  formatCitationsContent(citations) {
    const lines = [];

    lines.push(`# Citações`);
    lines.push('');

    citations.forEach((cit, idx) => {
      lines.push(`## Citação ${idx + 1}`);
      if (cit.title) {
        lines.push(`**Título:** ${cit.title}`);
      }
      if (cit.url) {
        lines.push(`**URL:** [${cit.url}](${cit.url})`);
      }
      if (cit.snippet || cit.content) {
        lines.push('');
        lines.push(cit.snippet || cit.content);
      }
      lines.push('');
    });

    return lines.join('\n');
  }

  /**
   * Exporta uma única mensagem como ZIP
   */
  async exportMessage(msg, msgIndex, conversationTitle = 'conversa') {
    const zip = new JSZip();
    const elements = this.extractMessageElements(msg, msgIndex);
    const author = getAuthor(msg);
    const branchMarker = getBranchMarker(msg);

    elements.forEach(element => {
      if (element.isBase64 && element.content) {
        // Imagem em base64
        const base64Data = element.content.split(',')[1] || element.content;
        zip.file(element.fileName, base64Data, { base64: true });
      } else if (element.content) {
        zip.file(element.fileName, element.content);
      }
    });

    const zipFileName = `${padNumber(msgIndex)}-${author}-${branchMarker}.zip`;
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, zipFileName);

    return zipFileName;
  }

  /**
   * Exporta thinking de uma mensagem específica
   */
  async exportThinking(msg, msgIndex) {
    if (!msg.thinking) {
      throw new Error('Mensagem não contém processo de pensamento');
    }

    const content = this.formatThinkingContent(msg);
    const author = getAuthor(msg);
    const branchMarker = getBranchMarker(msg);
    const fileName = generateFileName(msgIndex, author, branchMarker, 1, 'thinking', 'md');

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    saveAs(blob, fileName);

    return fileName;
  }

  /**
   * Exporta output (mensagem) de uma mensagem específica
   */
  async exportOutput(msg, msgIndex) {
    const content = this.formatMessageContent(msg);
    const author = getAuthor(msg);
    const branchMarker = getBranchMarker(msg);
    const fileName = generateFileName(msgIndex, author, branchMarker, 1, 'message', 'md');

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    saveAs(blob, fileName);

    return fileName;
  }

  /**
   * Exporta artefato de uma mensagem específica
   */
  async exportArtifact(msg, msgIndex, artifactIndex = 0) {
    if (!msg.artifacts || msg.artifacts.length === 0) {
      throw new Error('Mensagem não contém artefatos');
    }

    const artifact = msg.artifacts[artifactIndex];
    const ext = getArtifactExtension(artifact);
    const author = getAuthor(msg);
    const branchMarker = getBranchMarker(msg);
    const fileName = generateFileName(msgIndex, author, branchMarker, artifactIndex + 1, 'artefato', ext);

    const blob = new Blob([artifact.content || ''], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, fileName);

    return fileName;
  }

  /**
   * Exporta toda uma conversa como ZIP hierárquico
   */
  async exportConversation(processedData, options = {}) {
    const zip = new JSZip();
    const messages = processedData.chat_history || [];
    const title = processedData.meta_info?.title || 'conversa';
    const updatedAt = processedData.meta_info?.updated_at || new Date().toISOString();

    // Formata data para nome do arquivo
    const dateStr = this.formatDateForFilename(updatedAt);
    const safeName = this.sanitizeFileName(title);

    // Agrupa mensagens por autor e branch
    const messageGroups = new Map();

    messages.forEach((msg, idx) => {
      const msgIndex = idx + 1;
      const elements = this.extractMessageElements(msg, msgIndex);
      const author = getAuthor(msg);
      const branchMarker = getBranchMarker(msg);
      const groupKey = `${padNumber(msgIndex)}-${author}-${branchMarker}`;

      if (!messageGroups.has(groupKey)) {
        messageGroups.set(groupKey, []);
      }
      messageGroups.get(groupKey).push(...elements);
    });

    // Cria ZIPs internos para cada grupo de mensagens
    for (const [groupKey, elements] of messageGroups) {
      const groupZip = new JSZip();

      elements.forEach(element => {
        if (element.isBase64 && element.content) {
          const base64Data = element.content.split(',')[1] || element.content;
          groupZip.file(element.fileName, base64Data, { base64: true });
        } else if (element.content) {
          groupZip.file(element.fileName, element.content);
        }
      });

      const groupBlob = await groupZip.generateAsync({ type: 'blob' });
      zip.file(`${groupKey}.zip`, groupBlob);
    }

    // Adiciona metadados da conversa
    const metadata = this.generateConversationMetadata(processedData);
    zip.file('_metadata.json', JSON.stringify(metadata, null, 2));

    const zipFileName = `${safeName}_${dateStr}.zip`;
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, zipFileName);

    return zipFileName;
  }

  /**
   * Exporta projeto completo (todas as conversas + metadados)
   */
  async exportProject(projectData, options = {}) {
    const zip = new JSZip();
    const conversations = projectData.conversations || [];
    const projectMeta = projectData.meta || {};

    // Metadados do projeto
    const projectMetadata = {
      name: projectMeta.name || 'Projeto',
      description: projectMeta.description || '',
      system_prompt: projectMeta.system_prompt || '',
      created_at: projectMeta.created_at,
      updated_at: projectMeta.updated_at,
      conversation_count: conversations.length,
      export_date: new Date().toISOString()
    };

    zip.file('project_metadata.json', JSON.stringify(projectMetadata, null, 2));

    // System prompt separado
    if (projectMeta.system_prompt) {
      zip.file('system_prompt.md', `# System Prompt\n\n${projectMeta.system_prompt}`);
    }

    // Banco de conhecimento
    if (projectMeta.knowledge_base && projectMeta.knowledge_base.length > 0) {
      const kbFolder = zip.folder('knowledge_base');
      projectMeta.knowledge_base.forEach((kb, idx) => {
        const fileName = kb.name || `knowledge_${padNumber(idx + 1)}.md`;
        kbFolder.file(fileName, kb.content || '');
      });
    }

    // Conversas
    const conversationsFolder = zip.folder('conversations');

    for (let i = 0; i < conversations.length; i++) {
      const conv = conversations[i];
      const convTitle = conv.meta_info?.title || `conversa_${padNumber(i + 1)}`;
      const safeName = this.sanitizeFileName(convTitle);
      const convZip = new JSZip();

      // Processa mensagens da conversa
      const messages = conv.chat_history || [];
      const messageGroups = new Map();

      messages.forEach((msg, idx) => {
        const msgIndex = idx + 1;
        const elements = this.extractMessageElements(msg, msgIndex);
        const author = getAuthor(msg);
        const branchMarker = getBranchMarker(msg);
        const groupKey = `${padNumber(msgIndex)}-${author}-${branchMarker}`;

        if (!messageGroups.has(groupKey)) {
          messageGroups.set(groupKey, []);
        }
        messageGroups.get(groupKey).push(...elements);
      });

      // Cria ZIPs para cada grupo
      for (const [groupKey, elements] of messageGroups) {
        const groupZip = new JSZip();

        elements.forEach(element => {
          if (element.isBase64 && element.content) {
            const base64Data = element.content.split(',')[1] || element.content;
            groupZip.file(element.fileName, base64Data, { base64: true });
          } else if (element.content) {
            groupZip.file(element.fileName, element.content);
          }
        });

        const groupBlob = await groupZip.generateAsync({ type: 'blob' });
        convZip.file(`${groupKey}.zip`, groupBlob);
      }

      // Metadados da conversa
      convZip.file('_metadata.json', JSON.stringify(this.generateConversationMetadata(conv), null, 2));

      const convBlob = await convZip.generateAsync({ type: 'blob' });
      conversationsFolder.file(`${safeName}.zip`, convBlob);
    }

    // Nome do arquivo final
    const projectName = this.sanitizeFileName(projectMeta.name || 'projeto');
    const dateStr = this.formatDateForFilename(new Date().toISOString());
    const zipFileName = `${projectName}_${dateStr}.zip`;

    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, zipFileName);

    return zipFileName;
  }

  /**
   * Gera metadados de uma conversa
   */
  generateConversationMetadata(processedData) {
    const meta = processedData.meta_info || {};
    const messages = processedData.chat_history || [];

    // Estatísticas
    const stats = {
      total_messages: messages.length,
      user_messages: messages.filter(m => m.sender === 'human').length,
      ai_messages: messages.filter(m => m.sender !== 'human').length,
      messages_with_thinking: messages.filter(m => m.thinking).length,
      messages_with_artifacts: messages.filter(m => m.artifacts?.length > 0).length,
      messages_with_images: messages.filter(m => m.images?.length > 0).length,
      messages_with_tools: messages.filter(m => m.tools?.length > 0).length
    };

    // Branches
    const branches = [...new Set(messages.map(m => m.branch_id).filter(Boolean))];

    return {
      title: meta.title || 'Conversa',
      uuid: meta.uuid || '',
      platform: meta.platform || 'claude',
      model: meta.model || '',
      created_at: meta.created_at,
      updated_at: meta.updated_at,
      project_uuid: meta.project_uuid || '',
      statistics: stats,
      branches: branches,
      export_date: new Date().toISOString()
    };
  }

  /**
   * Formata data para nome de arquivo (yyyyMMdd)
   */
  formatDateForFilename(dateStr) {
    try {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}${month}${day}`;
    } catch {
      return DateTimeUtils.getCurrentDate().replace(/-/g, '');
    }
  }

  /**
   * Sanitiza nome de arquivo removendo caracteres inválidos
   */
  sanitizeFileName(name) {
    return name
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 100);
  }

  /**
   * Lista branches disponíveis em uma conversa
   */
  getBranchOptions(processedData) {
    const messages = processedData.chat_history || [];
    const branches = new Map();

    messages.forEach(msg => {
      const branchId = msg.branch_id || 'main';
      if (!branches.has(branchId)) {
        branches.set(branchId, {
          id: branchId,
          marker: getBranchMarker(msg),
          messageCount: 0
        });
      }
      branches.get(branchId).messageCount++;
    });

    return Array.from(branches.values());
  }
}

// Instância singleton
let granularExportManagerInstance = null;

export const getGranularExportManager = () => {
  if (!granularExportManagerInstance) {
    granularExportManagerInstance = new GranularExportManager();
  }
  return granularExportManagerInstance;
};

export default GranularExportManager;
