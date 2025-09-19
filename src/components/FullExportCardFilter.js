// components/FullExportCardFilter.js
import React from 'react';

const FullExportCardFilter = ({
  filters,
  availableProjects,
  filterStats,
  onFilterChange,
  onReset,
  className = ""
}) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  return (
    <div className={`conversation-filter ${className}`}>
      {/* 筛选器面板 */}
      <div className="filter-panel">
        {/* 筛选器标题和重置按钮 */}
        <div className="filter-header">
          <div className="filter-title">
            <span className="filter-icon">🔍</span>
            <span className="filter-text">筛选对话</span>
            {filterStats.hasActiveFilters && (
              <span className="filter-badge">{filterStats.activeFilterCount}</span>
            )}
          </div>
          {filterStats.hasActiveFilters && (
            <button 
              className="btn-secondary small"
              onClick={onReset}
              title="清除所有筛选条件"
            >
              ✕ 清除筛选
            </button>
          )}
        </div>

        <div className="filter-sections">
          {/* 名称搜索 */}
          <div className="filter-section">
            <label className="filter-label">搜索对话</label>
            <input
              type="text"
              className="filter-input"
              placeholder="搜索对话名称或项目名称..."
              value={filters.name}
              onChange={(e) => onFilterChange('name', e.target.value)}
            />
          </div>

          {/* 时间范围 */}
          <div className="filter-section">
            <label className="filter-label">时间范围</label>
            <select
              className="filter-select"
              value={filters.dateRange}
              onChange={(e) => onFilterChange('dateRange', e.target.value)}
            >
              <option value="all">全部时间</option>
              <option value="today">今天</option>
              <option value="week">最近一周</option>
              <option value="month">最近一月</option>
              <option value="custom">自定义范围</option>
            </select>
          </div>

          {/* 自定义日期范围 */}
          {filters.dateRange === 'custom' && (
            <div className="filter-section date-range-section">
              <label className="filter-label">日期范围</label>
              <div className="date-range-inputs">
                <input
                  type="date"
                  className="filter-input date-input"
                  value={formatDate(filters.customDateStart)}
                  onChange={(e) => onFilterChange('customDateStart', e.target.value)}
                  title="开始日期"
                />
                <span className="date-separator">至</span>
                <input
                  type="date"
                  className="filter-input date-input"  
                  value={formatDate(filters.customDateEnd)}
                  onChange={(e) => onFilterChange('customDateEnd', e.target.value)}
                  title="结束日期"
                />
              </div>
            </div>
          )}

          {/* 项目筛选 */}
          <div className="filter-section">
            <label className="filter-label">项目</label>
            <select
              className="filter-select"
              value={filters.project}
              onChange={(e) => onFilterChange('project', e.target.value)}
            >
              <option value="all">全部项目</option>
              <option value="no_project">📄 无项目</option>
              {availableProjects.map(project => (
                <option key={project.uuid} value={project.uuid}>
                  📁 {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* 星标筛选 */}
          <div className="filter-section">
            <label className="filter-label">星标状态</label>
            <select
              className="filter-select"
              value={filters.starred}
              onChange={(e) => onFilterChange('starred', e.target.value)}
            >
              <option value="all">全部</option>
              <option value="starred">⭐ 已星标</option>
              <option value="unstarred">○ 未星标</option>
            </select>
          </div>
        </div>

        {/* 筛选统计 */}
        <div className="filter-footer">
          <div className="filter-stats">
            <span className="stats-text">
              显示 <strong>{filterStats.filtered}</strong> / {filterStats.total} 个对话
            </span>
            {filterStats.hasActiveFilters && (
              <span className="active-filters-text">
                （{filterStats.activeFilterCount} 个筛选条件生效）
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullExportCardFilter;