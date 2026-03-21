// components/FullExportCardFilter.js
import React, { useState, useEffect } from 'react';
import { FileArchive, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { useI18n } from '../index.js';

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth <= breakpoint
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
}

const FullExportCardFilter = ({
  filters, availableProjects, availableOrganizations = [], filterStats,
  onFilterChange, onReset, onClearAllMarks, onImportProject, onRestoreStars,
  operatedCount = 0, disabled = false, className = "",
  sortField = 'created_at', sortOrder = 'desc', onSortChange = null,
  hasZipData = false, onZipImport = null, onZipSync = null,
  onOpenSingleJson = null, onImportFolder = null
}) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [filterExpanded, setFilterExpanded] = useState(!isMobile);
  useEffect(() => { setFilterExpanded(!isMobile); }, [isMobile]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try { return new Date(dateStr).toISOString().split('T')[0]; } catch { return ''; }
  };
  const handleStartDateChange = (value) => {
    onFilterChange('customDateStart', value);
    if (!filters.customDateEnd || new Date(value) > new Date(filters.customDateEnd))
      onFilterChange('customDateEnd', value);
  };
  const handleEndDateChange = (value) => {
    onFilterChange('customDateEnd', value);
    if (!filters.customDateStart || new Date(value) < new Date(filters.customDateStart))
      onFilterChange('customDateStart', value);
  };
  // stopPropagation wrapper for buttons inside clickable header
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };

  return (
    <div className={`conversation-filter ${disabled ? 'disabled' : ''} ${className}`} style={disabled ? { opacity: 0.6, pointerEvents: 'none' } : {}}>
      <div className="filter-panel">
        {/* Header — 移动端可点击折叠 */}
        <div className="filter-header"
          onClick={isMobile ? () => setFilterExpanded(v => !v) : undefined}
          style={isMobile ? { cursor: 'pointer', userSelect: 'none' } : undefined}
        >
          <div className="filter-title">
            <span className="filter-icon">🔍</span>
            <span className="filter-text">{t('filter.title')}</span>
            {filterStats.hasActiveFilters && <span className="filter-badge">{filterStats.activeFilterCount}</span>}
            {disabled && <span style={{ marginLeft: 8, fontSize: '0.8em', color: '#666' }}>({t('common.loading') || 'Loading...'})</span>}
            {isMobile && <span style={{ marginLeft: 6, display: 'inline-flex', alignItems: 'center', color: 'var(--text-tertiary)' }}>
              {filterExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
            </span>}
          </div>
          <div className="filter-actions" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {onImportProject && <button className="btn-secondary small" onClick={stop(onImportProject)} disabled={disabled} title={t('filter.actions.importProjectTitle')}>📁 {t('filter.actions.importProject')}</button>}
            {filters.starred === 'starred' ? (<>
              {onRestoreStars && <button className="btn-secondary small" onClick={stop(() => { onRestoreStars(); onFilterChange('starred','all'); })} disabled={disabled} title={t('app.navbar.restoreStars')}>⭐ {t('app.navbar.restoreStars')}</button>}
              <button className="btn-secondary small" onClick={stop(onReset)} disabled={disabled} title={t('filter.actions.clearAllFilters')}>✕ {t('filter.actions.clearFilters')}</button>
            </>) : (
              <button className="btn-secondary small" onClick={stop(() => onFilterChange('starred','starred'))} disabled={disabled} title={t('filter.starred.label')}>☆ {t('filter.starred.starred')}</button>
            )}
            {onZipImport && <button className="btn-secondary small" onClick={stop(onZipImport)} disabled={disabled} title={t('filter.actions.importZip')||'导入压缩包'}><FileArchive size={14} style={{marginRight:4,verticalAlign:'middle'}}/>{t('filter.actions.importZip')||'导入'}</button>}
            {onImportFolder && <button className="btn-secondary small" onClick={stop(onImportFolder)} disabled={disabled} title={t('filter.actions.importFolderTitle')||'导入文件夹'}>📂 {t('filter.actions.importFolder')||'导入文件夹'}</button>}
            {onOpenSingleJson && <button className="btn-secondary small" onClick={stop(onOpenSingleJson)} disabled={disabled} title={t('filter.actions.openJsonTitle')||'打开JSON'}>📄 {t('filter.actions.openJson')||'打开 JSON'}</button>}
            {hasZipData && onZipSync && <button className="btn-secondary small" onClick={stop(onZipSync)} disabled={disabled} title={t('filter.actions.sync')||'同步'}><RefreshCw size={14} style={{marginRight:4,verticalAlign:'middle'}}/>{t('filter.actions.sync')||'同步'}</button>}
            {onClearAllMarks && operatedCount > 0 && <button className="btn-secondary small" onClick={stop(onClearAllMarks)} disabled={disabled} title={t('filter.actions.clearAllMarksTitle',{count:operatedCount})}>🔄 {t('filter.actions.clearAllMarks')}</button>}
          </div>
        </div>

        {/* 筛选区域 — 移动端可折叠 */}
        {filterExpanded && (
        <div className={`filter-sections ${filters.dateRange === 'custom' ? 'has-custom-date' : ''}`}>
          <div className="filter-section">
            <label className="filter-label">{t('filter.search.label')}</label>
            <input type="text" className="filter-input" placeholder={t('filter.search.placeholder')} value={filters.name} onChange={(e) => onFilterChange('name', e.target.value)} disabled={disabled}/>
          </div>
          <div className="filter-section time-range-section">
            <label className="filter-label">{t('filter.timeRange.label')}</label>
            <select className="filter-select" value={filters.dateRange} onChange={(e) => onFilterChange('dateRange', e.target.value)} disabled={disabled}>
              <option value="all">{t('filter.timeRange.all')}</option>
              <option value="today">{t('filter.timeRange.today')}</option>
              <option value="week">{t('filter.timeRange.week')}</option>
              <option value="month">{t('filter.timeRange.month')}</option>
              <option value="custom">{t('filter.timeRange.custom')}</option>
            </select>
          </div>
          {filters.dateRange === 'custom' && (
            <div className="filter-section custom-date-section">
              <label className="filter-label">{t('filter.dateRange.label')}</label>
              <div className="date-range-inputs">
                <input type="date" className="filter-input date-input" value={formatDate(filters.customDateStart)} onChange={(e) => handleStartDateChange(e.target.value)} title={t('filter.dateRange.startDate')} disabled={disabled}/>
                <span className="date-separator">{t('filter.dateRange.to')}</span>
                <input type="date" className="filter-input date-input" value={formatDate(filters.customDateEnd)} onChange={(e) => handleEndDateChange(e.target.value)} title={t('filter.dateRange.endDate')} disabled={disabled}/>
              </div>
            </div>
          )}
          <div className="filter-section">
            <label className="filter-label">{t('filter.project.label')}</label>
            <select className="filter-select" value={filters.project} onChange={(e) => onFilterChange('project', e.target.value)} disabled={disabled}>
              <option value="all">{t('filter.project.all')}</option>
              <option value="no_project">📄 {t('filter.project.none')}</option>
              {availableProjects.map(p => <option key={p.uuid} value={p.uuid}>📁 {p.name}</option>)}
            </select>
          </div>
          <div className="filter-section">
            <label className="filter-label">{t('filter.organization.label')}</label>
            <select className="filter-select" value={filters.organization||'all'} onChange={(e) => onFilterChange('organization', e.target.value)} disabled={disabled}>
              <option value="all">{t('filter.organization.all')}</option>
              <option value="no_organization">📄 {t('filter.organization.none')}</option>
              {availableOrganizations.map(o => <option key={o.id} value={o.id}>🏢 {o.name}</option>)}
            </select>
          </div>
          <div className="filter-section">
            <label className="filter-label">{t('filter.operated.label')}</label>
            <select className="filter-select" value={filters.operated||'all'} onChange={(e) => onFilterChange('operated', e.target.value)} disabled={disabled}>
              <option value="all">{t('filter.operated.all')}</option>
              <option value="operated">✏️ {t('filter.operated.hasOperations')}</option>
              <option value="unoperated">○ {t('filter.operated.noOperations')}</option>
            </select>
          </div>
          {onSortChange && (
            <div className="filter-section">
              <label className="filter-label">{t('filter.sort.label')}</label>
              <select className="filter-select" value={`${sortField}:${sortOrder}`} onChange={(e) => { const [f,o]=e.target.value.split(':'); onSortChange(f,o); }} disabled={disabled}>
                <option value="created_at:desc">{t('filter.sort.createdAt')} ↓</option>
                <option value="created_at:asc">{t('filter.sort.createdAt')} ↑</option>
                <option value="name:asc">{t('filter.sort.name')} ↑</option>
                <option value="name:desc">{t('filter.sort.name')} ↓</option>
                {hasZipData && <option value="messageCount:desc">{t('filter.sort.messageCount')} ↓</option>}
                {hasZipData && <option value="messageCount:asc">{t('filter.sort.messageCount')} ↑</option>}
                {hasZipData && <option value="size:desc">{t('filter.sort.size')} ↓</option>}
                {hasZipData && <option value="size:asc">{t('filter.sort.size')} ↑</option>}
              </select>
            </div>
          )}
        </div>
        )}

        <div className="filter-footer">
          <div className="filter-stats">
            <span className="stats-text">{t('filter.stats.showing')} <strong>{filterStats.filtered}</strong> / {filterStats.total} {t('filter.stats.conversations')}</span>
            {filterStats.hasActiveFilters && <span className="active-filters-text">({t('filter.stats.activeFilters',{count:filterStats.activeFilterCount})})</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullExportCardFilter;
