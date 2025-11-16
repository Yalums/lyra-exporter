// components/FullExportCardFilter.js
import React, { useState, useEffect } from 'react';
import LanguageSwitcher from './LanguageSwitcher';
import { useI18n } from '../index.js';

const FullExportCardFilter = ({
  filters,
  availableProjects,
  filterStats,
  onFilterChange,
  onReset,
  onClearAllMarks,
  operatedCount = 0,
  className = ""
}) => {
  const { t } = useI18n();
  const [isMobile, setIsMobile] = useState(false);
  
  // 检测是否为移动端
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
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
    <div className={`conversation-filter ${className}`}>
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
          </div>
          <div className="filter-actions" style={{ display: 'flex', gap: '8px' }}>
            {filterStats.hasActiveFilters && (
              <button 
                className="btn-secondary small"
                onClick={onReset}
                title={t('filter.actions.clearAllFilters')}
              >
                ✕ {t('filter.actions.clearFilters')}
              </button>
            )}
            {onClearAllMarks && operatedCount > 0 && (
              <button 
                className="btn-secondary small"
                onClick={onClearAllMarks}
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
            />
          </div>

          {/* Time range - 单独占一行，以便自定义日期能在下一行 */}
          <div className="filter-section time-range-section">
            <label className="filter-label">{t('filter.timeRange.label')}</label>
            <select
              className="filter-select"
              value={filters.dateRange}
              onChange={(e) => onFilterChange('dateRange', e.target.value)}
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

          {/* Star filter */}
          <div className="filter-section">
            <label className="filter-label">{t('filter.starred.label')}</label>
            <select
              className="filter-select"
              value={filters.starred}
              onChange={(e) => onFilterChange('starred', e.target.value)}
            >
              <option value="all">{t('filter.starred.all')}</option>
              <option value="starred">⭐ {t('filter.starred.starred')}</option>
              <option value="unstarred">○ {t('filter.starred.unstarred')}</option>
            </select>
          </div>

          {/* Operation status filter */}
          <div className="filter-section">
            <label className="filter-label">{t('filter.operated.label')}</label>
            <select
              className="filter-select"
              value={filters.operated || 'all'}
              onChange={(e) => onFilterChange('operated', e.target.value)}
            >
              <option value="all">{t('filter.operated.all')}</option>
              <option value="operated">✏️ {t('filter.operated.hasOperations')}</option>
              <option value="unoperated">○ {t('filter.operated.noOperations')}</option>
            </select>
          </div>
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