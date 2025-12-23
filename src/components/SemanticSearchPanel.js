// components/SemanticSearchPanel.js
// 对话式语义搜索面板

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getSemanticSearchManager, extractMessagesForSemantic } from '../utils/semanticSearchManager';
import { getGlobalSearchManager } from '../utils/globalSearchManager';
import { useI18n } from '../index.js';

/**
 * 对话式语义搜索面板
 */
export default function SemanticSearchPanel({
  isOpen,
  onClose,
  files,
  processedData,
  currentFileIndex,
  onNavigateToMessage
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [progress, setProgress] = useState({ status: '', progress: 0, message: '' });
  const [searchResults, setSearchResults] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [llmConfig, setLlmConfig] = useState(() => {
    const saved = localStorage.getItem('semantic-llm-config');
    return saved ? JSON.parse(saved) : {
      provider: 'none',  // 'none' | 'openai' | 'claude'
      apiKey: '',
      apiEndpoint: '',
      model: '',
      modelHistory: []  // 记录用户输入过的模型
    };
  });
  const [showSettings, setShowSettings] = useState(false);

  // 手势支持
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const panelRef = useRef(null);

  // Embedding 配置状态
  const [embeddingConfig, setEmbeddingConfigState] = useState(() => {
    const saved = localStorage.getItem('semantic-embedding-config');
    return saved ? JSON.parse(saved) : {
      provider: 'lmstudio',  // 只支持 'lmstudio'
      lmStudioUrl: 'http://localhost:1234',
      modelName: 'qwen3-embedding'
    };
  });

  const inputRef = useRef(null);
  const chatContainerRef = useRef(null);
  const semanticManagerRef = useRef(null);
  const globalManagerRef = useRef(null);
  const pendingQueryRef = useRef(null);  // 存储待执行的搜索查询
  const debounceTimerRef = useRef(null);  // 文件变化防抖定时器

  // 初始化管理器
  useEffect(() => {
    semanticManagerRef.current = getSemanticSearchManager();
    globalManagerRef.current = getGlobalSearchManager();
    setIsModelReady(semanticManagerRef.current?.isReady || false);
    // 同步 embedding 配置到管理器
    if (semanticManagerRef.current) {
      semanticManagerRef.current.setEmbeddingConfig(embeddingConfig);
    }
  }, []);

  // 更新 Embedding 配置
  const updateEmbeddingConfig = (newConfig) => {
    const updatedConfig = { ...embeddingConfig, ...newConfig };
    setEmbeddingConfigState(updatedConfig);
    if (semanticManagerRef.current) {
      semanticManagerRef.current.setEmbeddingConfig(updatedConfig);
      // 如果 provider 改变，需要重新初始化
      if (newConfig.provider && newConfig.provider !== embeddingConfig.provider) {
        setIsModelReady(false);
      }
    }
  };

  // 保存 LLM 配置
  useEffect(() => {
    localStorage.setItem('semantic-llm-config', JSON.stringify(llmConfig));
  }, [llmConfig]);

  // 保存 Embedding 配置
  useEffect(() => {
    localStorage.setItem('semantic-embedding-config', JSON.stringify(embeddingConfig));
  }, [embeddingConfig]);

  // 添加模型到历史记录
  const addModelToHistory = (model) => {
    if (!model || !model.trim()) return;
    const trimmedModel = model.trim();
    setLlmConfig(prev => {
      const history = prev.modelHistory || [];
      // 如果已存在，移到最前面；否则添加到最前面
      const newHistory = [trimmedModel, ...history.filter(m => m !== trimmedModel)].slice(0, 10); // 最多保存10个
      return { ...prev, modelHistory: newHistory };
    });
  };

  // 记录上一次的文件信息，用于检测文件变化
  const prevFilesSignatureRef = useRef('');

  // 监听文件变化，自动重建索引（带5秒防抖）
  useEffect(() => {
    // 生成文件签名（使用文件数量和文件名列表）
    const currentSignature = files?.length
      ? `${files.length}:${files.map(f => f.name || f.filename || '').join(',')}`
      : '';

    const prevSignature = prevFilesSignatureRef.current;

    // 只在签名真正变化时才触发（跳过初始化）
    const filesChanged = prevSignature !== '' && currentSignature !== prevSignature;

    // 更新签名
    prevFilesSignatureRef.current = currentSignature;

    // 如果文件发生变化，使用防抖机制
    if (filesChanged) {
      console.log('[SemanticSearchPanel] 检测到文件变化，启动5秒防抖');
      console.log('[SemanticSearchPanel] 旧签名:', prevSignature);
      console.log('[SemanticSearchPanel] 新签名:', currentSignature);

      // 清除之前的定时器
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // 设置等待状态提示
      setProgress({ status: 'waiting', progress: 0, message: t('semanticSearch.status.filesChanging') });

      // 5秒防抖：等待文件稳定后再重建索引
      debounceTimerRef.current = setTimeout(() => {
        console.log('[SemanticSearchPanel] 文件已稳定5秒，准备重建索引');

        if (semanticManagerRef.current?.isReady) {
          // 清空向量索引
          semanticManagerRef.current.clear();
        }
        // 重置全局索引
        if (globalManagerRef.current) {
          globalManagerRef.current.messageIndex.clear();
        }
        // 标记需要重新索引
        setProgress({ status: 'stale', progress: 0, message: t('semanticSearch.status.filesChanged') });
        setIsModelReady(false);

        debounceTimerRef.current = null;

        // 如果有待处理的搜索查询，自动启动索引
        if (pendingQueryRef.current) {
          console.log('[SemanticSearchPanel] 检测到待处理查询，自动启动索引');
          // 使用 setTimeout 确保状态更新后再启动索引
          setTimeout(() => {
            initializeAndIndex();
          }, 100);
        }
      }, 5000);  // 5秒防抖
    }

    // 清理函数：组件卸载时清除定时器
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [files]);

  // 自动滚动到底部
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // 浏览器回退支持
  useEffect(() => {
    if (!isOpen) return;

    // 添加 history 记录
    window.history.pushState({ view: 'semantic-search' }, '');

    const handlePopState = (event) => {
      if (isOpen && (!event.state || event.state.view !== 'semantic-search')) {
        onClose();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, onClose]);

  // 手势支持
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    // 右滑关闭面板
    if (isRightSwipe) {
      window.history.back();
    }
  };

  // 初始化模型并构建索引
  const initializeAndIndex = useCallback(async () => {
    if (!semanticManagerRef.current || !globalManagerRef.current) return;
    if (isIndexing || isLoading) return;

    setIsIndexing(true);

    try {
      // 1. 初始化模型
      console.log('[SemanticSearchPanel] 开始初始化模型...');
      const initSuccess = await semanticManagerRef.current.initialize((p) => {
        console.log('[SemanticSearchPanel] 进度回调:', p);
        setProgress(p);
        if (p.status === 'ready') {
          setIsModelReady(true);
        }
        if (p.status === 'error') {
          console.error('[SemanticSearchPanel] 模型加载错误:', p.message);
        }
      });

      console.log('[SemanticSearchPanel] 模型初始化结果:', initSuccess);

      if (!initSuccess) {
        throw new Error('模型初始化失败');
      }

      // 2. 确保全局索引已构建
      if (globalManagerRef.current.messageIndex.size === 0) {
        console.log('[SemanticSearchPanel] 构建全局索引...');
        setProgress({ status: 'building', progress: 0, message: '构建消息索引...' });
        await globalManagerRef.current.buildGlobalIndex(files, processedData, currentFileIndex);
      }

      // 3. 提取消息并构建向量索引
      console.log('[SemanticSearchPanel] 提取消息...');
      const messages = extractMessagesForSemantic(globalManagerRef.current);
      console.log('[SemanticSearchPanel] 提取到消息数:', messages.length);

      console.log('[SemanticSearchPanel] 开始构建向量索引...');
      await semanticManagerRef.current.buildIndex(messages, setProgress);

      console.log('[SemanticSearchPanel] 全部完成！');
      setProgress({ status: 'ready', progress: 100, message: '准备就绪' });
      setIsModelReady(true);  // 索引构建完成，设置为就绪状态

      // 检查是否有待执行的搜索查询
      if (pendingQueryRef.current) {
        console.log('[SemanticSearchPanel] 执行待处理的搜索:', pendingQueryRef.current);
        const pendingQuery = pendingQueryRef.current;
        pendingQueryRef.current = null;
        // 使用 setTimeout 确保状态更新后再执行搜索
        setTimeout(() => {
          executePendingSearch(pendingQuery);
        }, 100);
      }
    } catch (error) {
      console.error('[SemanticSearchPanel] 初始化失败:', error);
      console.error('[SemanticSearchPanel] 错误堆栈:', error.stack);
      setProgress({ status: 'error', progress: 0, message: `初始化失败: ${error.message}` });
      setIsModelReady(false);
    } finally {
      setIsIndexing(false);
    }
  }, [files, processedData, currentFileIndex, isIndexing, isLoading]);

  // 执行语义搜索
  const performSearch = async (searchQuery) => {
    if (!semanticManagerRef.current?.isReady) {
      return [];
    }

    const results = await semanticManagerRef.current.search(searchQuery, 5);
    setSearchResults(results);
    return results;
  };

  // 调用 LLM 生成回答
  const callLLM = async (userQuery, context) => {
    if (llmConfig.provider === 'none' || !llmConfig.apiKey || !llmConfig.model) {
      return null;
    }

    // 添加模型到历史记录
    addModelToHistory(llmConfig.model);

    const prompt = `你是一个帮助用户回忆历史对话的助手。基于以下用户的历史对话记录，回答用户的问题。

用户问题：${userQuery}

相关历史对话：
${context}

请用简洁的语言总结相关内容，并指出具体是在哪次对话中讨论的（如果能确定平台和日期）。如果历史记录中没有相关内容，请诚实告知。`;

    try {
      if (llmConfig.provider === 'openai') {
        const endpoint = llmConfig.apiEndpoint || 'https://api.openai.com/v1';
        const response = await fetch(`${endpoint}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${llmConfig.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: llmConfig.model,
            messages: [
              { role: 'system', content: '你是一个帮助用户回忆历史对话的助手。' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7
          })
        });

        if (!response.ok) {
          throw new Error(`API 请求失败: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
      } else if (llmConfig.provider === 'claude') {
        const endpoint = llmConfig.apiEndpoint || 'https://api.anthropic.com/v1';
        const response = await fetch(`${endpoint}/messages`, {
          method: 'POST',
          headers: {
            'x-api-key': llmConfig.apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            model: llmConfig.model,
            max_tokens: 1024,
            messages: [
              { role: 'user', content: prompt }
            ]
          })
        });

        if (!response.ok) {
          throw new Error(`API 请求失败: ${response.status}`);
        }

        const data = await response.json();
        return data.content[0].text;
      }
    } catch (error) {
      console.error('[SemanticSearch] LLM 调用失败:', error);
      return `AI 回答生成失败: ${error.message}`;
    }

    return null;
  };

  // 执行搜索（内部函数，用于处理实际的搜索逻辑）
  const executeSearch = async (userQuery) => {
    setIsLoading(true);

    try {
      // 1. 语义搜索
      const results = await performSearch(userQuery);

      if (results.length === 0) {
        setChatHistory(prev => [...prev, {
          role: 'assistant',
          content: t('semanticSearch.chat.noResults'),
          results: [],
          timestamp: new Date().toISOString()
        }]);
      } else {
        // 2. 构建上下文
        const context = results
          .map((r, i) => `[${i + 1}] ${r.metadata.conversationName} (${r.metadata.sender}):\n${r.content.slice(0, 500)}`)
          .join('\n\n---\n\n');

        // 3. 调用 LLM（如果配置了）
        let aiResponse = null;
        if (llmConfig.provider !== 'none' && llmConfig.apiKey) {
          aiResponse = await callLLM(userQuery, context);
        }

        // 4. 添加助手回复
        setChatHistory(prev => [...prev, {
          role: 'assistant',
          content: aiResponse || t('semanticSearch.chat.resultsIntro'),
          results: results,
          timestamp: new Date().toISOString()
        }]);
      }
    } catch (error) {
      console.error('[SemanticSearch] 搜索失败:', error);
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: t('semanticSearch.chat.searchError', { error: error.message }),
        results: [],
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // 执行待处理的搜索（索引完成后调用）
  const executePendingSearch = (userQuery) => {
    console.log('[SemanticSearchPanel] 执行待处理搜索:', userQuery);
    // 移除等待提示消息
    setChatHistory(prev => prev.filter(msg => !msg.isPending));
    executeSearch(userQuery);
  };

  // 处理用户提问
  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!query.trim() || isLoading) return;

    const userQuery = query.trim();
    setQuery('');

    // 添加用户消息到历史
    setChatHistory(prev => [...prev, {
      role: 'user',
      content: userQuery,
      timestamp: new Date().toISOString()
    }]);

    // 如果索引还没完成，保存查询并启动索引
    if (!isModelReady) {
      console.log('[SemanticSearchPanel] 索引未完成，保存查询');
      pendingQueryRef.current = userQuery;

      // 根据状态显示不同的等待提示
      const waitingMessage = progress.status === 'waiting'
        ? t('semanticSearch.chat.waitingFiles')
        : t('semanticSearch.chat.waitingIndex');

      // 添加等待提示
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: waitingMessage,
        results: [],
        timestamp: new Date().toISOString(),
        isPending: true
      }]);

      // 如果不是等待状态，且还没开始索引，启动索引
      // 如果是等待状态，debounce 完成后会自动触发，这里不需要启动
      if (progress.status !== 'waiting' && !isIndexing) {
        initializeAndIndex();
      }
      return;
    }

    // 索引已完成，直接执行搜索
    await executeSearch(userQuery);
  };

  // 跳转到消息
  const handleResultClick = (result) => {
    if (onNavigateToMessage) {
      onNavigateToMessage({
        fileIndex: result.metadata.fileIndex,
        conversationUuid: result.metadata.conversationUuid,
        messageIndex: result.metadata.messageIndex,
        messageUuid: result.metadata.messageUuid,
        highlight: true
      });
      onClose?.();
    }
  };

  if (!isOpen) return null;

  const stats = semanticManagerRef.current?.getStats() || {};

  return (
    <div className="semantic-search-overlay" onClick={onClose}>
      <div
        className="semantic-search-panel"
        onClick={e => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        ref={panelRef}
      >
        {/* 头部 */}
        <div className="semantic-search-header">
          <h2>{t('semanticSearch.header')}</h2>
          <div className="header-actions">
            <button
              className="btn-icon"
              onClick={() => setShowSettings(!showSettings)}
              title={t('semanticSearch.settings')}
            >
              ⚙️
            </button>
            <button className="btn-icon" onClick={onClose}>×</button>
          </div>
        </div>

        {/* 设置面板 */}
        {showSettings && (
          <div className="semantic-settings">
            {/* Embedding 模型配置 */}
            <div className="setting-section">
              <div className="setting-section-title">{t('semanticSearch.embeddingModel.title')}</div>

              <div className="setting-group">
                <label>{t('semanticSearch.embeddingModel.apiUrl')}</label>
                <input
                  type="text"
                  placeholder={t('semanticSearch.embeddingModel.apiUrlPlaceholder')}
                  value={embeddingConfig.lmStudioUrl}
                  onChange={e => updateEmbeddingConfig({ lmStudioUrl: e.target.value })}
                />
              </div>
              <div className="setting-group">
                <label>{t('semanticSearch.embeddingModel.modelName')}</label>
                <input
                  type="text"
                  placeholder={t('semanticSearch.embeddingModel.modelNamePlaceholder')}
                  value={embeddingConfig.modelName}
                  onChange={e => updateEmbeddingConfig({ modelName: e.target.value })}
                />
              </div>
              <div className="setting-info">
                {t('semanticSearch.embeddingModel.infoLmstudio')}
              </div>
            </div>

            <div className="setting-divider"></div>

            {/* LLM 配置 */}
            <div className="setting-section">
              <div className="setting-section-title">{t('semanticSearch.llmConfig.title')}</div>

              <div className="setting-group">
                <label>{t('semanticSearch.llmConfig.provider')}</label>
                <select
                  value={llmConfig.provider}
                  onChange={e => setLlmConfig({ ...llmConfig, provider: e.target.value })}
                >
                  <option value="none">{t('semanticSearch.llmConfig.none')}</option>
                  <option value="openai">{t('semanticSearch.llmConfig.openai')}</option>
                  <option value="claude">{t('semanticSearch.llmConfig.claude')}</option>
                </select>
              </div>

              {llmConfig.provider !== 'none' && (
                <>
                  <div className="setting-group">
                    <label>{t('semanticSearch.llmConfig.apiEndpoint')}</label>
                    <input
                      type="text"
                      placeholder={t('semanticSearch.llmConfig.apiEndpointPlaceholder')}
                      value={llmConfig.apiEndpoint}
                      onChange={e => setLlmConfig({ ...llmConfig, apiEndpoint: e.target.value })}
                    />
                  </div>

                  <div className="setting-group">
                    <label>{t('semanticSearch.llmConfig.apiKey')}</label>
                    <input
                      type="password"
                      placeholder={t('semanticSearch.llmConfig.apiKeyPlaceholder')}
                      value={llmConfig.apiKey}
                      onChange={e => setLlmConfig({ ...llmConfig, apiKey: e.target.value })}
                    />
                  </div>

                  <div className="setting-group">
                    <label>{t('semanticSearch.llmConfig.model')}</label>
                    <input
                      type="text"
                      list="model-history"
                      placeholder={t('semanticSearch.llmConfig.modelPlaceholder')}
                      value={llmConfig.model}
                      onChange={e => setLlmConfig({ ...llmConfig, model: e.target.value })}
                    />
                    {llmConfig.modelHistory && llmConfig.modelHistory.length > 0 && (
                      <datalist id="model-history">
                        {llmConfig.modelHistory.map((model, idx) => (
                          <option key={idx} value={model} />
                        ))}
                      </datalist>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* 状态栏 */}
        <div className="semantic-status">
          {!isModelReady ? (
            <div className="status-init">
              {isIndexing && (
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
              )}
              <p
                className="status-message"
                style={{
                  color: progress.status === 'error' ? '#ef4444'
                       : progress.status === 'stale' ? '#f59e0b'
                       : progress.status === 'waiting' ? '#3b82f6'
                       : 'inherit'
                }}
              >
                {progress.message || `${embeddingConfig.lmStudioUrl}`}
              </p>
            </div>
          ) : (
            <div className="status-ready">
              <span className="status-badge">{t('semanticSearch.status.ready')}</span>
              <span className="status-info">
                {t('semanticSearch.status.embeddingInfo', { count: stats.indexSize || 0 })}
              </span>
            </div>
          )}
        </div>

        {/* 对话区域 */}
        <div className="semantic-chat" ref={chatContainerRef}>
          {chatHistory.length === 0 ? (
            <div className="chat-placeholder">
              <p>{t('semanticSearch.chat.greeting')}</p>
            </div>
          ) : (
            chatHistory.map((msg, idx) => (
              <div key={idx} className={`chat-message ${msg.role}`}>
                <div className="message-content">
                  {msg.content}
                </div>

                {/* 搜索结果 */}
                {msg.results && msg.results.length > 0 && (
                  <div className="search-results">
                    {msg.results.map((result, rIdx) => (
                      <div
                        key={rIdx}
                        className="result-card"
                        onClick={() => handleResultClick(result)}
                      >
                        <div className="result-header">
                          <span className="result-source">
                            {result.metadata.conversationName}
                          </span>
                          <span className="result-score">
                            {t('semanticSearch.results.score', { score: Math.round(result.score * 100) })}
                          </span>
                        </div>
                        <div className="result-preview">
                          {result.content.slice(0, 150)}...
                        </div>
                        <div className="result-meta">
                          <span>{result.metadata.sender}</span>
                          {result.metadata.timestamp && (
                            <span>{new Date(result.metadata.timestamp).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}

          {isLoading && (
            <div className="chat-message assistant loading">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
        </div>

        {/* 输入区域 */}
        <form className="semantic-input" onSubmit={handleSubmit}>
          <textarea
            ref={inputRef}
            placeholder={
              isModelReady
                ? t('semanticSearch.chat.placeholder')
                : progress.status === 'waiting'
                  ? t('semanticSearch.chat.placeholderWaiting')
                  : isIndexing
                    ? t('semanticSearch.chat.placeholderIndexing')
                    : t('semanticSearch.chat.placeholderNotReady')
            }
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
          >
            {isLoading ? '...' : isModelReady ? t('semanticSearch.chat.send') : t('semanticSearch.chat.search')}
          </button>
        </form>
      </div>
    </div>
  );
}
