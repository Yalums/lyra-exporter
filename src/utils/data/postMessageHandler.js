// data/postMessageHandler.js
// 跨窗口通信处理器

import { ValidationUtils } from '../../App';

/**
 * PostMessage处理器类
 * 处理来自浏览器扩展或其他窗口的消息
 */
export class PostMessageHandler {
  constructor(fileActions, setError) {
    this.fileActions = fileActions;
    this.setError = setError;
    this.handleMessage = this.handleMessage.bind(this);
  }

  handleMessage(event) {
    this.logMessage(event);

    // 安全验证
    if (!ValidationUtils.isAllowedOrigin(event.origin)) {
      console.warn('[Lyra Exporter] 拒绝来自未知源的消息:', event.origin);
      return;
    }

    const { type, source, data } = event.data || {};

    // 处理握手
    if (type === 'LYRA_HANDSHAKE' && source === 'lyra-fetch-script') {
      this.handleHandshake(event);
      return;
    }

    // 处理数据加载
    if (type === 'LYRA_LOAD_DATA' && source === 'lyra-fetch-script') {
      this.handleDataLoad(event.data.data);
      return;
    }
  }

  logMessage(event) {
    console.log('[Lyra Exporter] 收到消息:', {
      origin: event.origin,
      type: event.data?.type,
      source: event.data?.source,
      hasData: !!event.data
    });
  }

  handleHandshake(event) {
    console.log('[Lyra Exporter] 收到握手请求');

    try {
      event.source.postMessage({
        type: 'LYRA_READY',
        source: 'lyra-exporter'
      }, event.origin);

      console.log('[Lyra Exporter] 已发送握手响应');
    } catch (error) {
      console.error('[Lyra Exporter] 握手响应失败:', error);
    }
  }

  handleDataLoad(data) {
    console.log('[Lyra Exporter] 处理数据加载');

    try {
      const { content, filename } = data;

      if (!content) {
        throw new Error('没有收到内容数据');
      }

      const file = this.createFileFromContent(content, filename);
      this.fileActions.loadFiles([file]);

      console.log('[Lyra Exporter] 成功加载数据:', filename);
      this.setError(null);

    } catch (error) {
      console.error('[Lyra Exporter] 处理数据失败:', error);
      this.setError('加载数据失败: ' + error.message);
    }
  }

  createFileFromContent(content, filename = 'imported_conversation.json') {
    const jsonData = typeof content === 'string' ? content : JSON.stringify(content);
    const blob = new Blob([jsonData], { type: 'application/json' });

    return new File([blob], filename, {
      type: 'application/json',
      lastModified: Date.now()
    });
  }

  setup() {
    console.log('[Lyra Exporter] 设置 postMessage 监听器');
    window.addEventListener('message', this.handleMessage);

    return () => {
      console.log('[Lyra Exporter] 移除 postMessage 监听器');
      window.removeEventListener('message', this.handleMessage);
    };
  }
}

/**
 * Hook封装
 */
export function usePostMessageHandler(fileActions, setError) {
  const handler = new PostMessageHandler(fileActions, setError);

  return {
    setup: () => handler.setup(),
    handleMessage: handler.handleMessage
  };
}
