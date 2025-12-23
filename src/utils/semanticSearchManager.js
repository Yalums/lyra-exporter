// utils/semanticSearchManager.js
// 语义搜索管理器 - 支持中英文语义搜索和对话式问答
// 支持两种 Embedding 提供者：Transformers.js（浏览器内）和 LM Studio（本地 API）

import { pipeline } from '@xenova/transformers';

// 默认配置
const DEFAULT_EMBEDDING_CONFIG = {
  provider: 'lmstudio',  // 'transformers' | 'lmstudio'
  lmStudioUrl: 'http://localhost:1234',
  modelName: 'qwen3-embedding',  // LM Studio 中加载的模型名称
};

/**
 * 语义搜索管理器
 * 支持 Transformers.js 和 LM Studio 两种 Embedding 后端
 */
export class SemanticSearchManager {
  constructor() {
    this.embedder = null;  // Transformers.js embedder
    this.isLoading = false;
    this.isReady = false;
    this.vectorIndex = [];
    this.loadProgress = 0;
    this.onProgressCallback = null;

    // Embedding 配置
    this.embeddingConfig = this.loadEmbeddingConfig();
  }

  /**
   * 从 localStorage 加载配置
   */
  loadEmbeddingConfig() {
    try {
      const saved = localStorage.getItem('semantic-embedding-config');
      if (saved) {
        return { ...DEFAULT_EMBEDDING_CONFIG, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('[SemanticSearch] 加载配置失败:', e);
    }
    return { ...DEFAULT_EMBEDDING_CONFIG };
  }

  /**
   * 保存配置到 localStorage
   */
  saveEmbeddingConfig() {
    try {
      localStorage.setItem('semantic-embedding-config', JSON.stringify(this.embeddingConfig));
    } catch (e) {
      console.warn('[SemanticSearch] 保存配置失败:', e);
    }
  }

  /**
   * 设置 Embedding 配置
   * @param {Object} config - 配置对象
   */
  setEmbeddingConfig(config) {
    // 如果 provider 改变了，需要重置状态
    if (config.provider !== this.embeddingConfig.provider) {
      this.isReady = false;
      this.embedder = null;
      this.vectorIndex = [];
    }

    this.embeddingConfig = { ...this.embeddingConfig, ...config };
    this.saveEmbeddingConfig();
    console.log('[SemanticSearch] 配置已更新:', this.embeddingConfig);
  }

  /**
   * 获取当前 Embedding 配置
   */
  getEmbeddingConfig() {
    return { ...this.embeddingConfig };
  }

  /**
   * 通过 LM Studio API 获取 Embedding
   * @param {string} text - 输入文本
   * @returns {Float32Array} 向量
   */
  async embedViaLMStudio(text) {
    const { lmStudioUrl, modelName } = this.embeddingConfig;
    const url = `${lmStudioUrl}/v1/embeddings`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: text,
          model: modelName,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LM Studio API 错误 (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      if (!data.data || !data.data[0] || !data.data[0].embedding) {
        throw new Error('LM Studio 返回格式错误');
      }

      // 转换为 Float32Array
      return new Float32Array(data.data[0].embedding);
    } catch (error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error(`无法连接到 LM Studio (${lmStudioUrl})，请确保 LM Studio 正在运行并已启动本地服务器`);
      }
      throw error;
    }
  }

  /**
   * 初始化 Embedding 模型
   * @param {Function} onProgress - 加载进度回调
   */
  async initialize(onProgress) {
    if (this.isReady) return true;
    if (this.isLoading) return false;

    this.isLoading = true;
    this.onProgressCallback = onProgress;

    const { provider } = this.embeddingConfig;

    try {
      if (provider === 'lmstudio') {
        return await this.initializeLMStudio(onProgress);
      } else {
        return await this.initializeTransformers(onProgress);
      }
    } catch (error) {
      console.error('[SemanticSearch] 初始化失败:', error);
      this.isLoading = false;

      if (this.onProgressCallback) {
        this.onProgressCallback({
          status: 'error',
          progress: 0,
          message: `初始化失败: ${error.message}`
        });
      }

      return false;
    }
  }

  /**
   * 初始化 LM Studio 后端
   */
  async initializeLMStudio(onProgress) {
    const { lmStudioUrl, modelName } = this.embeddingConfig;

    console.log('[SemanticSearch] 使用 LM Studio 后端');
    console.log('[SemanticSearch] API 地址:', lmStudioUrl);
    console.log('[SemanticSearch] 模型名称:', modelName);

    if (onProgress) {
      onProgress({
        status: 'loading',
        progress: 30,
        message: `连接 LM Studio (${lmStudioUrl})...`
      });
    }

    // 测试连接
    try {
      const testEmbedding = await this.embedViaLMStudio('测试连接');
      console.log('[SemanticSearch] LM Studio 连接成功，向量维度:', testEmbedding.length);

      if (onProgress) {
        onProgress({
          status: 'loading',
          progress: 100,
          message: `LM Studio 连接成功 (向量维度: ${testEmbedding.length})`
        });
      }

      this.isReady = true;
      this.isLoading = false;

      if (onProgress) {
        onProgress({
          status: 'ready',
          progress: 100,
          message: `已连接 LM Studio (${modelName})`
        });
      }

      return true;
    } catch (error) {
      this.isLoading = false;
      throw error;
    }
  }

  /**
   * 初始化 Transformers.js 后端
   */
  async initializeTransformers(onProgress) {
    console.log('[SemanticSearch] 使用 Transformers.js 后端');

    const modelConfig = {
      model: 'Xenova/paraphrase-multilingual-MiniLM-L12-v2',
      localModelPath: null,
    };

    const modelPath = modelConfig.localModelPath || modelConfig.model;
    console.log('[SemanticSearch] 使用模型:', modelPath);

    // 使用多语言模型，支持中英文
    this.embedder = await pipeline(
      'feature-extraction',
      modelPath,
      {
        progress_callback: (progress) => {
          console.log('[SemanticSearch] 进度更新:', progress);

          if (progress.status === 'initiate') {
            if (this.onProgressCallback) {
              this.onProgressCallback({
                status: 'loading',
                progress: 0,
                message: `准备下载模型文件: ${progress.file}...`
              });
            }
          } else if (progress.status === 'download') {
            const percent = progress.progress || 0;
            if (this.onProgressCallback) {
              this.onProgressCallback({
                status: 'loading',
                progress: percent,
                message: `下载中: ${progress.file} (${percent.toFixed(1)}%)`
              });
            }
          } else if (progress.status === 'progress') {
            this.loadProgress = Math.round(progress.progress || 0);
            if (this.onProgressCallback) {
              this.onProgressCallback({
                status: 'loading',
                progress: this.loadProgress,
                message: `加载模型中... ${this.loadProgress}%`
              });
            }
          } else if (progress.status === 'done') {
            if (this.onProgressCallback) {
              this.onProgressCallback({
                status: 'loading',
                progress: 100,
                message: `文件加载完成: ${progress.file}`
              });
            }
          }
        }
      }
    );

    // 测试模型是否真正可用
    console.log('[SemanticSearch] 测试模型...');
    if (this.onProgressCallback) {
      this.onProgressCallback({
        status: 'loading',
        progress: 95,
        message: '正在测试模型...'
      });
    }

    await this.embedder('测试', { pooling: 'mean', normalize: true });

    this.isReady = true;
    this.isLoading = false;
    console.log('[SemanticSearch] Transformers.js 模型加载完成');

    if (this.onProgressCallback) {
      this.onProgressCallback({
        status: 'ready',
        progress: 100,
        message: '模型加载完成'
      });
    }

    return true;
  }

  /**
   * 计算文本的向量表示
   * @param {string} text - 输入文本
   * @returns {Float32Array} 向量
   */
  async embed(text) {
    if (!this.isReady) {
      throw new Error('模型未初始化');
    }

    // 截断过长的文本
    const truncatedText = text.slice(0, 1500);
    const { provider } = this.embeddingConfig;

    if (provider === 'lmstudio') {
      return await this.embedViaLMStudio(truncatedText);
    } else {
      if (!this.embedder) {
        throw new Error('Transformers.js 模型未加载');
      }
      const output = await this.embedder(truncatedText, {
        pooling: 'mean',
        normalize: true
      });
      return output.data;
    }
  }

  /**
   * 构建向量索引
   * @param {Array} messages - 消息列表 [{id, content, metadata}]
   * @param {Function} onProgress - 进度回调
   */
  async buildIndex(messages, onProgress) {
    if (!this.isReady) {
      await this.initialize(onProgress);
    }

    this.vectorIndex = [];
    const total = messages.length;
    let processed = 0;

    console.log(`[SemanticSearch] 开始构建索引，共 ${total} 条消息`);

    // 批量处理
    // LM Studio 使用较小的批次避免请求过多
    const batchSize = this.embeddingConfig.provider === 'lmstudio' ? 5 : 10;

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);

      await Promise.all(batch.map(async (msg) => {
        try {
          const embedding = await this.embed(msg.content);
          this.vectorIndex.push({
            id: msg.id,
            embedding: embedding,
            content: msg.content,
            metadata: msg.metadata
          });
        } catch (error) {
          console.error(`[SemanticSearch] 向量化失败 (${msg.id}):`, error);
          console.error('[SemanticSearch] 消息内容:', msg.content?.substring(0, 100));
        }
      }));

      processed += batch.length;
      if (onProgress) {
        onProgress({
          status: 'indexing',
          progress: Math.round((processed / total) * 100),
          message: `向量化中... ${processed}/${total}`
        });
      }
    }

