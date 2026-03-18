// components/SystemContextCard.js
// 第零卡片：展示 System Context 入口，点击后在右侧 MessageDetail 面板显示详情

import React from 'react';

const SystemContextCard = ({ exportContext, isSelected, onSelect }) => {
  if (!exportContext) return null;
  const { projectInfo, userMemory, stContext } = exportContext;
  if (!projectInfo && !userMemory && !stContext) return null;

  // 生成摘要标签
  const parts = [];
  if (projectInfo?.description) parts.push('Description');
  if (projectInfo?.instructions) parts.push('Instructions');
  if (projectInfo?.memory) parts.push('Memory');
  if (projectInfo?.knowledgeFiles?.length > 0)
    parts.push(`Knowledge (${projectInfo.knowledgeFiles.length})`);
  if (userMemory?.preferences) parts.push('Preferences');
  if (userMemory?.memories) parts.push('User Memories');

  // SillyTavern context summary
  if (stContext) {
    if (stContext.character?.name) parts.push(stContext.character.name);
    const lorebookCount =
      (stContext.characterBook?.entries?.length || 0) +
      Object.values(stContext.worldBooks || {}).reduce((s, wb) => s + (wb.entries?.length || 0), 0);
    if (lorebookCount > 0) parts.push(`Lorebook (${lorebookCount})`);
    if (stContext.persona?.name) parts.push(`Persona: ${stContext.persona.name}`);
    if (stContext.instructPreset?.name) parts.push(stContext.instructPreset.name);
  }

  if (parts.length === 0) return null;

  const displayName = projectInfo?.name || stContext?.character?.name;

  return (
    <div
      className={`system-context-inline${isSelected ? ' selected' : ''}`}
      onClick={onSelect}
    >
      <div className="system-context-header">
        <div className="system-context-title">
          <span>Info</span>
          {displayName && (
            <span className="system-context-project-name"> — {displayName}</span>
          )}
        </div>
        <div className="system-context-summary">{parts.join(' · ')}</div>
      </div>
    </div>
  );
};

export default React.memo(SystemContextCard);
