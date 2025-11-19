import React from 'react';

// 导入图标文件
import claudeIcon from '../assets/icons/Claude.svg';
import geminiIcon from '../assets/icons/Gemini.svg';
import notebooklmIcon from '../assets/icons/NotebookLM.svg';
import chatgptIcon from '../assets/icons/ChatGPT.svg';
import sillyTavernIcon from '../assets/icons/SillyTavern.png';

// 平台图标映射
const PLATFORM_ICONS = {
  claude: claudeIcon,
  gemini: geminiIcon,
  notebooklm: notebooklmIcon,
  jsonl_chat: sillyTavernIcon,
  chatgpt: chatgptIcon
};

// 需要白色背景的图标
const NEEDS_WHITE_BG = ['chatgpt', 'gemini'];

const PlatformIcon = ({ platform, format, size = 16, style = {} }) => {
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
      return 'jsonl_chat';
    }
    if (format === 'chatgpt' || platform === 'chatgpt') {
      return 'chatgpt';
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
          backgroundColor: '#ffffff',
          verticalAlign: 'middle',
          ...style
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
};

export default PlatformIcon;
