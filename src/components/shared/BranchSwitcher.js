// components/shared/BranchSwitcher.js
// 从 ConversationTimeline.js 提取的独立分支切换器组件
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useI18n } from '../../index.js';

const BranchSwitcher = ({
  branchPoint,
  availableBranches,
  currentBranchIndex,
  onBranchChange,
  onShowAllBranches,
  showAllMode = false,
  className = ""
}) => {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);
  const [switchAnimation, setSwitchAnimation] = useState(false);
  const [listPosition, setListPosition] = useState({ top: 0, left: 0, width: 0 });
  const switcherRef = useRef(null);
  const listRef = useRef(null);
  const switchTimeoutRef = useRef(null); // 用于清理 setTimeout

  // 清理 setTimeout
  useEffect(() => {
    return () => {
      if (switchTimeoutRef.current) {
        clearTimeout(switchTimeoutRef.current);
      }
    };
  }, []);

  const currentBranch = availableBranches[currentBranchIndex];
  const hasPrevious = currentBranchIndex > 0;
  const hasNext = currentBranchIndex < availableBranches.length - 1;

  // 计算弹出列表位置
  useEffect(() => {
    if (isExpanded && switcherRef.current) {
      const rect = switcherRef.current.getBoundingClientRect();
      setListPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width
      });
    }
  }, [isExpanded]);

  // 点击外部关闭
  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (e) => {
      // 检查是否点击了切换器或列表
      const clickedSwitcher = switcherRef.current && switcherRef.current.contains(e.target);
      const clickedList = listRef.current && listRef.current.contains(e.target);

      if (!clickedSwitcher && !clickedList) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded]);

  const handlePrevious = () => {
    if (hasPrevious) {
      setSwitchAnimation(true);
      if (switchTimeoutRef.current) clearTimeout(switchTimeoutRef.current);
      switchTimeoutRef.current = setTimeout(() => {
        onBranchChange(currentBranchIndex - 1);
        setSwitchAnimation(false);
      }, 150);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      setSwitchAnimation(true);
      if (switchTimeoutRef.current) clearTimeout(switchTimeoutRef.current);
      switchTimeoutRef.current = setTimeout(() => {
        onBranchChange(currentBranchIndex + 1);
        setSwitchAnimation(false);
      }, 150);
    }
  };

  const handleDirectSwitch = (index) => {
    if (index !== currentBranchIndex) {
      setSwitchAnimation(true);
      if (switchTimeoutRef.current) clearTimeout(switchTimeoutRef.current);
      switchTimeoutRef.current = setTimeout(() => {
        onBranchChange(index);
        setSwitchAnimation(false);
        setIsExpanded(false);
      }, 150);
    }
  };

  const getBranchDisplayName = (branch, index) => {
    return index === 0 ? t('timeline.branch.mainBranch') : t('timeline.branch.branch') + ` ${index}`;
  };

  const getBranchPreview = (branch) => {
    return branch?.preview || '...';
  };

  const getBranchCounter = () => {
    if (showAllMode) return `${t('timeline.branch.all')}/${availableBranches.length}`;
    return `${currentBranchIndex + 1}/${availableBranches.length}`;
  };

  if (!showAllMode && !currentBranch) return null;

  return (
    <>
      <div className={`branch-switcher ${className}`} ref={switcherRef}>
        <div className="branch-switcher-main">
          {/* 左箭头 */}
          <button
            className={`branch-arrow branch-arrow-left ${!hasPrevious ? 'disabled' : ''}`}
            onClick={handlePrevious}
            disabled={!hasPrevious}
            title={t('timeline.branch.previousBranch')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M10 12l-4-4 4-4v8z" />
            </svg>
          </button>

          {/* 分支信息区域 */}
          <div
            className={`branch-info ${switchAnimation ? 'switching' : ''}`}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="branch-info-main">
              <span className="branch-name">
                {getBranchDisplayName(currentBranch, currentBranchIndex)}
              </span>
              <span className="branch-counter">
                {getBranchCounter()}
              </span>
            </div>

            <div className="branch-preview">
              {getBranchPreview(currentBranch)}
            </div>

            {/* 展开指示器 */}
            {availableBranches.length > 2 && (
              <div className={`expand-indicator ${isExpanded ? 'expanded' : ''}`}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M6 8L2 4h8l-4 4z" />
                </svg>
              </div>
            )}
          </div>

          {/* 右箭头 */}
          <button
            className={`branch-arrow branch-arrow-right ${!hasNext ? 'disabled' : ''}`}
            onClick={handleNext}
            disabled={!hasNext}
            title={t('timeline.branch.nextBranch')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6 4l4 4-4 4V4z" />
            </svg>
          </button>
        </div>
      </div>

      {/* 展开的分支列表 - 使用 Portal */}
      {isExpanded && availableBranches.length > 2 && ReactDOM.createPortal(
        <div
          ref={listRef}
          className="branch-list branch-list-portal"
          style={{
            position: 'fixed',
            top: `${listPosition.top}px`,
            left: `${listPosition.left}px`,
            width: `${listPosition.width}px`,
            zIndex: 99999
          }}
        >
          {/* 显示全部分支选项 */}
          <div
            className={`branch-option ${showAllMode ? 'active' : ''}`}
            onClick={() => {
              if (onShowAllBranches) onShowAllBranches();
              setIsExpanded(false);
            }}
          >
            <div className="branch-option-header">
              <span className="branch-option-name">{t('timeline.branch.showAllBranches')}</span>
              <span className="branch-option-count">{t('timeline.branch.allMessages')}</span>
            </div>
            <div className="branch-option-preview">{t('timeline.branch.showMessagesFromAllBranches')}</div>
          </div>

          {/* 各个分支选项 */}
          {availableBranches.map((branch, index) => (
            <div
              key={`${branchPoint.uuid}-branch-${index}`}
              className={`branch-option ${!showAllMode && index === currentBranchIndex ? 'active' : ''}`}
              onClick={() => handleDirectSwitch(index)}
            >
              <div className="branch-option-header">
                <span className="branch-option-name">
                  {getBranchDisplayName(branch, index)}
                </span>
                <span className="branch-option-count">
                  {branch.segmentCount} {t('timeline.branch.messages')} (Total {branch.messageCount})
                </span>
              </div>
              <div className="branch-option-preview">
                {getBranchPreview(branch)}
              </div>
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
};

export default React.memo(BranchSwitcher);
