// components/ExportPanel.js
import React, { useState, useEffect, useRef } from 'react';
import { getAllMarksStats } from '../utils/data/markManager';
import { generateFileCardUuid, generateConversationCardUuid } from '../utils/data/uuidManager';

const ExportPanel = ({
  isOpen,
  onClose,
  exportOptions,
  setExportOptions,
  viewMode,
  currentBranchState,
  operatedFiles,
  files,
  stats,
  starManagerRef,
  shouldUseStarSystem,
  isFullExportConversationMode,
  allCards,
  processedData,
  currentFileIndex,
  onExport,
  t
}) => {
  // 手势支持
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const panelRef = useRef(null);

  // 浏览器回退支持
  useEffect(() => {
    if (!isOpen) return;

    // 添加 history 记录
    window.history.pushState({ view: 'export-panel' }, '');

    const handlePopState = () => {
      onClose();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, onClose]);

  // 手势处理
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    // 同时记录 X 和 Y 坐标
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const onTouchMove = (e) => {
    // 同时记录 X 和 Y 坐标
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;

    // 计算绝对距离
    const absDistanceX = Math.abs(distanceX);
    const absDistanceY = Math.abs(distanceY);

    // 只有当水平移动距离 > 垂直移动距离，且水平移动距离 > 阈值时，才判定为水平滑动
    const isHorizontalSwipe = absDistanceX > absDistanceY && absDistanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;

    // 右滑关闭面板（需要满足水平滑动条件）
    if (isHorizontalSwipe && isRightSwipe) {
      handleBackClick();
    }
  };

  // 处理返回按钮点击
  const handleBackClick = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  const markStats = getAllMarksStats(
    files,
    processedData,
    currentFileIndex,
    generateFileCardUuid,
    generateConversationCardUuid
  );

  return (
    <div className="modal-overlay" onClick={handleBackClick}>
      <div
        className="modal-content export-modal"
        onClick={e => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        ref={panelRef}
      >
        <div className="modal-header">
          <h2>{t('app.export.title')}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="export-options">
          {/* 导出格式选择 */}
          <div className="option-group">
            <h3>{t('app.export.format.title')}</h3>
            <label className="radio-option">
              <input
                type="radio"
                name="exportFormat"
                value="markdown"
                checked={exportOptions.exportFormat === 'markdown'}
                onChange={(e) => setExportOptions({...exportOptions, exportFormat: e.target.value})}
              />
              <div className="option-label">
                <span>{t('app.export.format.markdown')}</span>
                <span className="option-description">
                  {t('app.export.format.markdownDesc')}
                </span>
              </div>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="exportFormat"
                value="screenshot"
                checked={exportOptions.exportFormat === 'screenshot'}
                onChange={(e) => setExportOptions({...exportOptions, exportFormat: e.target.value})}
              />
              <div className="option-label">
                <span>{t('app.export.format.screenshot')}</span>
                <span className="option-description">
                  {t('app.export.format.screenshotDesc')}
                </span>
              </div>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="exportFormat"
                value="pdf"
                checked={exportOptions.exportFormat === 'pdf'}
                onChange={(e) => setExportOptions({...exportOptions, exportFormat: e.target.value})}
              />
              <div className="option-label">
                <span>{t('app.export.format.pdf')}</span>
                <span className="option-description">
                  {t('app.export.format.pdfDesc')}
                </span>
              </div>
            </label>
          </div>

          {/* PDF 页面格式选择 - 仅在选中 PDF 时显示 */}
          {exportOptions.exportFormat === 'pdf' && (
            <div className="option-group">
              <h3>PDF</h3>
              <label className="radio-option">
                <input
                  type="radio"
                  name="pageFormat"
                  value="a4"
                  checked={exportOptions.pageFormat === 'a4' || !exportOptions.pageFormat}
                  onChange={(e) => setExportOptions({...exportOptions, pageFormat: e.target.value})}
                />
                <div className="option-label">
                  <span>A4</span>
                  <span className="option-description">
                    210mm × 297mm {t('app.export.pageFormat.standard')}
                  </span>
                </div>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="pageFormat"
                  value="letter"
                  checked={exportOptions.pageFormat === 'letter'}
                  onChange={(e) => setExportOptions({...exportOptions, pageFormat: e.target.value})}
                />
                <div className="option-label">
                  <span>Letter</span>
                  <span className="option-description">
                    8.5" × 11" (215.9mm × 279.4mm) {t('app.export.pageFormat.northAmerica')}
                  </span>
                </div>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="pageFormat"
                  value="supernote"
                  checked={exportOptions.pageFormat === 'supernote'}
                  onChange={(e) => setExportOptions({...exportOptions, pageFormat: e.target.value})}
                />
                <div className="option-label">
                  <span>Supernote Manta</span>
                  <span className="option-description">
                    227mm × 303mm (10.7" @ 300 PPI) {t('app.export.pageFormat.supernote')}
                  </span>
                </div>
              </label>
            </div>
          )}

          <div className="option-group">
            <h3>{t('app.export.scope.title')}</h3>
            <label className="radio-option">
              <input
                type="radio"
                name="scope"
                value="currentBranch"
                checked={exportOptions.scope === 'currentBranch'}
                onChange={(e) => setExportOptions({...exportOptions, scope: e.target.value})}
                disabled={viewMode !== 'timeline' || currentBranchState.showAllBranches}
              />
              <div className="option-label">
                <span>{t('app.export.scope.currentBranch')}</span>
                {viewMode === 'timeline' ? (
                  currentBranchState.showAllBranches ? (
                    <span className="hint">{t('app.export.scope.hint.showAllBranches')}</span>
                  ) : (
                    <span className="option-description">
                      {t('app.export.scope.currentBranchDesc')}
                    </span>
                  )
                ) : (
                  <span className="hint">{t('app.export.scope.hint.enterTimeline')}</span>
                )}
              </div>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="scope"
                value="current"
                checked={exportOptions.scope === 'current'}
                onChange={(e) => setExportOptions({...exportOptions, scope: e.target.value})}
                disabled={viewMode !== 'timeline'}
              />
              <div className="option-label">
                <span>{t('app.export.scope.current')}</span>
                {viewMode === 'timeline' ? (
                  <span className="option-description">
                    {t('app.export.scope.currentDesc')}
                  </span>
                ) : (
                  <span className="hint">{t('app.export.scope.hint.enterTimeline')}</span>
                )}
              </div>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="scope"
                value="operated"
                checked={exportOptions.scope === 'operated'}
                onChange={(e) => setExportOptions({...exportOptions, scope: e.target.value})}
                disabled={operatedFiles.size === 0}
              />
              <div className="option-label">
                <span>{t('app.export.scope.operated')} <span className="option-count">({operatedFiles.size}个)</span></span>
                {operatedFiles.size > 0 ? (
                  <span className="option-description">
                    {t('app.export.scope.operatedDesc')}
                  </span>
                ) : (
                  <span className="hint">{t('app.export.scope.hint.markFirst')}</span>
                )}
              </div>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="scope"
                value="all"
                checked={exportOptions.scope === 'all'}
                onChange={(e) => setExportOptions({...exportOptions, scope: e.target.value})}
              />
              <div className="option-label">
                <span>{t('app.export.scope.all')} <span className="option-count">({files.length}个)</span></span>
                <span className="option-description">
                  {t('app.export.scope.allDesc')}
                </span>
              </div>
            </label>
          </div>

          <div className="option-group">
            <h3>{t('app.export.filters.title')}</h3>
            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={exportOptions.excludeDeleted}
                onChange={(e) => setExportOptions({...exportOptions, excludeDeleted: e.target.checked})}
              />
              <div className="option-label">
                <span>{t('app.export.filters.excludeDeleted')}</span>
                <span className="option-description">
                  {t('app.export.filters.excludeDeletedDesc')}
                </span>
              </div>
            </label>
            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={exportOptions.includeCompleted}
                onChange={(e) => setExportOptions({...exportOptions, includeCompleted: e.target.checked})}
              />
              <div className="option-label">
                <span>{t('app.export.filters.includeCompleted')}</span>
                <span className="option-description">
                  {t('app.export.filters.includeCompletedDesc')}
                </span>
              </div>
            </label>
            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={exportOptions.includeImportant}
                onChange={(e) => setExportOptions({...exportOptions, includeImportant: e.target.checked})}
              />
              <div className="option-label">
                <span>{t('app.export.filters.includeImportant')}</span>
                <span className="option-description">
                  {t('app.export.filters.includeImportantDesc')}{exportOptions.includeCompleted && exportOptions.includeImportant ? t('app.export.filters.importantAndCompleted') : ''}
                </span>
              </div>
            </label>
          </div>
        </div>

        <div className="export-info">
          <div className="info-row">
            <span className="label">{t('app.export.stats.files')}</span>
            <span className="value">{t('app.export.stats.filesDesc', {
              fileCount: files.length,
              conversationCount: stats.conversationCount,
              totalMessages: stats.totalMessages
            })}</span>
          </div>
          <div className="info-row">
            <span className="label">{t('app.export.stats.marks')}</span>
            <span className="value">
              {t('app.export.stats.marksDesc', {
                completed: markStats.completed,
                important: markStats.important,
                deleted: markStats.deleted
              })}
            </span>
          </div>
          {isFullExportConversationMode && shouldUseStarSystem && starManagerRef?.current && (
            <div className="info-row">
              <span className="label">{t('app.export.stats.stars')}</span>
              <span className="value">
                {t('app.export.stats.starsDesc', {
                  starred: starManagerRef.current.getStarStats(allCards.filter(card => card.type === 'conversation')).totalStarred
                })}
              </span>
            </div>
          )}
          <div className="info-row">
            <span className="label">{t('app.export.stats.content')}</span>
            <span className="value">
              {t('app.export.stats.contentDesc', {
                settings: [
                  exportOptions.includeTimestamps && t('settings.exportContent.timestamps.label'),
                  exportOptions.includeThinking && t('settings.exportContent.thinking.label'),
                  exportOptions.includeArtifacts && t('settings.exportContent.artifacts.label'),
                  exportOptions.includeTools && t('settings.exportContent.tools.label'),
                  exportOptions.includeCitations && t('settings.exportContent.citations.label')
                ].filter(Boolean).join(' · ') || t('app.export.stats.basicOnly')
              })}
            </span>
          </div>
        </div>

        <div className="modal-buttons">
          <button className="btn-secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn-primary" onClick={onExport}>
            {exportOptions.exportFormat === 'screenshot'
              ? t('app.export.previewAndExport')
              : exportOptions.exportFormat === 'pdf'
              ? t('app.export.exportToPDF')
              : t('app.export.exportToMarkdown')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportPanel;
