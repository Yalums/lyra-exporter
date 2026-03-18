import React from 'react';

// 导入图标文件
import claudeIcon from '../assets/icons/Claude.svg';
import geminiIcon from '../assets/icons/Gemini.svg';
import notebooklmIcon from '../assets/icons/NotebookLM.svg';
import chatgptIcon from '../assets/icons/ChatGPT.svg';
import sillyTavernIcon from '../assets/icons/SillyTavern.png';
import grokIcon from '../assets/icons/Grok.svg';
import copilotIcon from '../assets/icons/Copilot.svg';
import minimaxIcon from '../assets/icons/minimax.svg';
import kimiIcon from '../assets/icons/kimi.svg';
import glmIcon from '../assets/icons/glm.svg';
import deepseekIcon from '../assets/icons/deepseek.svg';

// 平台图标映射
const PLATFORM_ICONS = {
  claude: claudeIcon,
  claude_code: claudeIcon,
  gemini: geminiIcon,
  notebooklm: notebooklmIcon,
  jsonl_chat: sillyTavernIcon,
  chatgpt: chatgptIcon,
  grok: grokIcon,
  copilot: copilotIcon,
  minimax: minimaxIcon,
  kimi: kimiIcon,
  glm: glmIcon,
  deepseek: deepseekIcon,
};

// 需要白色背景的图标
const NEEDS_WHITE_BG = ['chatgpt', 'gemini', 'grok', 'copilot', 'minimax', 'kimi', 'glm', 'deepseek'];

// 根据 JSONL 消息的 model_id 字符串推断图标 key（可导出供外部判断）
export const inferJsonlModelKey = (modelId) => {
  if (!modelId) return null;
  const m = modelId.toLowerCase();
  if (m.includes('minimax')) return 'minimax';
  if (m.includes('kimi')) return 'kimi';
  if (m.includes('glm')) return 'glm';
  if (m.includes('deepseek')) return 'deepseek';
  if (m.includes('gemini')) return 'gemini';
  if (m.includes('gpt') || m.includes('chatgpt') || m.includes('o1') || m.includes('o3') || m.includes('o4')) return 'chatgpt';
  if (m.includes('grok')) return 'grok';
  if (m.includes('claude')) return 'claude';
  if (m.includes('copilot')) return 'copilot';
  return null;
};

const PlatformIcon = React.memo(({ platform, format, size = 16, style = {}, modelId }) => {
  // 根据format和platform确定使用哪个图标
  const getIconKey = () => {
    if (format === 'gemini_notebooklm') {
      if (platform === 'notebooklm') return 'notebooklm';
      // 支持多种 Gemini 平台名称
      if (platform === 'gemini' || platform === 'aistudio' || platform === 'google ai studio') {
        return 'gemini';
      }
      return 'gemini'; // 默认为gemini
    }
    if (format === 'jsonl_chat') {
      // 优先根据单条消息的 model_id 推断图标
      const inferred = inferJsonlModelKey(modelId);
      if (inferred) return inferred;
      return 'jsonl_chat';
    }
    if (format === 'chatgpt' || platform === 'chatgpt') {
      return 'chatgpt';
    }
    if (format === 'grok' || platform === 'grok') {
      return 'grok';
    }
    if (format === 'copilot' || platform === 'copilot') {
      return 'copilot';
    }
    if (format === 'claude_code' || platform === 'claude_code') {
      return 'claude_code';
    }
    return 'claude'; // 默认为claude
  };

  const iconKey = getIconKey();
  const iconSrc = PLATFORM_ICONS[iconKey];
  const needsWhiteBg = NEEDS_WHITE_BG.includes(iconKey);

  // 如果需要白色背景，用容器包裹
  if (needsWhiteBg) {
    const containerSize = size * 1.5;
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: containerSize,
          height: containerSize,
          borderRadius: '50%',
          verticalAlign: 'middle',
          ...style,
          backgroundColor: '#ffffff',  // 强制白底，不允许外部覆盖
        }}
      >
        <img
          src={iconSrc}
          alt={iconKey}
          style={{
            width: size,
            height: size,
            display: 'block'
          }}
        />
      </span>
    );
  }

  return (
    <img
      src={iconSrc}
      alt={iconKey}
      style={{
        width: size,
        height: size,
        display: 'inline-block',
        verticalAlign: 'middle',
        borderRadius: '2px',
        ...style
      }}
    />
  );
});

PlatformIcon.displayName = 'PlatformIcon';

export default PlatformIcon;