    console.log(`[SemanticSearch] 索引构建完成，共 ${this.vectorIndex.length} 条`);

    if (onProgress) {
      onProgress({
        status: 'indexed',
        progress: 100,
        message: `索引完成，共 ${this.vectorIndex.length} 条`
      });
    }

    return this.vectorIndex.length;
  }

  /**
   * 余弦相似度计算
   */
  cosineSimilarity(a, b) {
    // 处理不同维度的向量（理论上不应该发生，但做个保护）
    const len = Math.min(a.length, b.length);

    let dotProduct = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < len; i++) {
      dotProduct += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
  }

  /**
   * 语义搜索
   * @param {string} query - 搜索查询
   * @param {number} topK - 返回前K个结果
   * @returns {Array} 搜索结果
   */
  async search(query, topK = 5) {
    if (!this.isReady || this.vectorIndex.length === 0) {
      return [];
    }

    const queryEmbedding = await this.embed(query);

    // 计算与所有文档的相似度
    const results = this.vectorIndex.map(doc => ({
      ...doc,
      score: this.cosineSimilarity(queryEmbedding, doc.embedding)
    }));

    // 按相似度排序并返回前K个
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, topK).map(r => ({
      id: r.id,
      content: r.content,
      metadata: r.metadata,
      score: r.score
    }));
  }

  /**
   * 获取索引统计
   */
  getStats() {
    return {
      isReady: this.isReady,
      isLoading: this.isLoading,
      indexSize: this.vectorIndex.length,
      loadProgress: this.loadProgress,
      provider: this.embeddingConfig.provider,
      lmStudioUrl: this.embeddingConfig.lmStudioUrl,
      modelName: this.embeddingConfig.modelName
    };
  }

  /**
   * 清空索引
   */
  clear() {
    this.vectorIndex = [];
  }

  /**
   * 重置状态（切换 provider 时使用）
   */
  reset() {
    this.embedder = null;
    this.isLoading = false;
    this.isReady = false;
    this.vectorIndex = [];
    this.loadProgress = 0;
  }
}

// 单例
let semanticSearchInstance = null;

export function getSemanticSearchManager() {
  if (!semanticSearchInstance) {
    semanticSearchInstance = new SemanticSearchManager();
  }
  return semanticSearchInstance;
}

/**
 * 从 globalSearchManager 的索引中提取消息用于语义搜索
 * @param {GlobalSearchManager} globalSearchManager
 * @returns {Array} 消息列表
 */
export function extractMessagesForSemantic(globalSearchManager) {
  const messages = [];

  globalSearchManager.messageIndex.forEach((data, messageId) => {
    // 跳过空白消息
    if (data.message.isBlank) return;

    messages.push({
      id: messageId,
      content: data.searchableText || data.message.content || '',
      metadata: {
        fileIndex: data.fileIndex,
        fileName: data.fileName,
        conversationUuid: data.conversationUuid,
        conversationName: data.conversationName,
        messageIndex: data.messageIndex,
        messageUuid: data.messageUuid,
        sender: data.message.sender,
        timestamp: data.message.timestamp,
        hasThinking: data.hasThinking,
        hasArtifacts: data.hasArtifacts
      }
    });
  });

  return messages;
}
