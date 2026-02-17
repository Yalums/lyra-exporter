// components/FullExportCardFilter.js
import React, { useState, useEffect } from 'react';
import LanguageSwitcher from './LanguageSwitcher';
import { useI18n } from '../index.js';

const FullExportCardFilter = ({
  filters,
  availableProjects,
  availableOrganizations = [],
  filterStats,
  onFilterChange,
  onReset,
  onClearAllMarks,
  onExportProject,
  onImportProject,
  onRestoreStars,
  operatedCount = 0,
  disabled = false,
  className = "",
  sortField = 'created_at',
  sortOrder = 'desc',
  onSortChange = null
}) => {
  const { t } = useI18n();
  const [isMobile, setIsMobile] = useState(false);
  
  // 检测是否为移动端
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  // 智能日期同步处理
  const handleStartDateChange = (value) => {
    onFilterChange('customDateStart', value);
    
    // 如果结束日期为空或早于开始日期，自动设置为相同日期或稍后
    if (!filters.customDateEnd || new Date(value) > new Date(filters.customDateEnd)) {
      onFilterChange('customDateEnd', value);
    }
  };

  const handleEndDateChange = (value) => {
    onFilterChange('customDateEnd', value);
    
    // 如果开始日期为空或晚于结束日期，自动设置为相同日期或稍早
    if (!filters.customDateStart || new Date(value) < new Date(filters.customDateStart)) {
      onFilterChange('customDateStart', value);
    }
  };

  return (
    <div className={`conversation-filter ${disabled ? 'disabled' : ''} ${className}`} style={disabled ? { opacity: 0.6, pointerEvents: 'none' } : {}}>
      {/* Filter panel */}
      <div className="filter-panel">
        {/* Filter header and reset button */}
        <div className="filter-header">
          <div className="filter-title">
            <span className="filter-icon">🔍</span>
            <span className="filter-text">{t('filter.title')}</span>
            {filterStats.hasActiveFilters && (
              <span className="filter-badge">{filterStats.activeFilterCount}</span>
            )}
            {disabled && <span style={{ marginLeft: '8px', fontSize: '0.8em', color: '#666' }}>({t('common.loading') || 'Loading...'})</span>}
          </div>
          <div className="filter-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {onExportProject && (
              <button
                className="btn-secondary small"
                onClick={onExportProject}
                disabled={disabled}
                title={t('filter.actions.exportProjectTitle')}
              >
                💾 {t('filter.actions.exportProject')}
              </button>
            )}
            {onImportProject && (
              <button
                className="btn-secondary small"
                onClick={onImportProject}
                disabled={disabled}
                title={t('filter.actions.importProjectTitle')}
              >
                📁 {t('filter.actions.importProject')}
              </button>
            )}
            {filters.starred === 'starred' ? (
              <>
                {onRestoreStars && (
                  <button
                    className="btn-secondary small"
                    onClick={() => {
                      onRestoreStars();
                      onFilterChange('starred', 'all');
                    }}
                    disabled={disabled}
                    title={t('app.navbar.restoreStars')}
                  >
                    ⭐ {t('app.navbar.restoreStars')}
                  </button>
                )}
                <button
                  className="btn-secondary small"
                  onClick={onReset}
                  disabled={disabled}
                  title={t('filter.actions.clearAllFilters')}
                >
                  ✕ {t('filter.actions.clearFilters')}
                </button>
              </>
            ) : (
              <button
                className="btn-secondary small"
                onClick={() => onFilterChange('starred', 'starred')}
                disabled={disabled}
                title={t('filter.starred.label')}
              >
                ☆ {t('filter.starred.starred')}
              </button>
            )}
            {onClearAllMarks && operatedCount > 0 && (
              <button
                className="btn-secondary small"
                onClick={onClearAllMarks}
                disabled={disabled}
                title={t('filter.actions.clearAllMarksTitle', { count: operatedCount })}
              >
                🔄 {t('filter.actions.clearAllMarks')}
              </button>
            )}
          </div>
        </div>

        <div className={`filter-sections ${filters.dateRange === 'custom' ? 'has-custom-date' : ''}`}>
          {/* Name search */}
          <div className="filter-section">
            <label className="filter-label">{t('filter.search.label')}</label>
            <input
              type="text"
              className="filter-input"
              placeholder={t('filter.search.placeholder')}
              value={filters.name}
              onChange={(e) => onFilterChange('name', e.target.value)}
              disabled={disabled}
            />
          </div>

          {/* Time range - 单独占一行，以便自定义日期能在下一行 */}
          <div className="filter-section time-range-section">
            <label className="filter-label">{t('filter.timeRange.label')}</label>
            <select
              className="filter-select"
              value={filters.dateRange}
              onChange={(e) => onFilterChange('dateRange', e.target.value)}
              disabled={disabled}
            >
              <option value="all">{t('filter.timeRange.all')}</option>
              <option value="today">{t('filter.timeRange.today')}</option>
              <option value="week">{t('filter.timeRange.week')}</option>
              <option value="month">{t('filter.timeRange.month')}</option>
              <option value="custom">{t('filter.timeRange.custom')}</option>
            </select>
          </div>

          {/* Custom date range - 现在作为独立的行 */}
          {filters.dateRange === 'custom' && (
            <div className={`filter-section custom-date-section ${isMobile ? 'mobile' : 'desktop'}`}>
              <label className="filter-label">{t('filter.dateRange.label')}</label>
              <div className="date-range-inputs">
                <input
                  type="date"
                  className="filter-input date-input"
                  value={formatDate(filters.customDateStart)}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  title={t('filter.dateRange.startDate')}
                  placeholder={t('filter.dateRange.startDate')}
                  disabled={disabled}
                />
                {!isMobile && (
                  <span className="date-separator">{t('filter.dateRange.to')}</span>
                )}
                <input
                  type="date"
                  className="filter-input date-input"
                  value={formatDate(filters.customDateEnd)}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  title={t('filter.dateRange.endDate')}
                  placeholder={t('filter.dateRange.endDate')}
                  disabled={disabled}
                />
              </div>
            </div>
          )}

          {/* Project filter */}
          <div className="filter-section">
            <label className="filter-label">{t('filter.project.label')}</label>
            <select
              className="filter-select"
              value={filters.project}
              onChange={(e) => onFilterChange('project', e.target.value)}
              disabled={disabled}
            >
              <option value="all">{t('filter.project.all')}</option>
              <option value="no_project">📄 {t('filter.project.none')}</option>
              {availableProjects.map(project => (
                <option key={project.uuid} value={project.uuid}>
                  📁 {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Organization filter */}
          <div className="filter-section">
            <label className="filter-label">{t('filter.organization.label')}</label>
            <select
              className="filter-select"
              value={filters.organization || 'all'}
              onChange={(e) => onFilterChange('organization', e.target.value)}
              disabled={disabled}
            >
              <option value="all">{t('filter.organization.all')}</option>
              <option value="no_organization">📄 {t('filter.organization.none')}</option>
              {availableOrganizations.map(org => (
                <option key={org.id} value={org.id}>
                  🏢 {org.name}
                </option>
              ))}
            </select>
          </div>

          {/* Operation status filter */}
          <div className="filter-section">
            <label className="filter-label">{t('filter.operated.label')}</label>
            <select
              className="filter-select"
              value={filters.operated || 'all'}
              onChange={(e) => onFilterChange('operated', e.target.value)}
              disabled={disabled}
            >
              <option value="all">{t('filter.operated.all')}</option>
              <option value="operated">✏️ {t('filter.operated.hasOperations')}</option>
              <option value="unoperated">○ {t('filter.operated.noOperations')}</option>
            </select>
          </div>

          {/* Sort field */}
          {onSortChange && (
            <div className="filter-section">
              <label className="filter-label">{t('filter.sort.label')}</label>
              <select
                className="filter-select"
                value={`${sortField}:${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split(':');
                  onSortChange(field, order);
                }}
                disabled={disabled}
              >
                <option value="created_at:desc">{t('filter.sort.createdAt')} ↓</option>
                <option value="created_at:asc">{t('filter.sort.createdAt')} ↑</option>
                <option value="name:asc">{t('filter.sort.name')} ↑</option>
                <option value="name:desc">{t('filter.sort.name')} ↓</option>
                <option value="messageCount:desc">{t('filter.sort.messageCount')} ↓</option>
                <option value="messageCount:asc">{t('filter.sort.messageCount')} ↑</option>
                <option value="size:desc">{t('filter.sort.size')} ↓</option>
                <option value="size:asc">{t('filter.sort.size')} ↑</option>
              </select>
            </div>
          )}
        </div>

        {/* Filter statistics */}
        <div className="filter-footer">
          <div className="filter-stats">
            <span className="stats-text">
              {t('filter.stats.showing')} <strong>{filterStats.filtered}</strong> / {filterStats.total} {t('filter.stats.conversations')}
            </span>
            {filterStats.hasActiveFilters && (
              <span className="active-filters-text">
                ({t('filter.stats.activeFilters', { count: filterStats.activeFilterCount })})
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullExportCardFilter;