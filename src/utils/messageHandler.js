// utils/messageHandler.js
// postMessage处理器模块

// 创建postMessage处理函数
export const createPostMessageHandler = (fileActions, setError) => {
  return async (event) => {
    console.log('[Lyra Exporter] 收到任何 postMessage:', {
      origin: event.origin,
      type: event.data?.type,
      source: event.data?.source,
      hasData: !!event.data
    });
    
    // 安全检查：只接受来自特定域名的消息
    const allowedOrigins = [
      'https://claude.ai',
      'https://pro.easychat.top',
      'https://gemini.google.com',
      'https://notebooklm.google.com',
      'https://aistudio.google.com',
      'http://localhost:3789',
      'https://yalums.github.io'
    ];
    
    const isAllowedOrigin = allowedOrigins.some(origin => event.origin === origin) ||
                           event.origin.includes('localhost') || 
                           event.origin.includes('127.0.0.1');
    
    if (!isAllowedOrigin) {
      console.warn('[Lyra Exporter] 拒绝来自未知源的消息:', event.origin);
      return;
    }
    
    // 处理握手请求
    if (event.data?.type === 'LYRA_HANDSHAKE' && event.data?.source === 'lyra-fetch-script') {
      console.log('[Lyra Exporter] 收到 Lyra Fetch 脚本的握手请求');
      
      try {
        event.source.postMessage({
          type: 'LYRA_READY',
          source: 'lyra-exporter'
        }, event.origin);
        
        console.log('[Lyra Exporter] 已发送 LYRA_READY 响应到:', event.origin);
      } catch (error) {
        console.error('[Lyra Exporter] 发送握手响应失败:', error);
      }
      return;
    }
    
    // 处理数据加载请求
    if (event.data?.type === 'LYRA_LOAD_DATA' && event.data?.source === 'lyra-fetch-script') {
      console.log('[Lyra Exporter] 收到 Lyra Fetch 脚本的数据:', {
        hasContent: !!event.data.data?.content,
        filename: event.data.data?.filename,
        contentLength: event.data.data?.content?.length
      });
      
      try {
        const { content, filename } = event.data.data;
        
        if (!content) {
          throw new Error('没有收到内容数据');
        }
        
        // 将 JSON 字符串转换为 File 对象
        const jsonData = typeof content === 'string' ? content : JSON.stringify(content);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const file = new File([blob], filename || 'imported_conversation.json', {
          type: 'application/json',
          lastModified: Date.now()
        });
        
        console.log('[Lyra Exporter] 创建的文件对象:', {
          name: file.name,
          size: file.size,
          type: file.type
        });
        
        // 使用 fileActions.loadFiles 加载文件
        fileActions.loadFiles([file]);
        
        console.log('[Lyra Exporter] 成功加载来自 Lyra Fetch 的数据:', filename);
        
        setError(null);
        
      } catch (error) {
        console.error('[Lyra Exporter] 处理 Lyra Fetch 数据时出错:', error);
        setError('加载数据失败: ' + error.message);
      }
    }
  };
};

// 设置和清理postMessage监听器
export const usePostMessageListener = (handlePostMessage) => {
  const setupListener = () => {
    console.log('[Lyra Exporter] 设置 postMessage 监听器');
    window.addEventListener('message', handlePostMessage);
    
    return () => {
      console.log('[Lyra Exporter] 移除 postMessage 监听器');
      window.removeEventListener('message', handlePostMessage);
    };
  };
  
  return setupListener;
};
