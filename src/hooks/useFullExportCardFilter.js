// hooks/useFullExportCardFilter.js
import { useState, useMemo, useCallback } from 'react';

export const useFullExportCardFilter = (conversations = []) => {
  const [filters, setFilters] = useState({
    name: '',
    dateRange: 'all', // 'all', 'today', 'week', 'month', 'custom'
    customDateStart: '',
    customDateEnd: '',
    project: 'all', // 'all', 'no_project', or specific project uuid
    starred: 'all' // 'all', 'starred', 'unstarred'
  });

  // 获取所有可用的项目
  const availableProjects = useMemo(() => {
    const projects = new Map();
    conversations.forEach(conv => {
      if (conv.project && conv.project.uuid) {
        projects.set(conv.project.uuid, conv.project);
      }
    });
    return Array.from(projects.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [conversations]);

  // 筛选逻辑
  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      // 名称筛选
      if (filters.name.trim()) {
        const nameMatch = conv.name?.toLowerCase().includes(filters.name.toLowerCase());
        const projectMatch = conv.project?.name?.toLowerCase().includes(filters.name.toLowerCase());
        if (!nameMatch && !projectMatch) return false;
      }

      // 项目筛选
      if (filters.project !== 'all') {
        if (filters.project === 'no_project') {
          if (conv.project && conv.project.uuid) return false;
        } else {
          if (!conv.project || conv.project.uuid !== filters.project) return false;
        }
      }

      // 星标筛选
      if (filters.starred !== 'all') {
        if (filters.starred === 'starred' && !conv.is_starred) return false;
        if (filters.starred === 'unstarred' && conv.is_starred) return false;
      }

      // 日期筛选
      if (filters.dateRange !== 'all' && conv.created_at) {
        try {
          const convDate = new Date(conv.created_at);
          const now = new Date();
          
          switch (filters.dateRange) {
            case 'today':
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const convDay = new Date(convDate.getFullYear(), convDate.getMonth(), convDate.getDate());
              if (convDay.getTime() !== today.getTime()) return false;
              break;
            case 'week':
              const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              if (convDate < weekAgo) return false;
              break;
            case 'month':
              const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              if (convDate < monthAgo) return false;
              break;
            case 'custom':
              if (filters.customDateStart) {
                const startDate = new Date(filters.customDateStart);
                if (convDate < startDate) return false;
              }
              if (filters.customDateEnd) {
                const endDate = new Date(filters.customDateEnd + 'T23:59:59');
                if (convDate > endDate) return false;
              }
              break;
          }
        } catch (error) {
          console.warn('日期解析失败:', conv.created_at);
        }
      }

      return true;
    });
  }, [conversations, filters]);

  // 设置单个筛选器
  const setFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // 批量设置筛选器
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // 重置筛选器
  const resetFilters = useCallback(() => {
    setFilters({
      name: '',
      dateRange: 'all',
      customDateStart: '',
      customDateEnd: '',
      project: 'all',
      starred: 'all'
    });
  }, []);

  // 获取筛选统计
  const filterStats = useMemo(() => {
    const hasActiveFilters = filters.name.trim() || 
                           filters.dateRange !== 'all' || 
                           filters.project !== 'all' || 
                           filters.starred !== 'all';
    
    return {
      total: conversations.length,
      filtered: filteredConversations.length,
      hasActiveFilters,
      activeFilterCount: [
        filters.name.trim(),
        filters.dateRange !== 'all',
        filters.project !== 'all',
        filters.starred !== 'all'
      ].filter(Boolean).length
    };
  }, [conversations.length, filteredConversations.length, filters]);

  // 获取筛选器摘要文本
  const getFilterSummary = useCallback(() => {
    const parts = [];
    
    if (filters.name.trim()) {
      parts.push(`名称: "${filters.name}"`);
    }
    
    if (filters.dateRange !== 'all') {
      const dateLabels = {
        today: '今天',
        week: '最近一周',
        month: '最近一月',
        custom: '自定义时间'
      };
      parts.push(`时间: ${dateLabels[filters.dateRange] || filters.dateRange}`);
    }
    
    if (filters.project !== 'all') {
      if (filters.project === 'no_project') {
        parts.push('项目: 无项目');
      } else {
        const project = availableProjects.find(p => p.uuid === filters.project);
        parts.push(`项目: ${project?.name || '未知项目'}`);
      }
    }
    
    if (filters.starred !== 'all') {
      parts.push(`星标: ${filters.starred === 'starred' ? '已星标' : '未星标'}`);
    }
    
    return parts.join(', ');
  }, [filters, availableProjects]);

  return {
    filters,
    filteredConversations,
    availableProjects,
    filterStats,
    actions: {
      setFilter,
      updateFilters,
      resetFilters,
      getFilterSummary
    }
  };
};