import React, { useState, useRef, useEffect } from 'react';
import { useI18n } from '../../index.js';
import StorageManager from '../../utils/storageManager';
import { DEFAULT_AI_CONFIG } from '../../config/aiConfig.js';

/**
 * AI Analysis Panel for whiteboard multi-select analysis.
 * Integrates with the existing ChatService API configuration.
 */
const AIAnalysisPanel = ({ selectedCards, onClose, nodes }) => {
  const { t } = useI18n();
  const [aiResponse, setAiResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const getConfig = () => {
    const saved = StorageManager.get('ai-chat-config', {});
    return {
      protocol: saved.protocol || DEFAULT_AI_CONFIG.anthropic.protocol,
      apiKey: saved.apiKey || '',
      baseUrl: saved.baseUrl || (saved.protocol === 'openai' ? DEFAULT_AI_CONFIG.openai.baseUrl : DEFAULT_AI_CONFIG.anthropic.baseUrl),
      model: saved.model || (saved.protocol === 'openai' ? DEFAULT_AI_CONFIG.openai.model : DEFAULT_AI_CONFIG.anthropic.model),
      maxTokens: saved.maxTokens || DEFAULT_AI_CONFIG.anthropic.maxTokens,
    };
  };

  const runAnalysis = async () => {
    const config = getConfig();
    if (!config.apiKey) {
      setError(t('whiteboard.aiPanel.noApiKey') || 'Please configure API key in Settings > AI Chat');
      return;
    }

    const selected = nodes.filter((m) => selectedCards.has(m.id));
    if (selected.length === 0) return;

    setLoading(true);
    setAiResponse('');
    setError(null);

    // Build analysis prompt
    const cardsText = selected.map((m) =>
      `[#${m.id} ${m.role}] ${m.fullContent || m.content}`
    ).join('\n\n---\n\n');

    const userPrompt = `请分析以下 ${selected.length} 条对话消息，提供主题聚类和路径分析：\n\n${cardsText}`;

    const isOpenAI = config.protocol === 'openai';
    abortRef.current = new AbortController();

    try {
      const headers = {
        'Content-Type': 'application/json',
      };

      let body;
      let url;

      if (isOpenAI) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
        url = `${config.baseUrl}/chat/completions`;
        body = JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: '你是一个对话分析助手。分析用户提供的对话片段，提供主题聚类、关键论点演化和路径分析。' },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: config.maxTokens,
          stream: true,
        });
      } else {
        headers['x-api-key'] = config.apiKey;
        headers['anthropic-version'] = '2023-06-01';
        headers['anthropic-dangerous-direct-browser-access'] = 'true';
        url = `${config.baseUrl}/messages`;
        body = JSON.stringify({
          model: config.model,
          max_tokens: config.maxTokens,
          system: '你是一个对话分析助手。分析用户提供的对话片段，提供主题聚类、关键论点演化和路径分析。',
          messages: [{ role: 'user', content: userPrompt }],
          stream: true,
        });
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;
          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              let text = '';
              if (isOpenAI) {
                text = parsed.choices?.[0]?.delta?.content || '';
              } else {
                if (parsed.type === 'content_block_delta') {
                  text = parsed.delta?.text || '';
                }
              }
              if (text) {
                fullText += text;
                setAiResponse(fullText);
              }
            } catch {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      if (!fullText) {
        setAiResponse(t('whiteboard.aiPanel.noResponse') || 'No response received.');
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('[AIAnalysisPanel] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const handleClose = () => {
    if (abortRef.current) abortRef.current.abort();
    onClose();
  };

  if (selectedCards.size === 0 && !aiResponse && !error) return null;

  const selectedNodes = nodes.filter((m) => selectedCards.has(m.id));

  return (
    <div className="whiteboard-ai-panel">
      <div className="whiteboard-ai-header">
        <span className="whiteboard-ai-title">
          {t('whiteboard.aiPanel.title')}
        </span>
        <button className="whiteboard-ai-close" onClick={handleClose}>✕</button>
      </div>

      <div className="whiteboard-ai-selection">
        <div className="whiteboard-ai-count">
          {t('whiteboard.aiPanel.selectedCards').replace('{{count}}', selectedCards.size)}
        </div>
        <div className="whiteboard-ai-chips">
          {selectedNodes.map((m) => (
            <span key={m.id} className="whiteboard-ai-chip">
              #{m.id} {m.role === 'user' ? '👤' : '🤖'}
            </span>
          ))}
        </div>
      </div>

      <div className="whiteboard-ai-actions">
        <button
          className="whiteboard-ai-analyze-btn"
          onClick={runAnalysis}
          disabled={loading || selectedCards.size === 0}
        >
          {loading
            ? (t('whiteboard.aiPanel.analyzing'))
            : (t('whiteboard.aiPanel.analyze'))
          }
        </button>
      </div>

      {error && (
        <div className="whiteboard-ai-response">
          <div className="whiteboard-ai-response-text" style={{ color: 'var(--accent-danger)' }}>
            {error}
          </div>
        </div>
      )}

      {aiResponse && (
        <div className="whiteboard-ai-response">
          <pre className="whiteboard-ai-response-text">{aiResponse}</pre>
        </div>
      )}

      {selectedCards.size === 0 && !aiResponse && !error && (
        <div className="whiteboard-ai-empty">
          {t('whiteboard.aiPanel.noSelection')}
        </div>
      )}
    </div>
  );
};

export default AIAnalysisPanel;
