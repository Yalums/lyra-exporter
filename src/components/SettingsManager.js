// components/SettingsManager.js
// Ubuntu风格双栏设置面板 - 统一管理所有设置

import React, { useState, useEffect, useRef } from 'react';
import { ThemeUtils } from '../utils/themeManager';
import { StorageUtils } from '../App';
import { CopyConfigManager } from '../utils/copyManager';
import LanguageSwitcher from './LanguageSwitcher';
import { useI18n } from '../index.js';
import StorageManager from '../utils/storageManager';

// AI Chat相关导入
import { chatService, useMCPService } from '../ai-chat/index.js';

// 导入共享AI配置
import { DEFAULT_AI_CONFIG } from '../config/aiConfig.js';

/**
 * 导出配置管理器
 */
const ExportConfigManager = {
  CONFIG_KEY: 'export-config',

  getConfig() {
    return StorageUtils.getLocalStorage(this.CONFIG_KEY, {
      // 格式设置
      includeNumbering: true,
      numberingFormat: 'numeric',
      senderFormat: 'default',
      humanLabel: 'Human',
      assistantLabel: 'Assistant',
      includeHeaderPrefix: true,
      headerLevel: 2,
      thinkingFormat: 'codeblock',

      // 内容设置
      includeTimestamps: false,
      includeThinking: false,
      includeArtifacts: true,
      includeCanvas: true,
      includeTools: false,
      includeCitations: false,
      includeAttachments: true
    });
  },

  saveConfig(config) {
    StorageUtils.setLocalStorage(this.CONFIG_KEY, config);
  }
};

/**
 * 左侧导航项配置
 */
const NAV_ITEMS = [
  { id: 'general', icon: '', labelKey: 'settings.nav.general' },
  { id: 'export', icon: '', labelKey: 'settings.nav.export' },
  { id: 'ai', icon: '', labelKey: 'settings.nav.ai' },
  { id: 'about', icon: '', labelKey: 'settings.nav.about' }
];

/**
 * Ubuntu风格双栏设置面板
 */
const SettingsPanel = ({ isOpen, onClose, exportOptions, setExportOptions }) => {
  const { t } = useI18n();
  const [activeSection, setActiveSection] = useState('general');
  const panelRef = useRef(null);

  // 手势支持
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // 设置状态
  const [settings, setSettings] = useState({
    theme: 'dark',
    language: 'zh-CN',
    deviceMode: 'auto', // 'auto' | 'mobile' | 'desktop'
    copyOptions: {
      includeThinking: false,
      includeArtifacts: false,
      includeCanvas: false,
      includeMetadata: true,
      includeAttachments: true
    },
    searchOptions: {
      removeDuplicates: true,
      includeThinking: true,
      includeArtifacts: true
    },
    exportOptions: {
      includeNumbering: true,
      numberingFormat: 'numeric',
      senderFormat: 'default',
      humanLabel: 'Human',
      assistantLabel: 'Assistant',
      includeHeaderPrefix: true,
      headerLevel: 2,
      thinkingFormat: 'codeblock',
      includeTimestamps: false,
      includeThinking: false,
      includeArtifacts: true,
      includeCanvas: true,
      includeTools: false,
      includeCitations: false,
      includeAttachments: true
    },
    aiChatConfig: {
      ...DEFAULT_AI_CONFIG.anthropic,
      apiKey: ''
    },
    embeddingConfig: {
      provider: 'lmstudio',
      lmStudioUrl: 'http://localhost:1234',
      modelName: 'qwen3-embedding'
    }
  });

  // 使用 ref 保存 onClose，避免 useEffect 因 onClose 变化而重复执行
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  // 浏览器回退支持
  useEffect(() => {
    if (!isOpen) return;
    window.history.pushState({ view: 'settings-panel' }, '');

    const handlePopState = () => onCloseRef.current();
    window.addEventListener('popstate', handlePopState);

    return () => window.removeEventListener('popstate', handlePopState);
  }, [isOpen]);

  // 初始化设置
  useEffect(() => {
    if (isOpen) {
      const storedSearchOptions = StorageManager.get('search-options');
      const storedAiChatConfig = StorageManager.get('ai-chat-config');
      const storedEmbeddingConfig = StorageManager.get('semantic-embedding-config');

      setSettings({
        theme: ThemeUtils.getCurrentTheme(),
        language: StorageUtils.getLocalStorage('app-language', 'en-US'),
        deviceMode: StorageUtils.getLocalStorage('device-mode', 'auto'),
        copyOptions: CopyConfigManager.getConfig(),
        searchOptions: storedSearchOptions || {
          removeDuplicates: true,
          includeThinking: true,
          includeArtifacts: true
        },
        exportOptions: ExportConfigManager.getConfig(),
        aiChatConfig: storedAiChatConfig || {
          ...DEFAULT_AI_CONFIG.anthropic,
          apiKey: ''
        },
        embeddingConfig: storedEmbeddingConfig || {
          provider: 'lmstudio',
          lmStudioUrl: 'http://localhost:1234',
          modelName: 'qwen3-embedding'
        }
      });
    }
  }, [isOpen]);

  // 手势处理
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const onTouchMove = (e) => {
    setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const absDistanceX = Math.abs(distanceX);
    const absDistanceY = Math.abs(distanceY);
    const isHorizontalSwipe = absDistanceX > absDistanceY && absDistanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;

    if (isHorizontalSwipe && isRightSwipe) {
      handleBackClick();
    }
  };

  const handleBackClick = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      onClose();
    }
  };

  // 处理设置更改
  const handleThemeChange = () => {
    const newTheme = ThemeUtils.toggleTheme();
    setSettings(prev => ({ ...prev, theme: newTheme }));
  };

  const handleCopyOptionChange = (option, value) => {
    const newOptions = { ...settings.copyOptions, [option]: value };
    CopyConfigManager.saveConfig(newOptions);
    setSettings(prev => ({ ...prev, copyOptions: newOptions }));
  };

  const handleSearchOptionChange = (option, value) => {
    const newOptions = { ...settings.searchOptions, [option]: value };
    StorageManager.set('search-options', newOptions);
    setSettings(prev => ({ ...prev, searchOptions: newOptions }));
  };

  const handleExportOptionChange = (option, value, additionalUpdates = {}) => {
    const newOptions = { ...settings.exportOptions, [option]: value, ...additionalUpdates };

    if (option === 'senderFormat') {
      if (value === 'human-assistant') {
        newOptions.humanLabel = 'Human';
        newOptions.assistantLabel = 'Assistant';
      } else if (value === 'default') {
        newOptions.humanLabel = 'Human';
        newOptions.assistantLabel = 'Claude';
      }
    }

    ExportConfigManager.saveConfig(newOptions);
    setSettings(prev => ({ ...prev, exportOptions: newOptions }));

    if (setExportOptions && ['includeTimestamps', 'includeThinking', 'includeArtifacts', 'includeCanvas', 'includeTools', 'includeCitations', 'includeAttachments'].includes(option)) {
      setExportOptions(prev => ({ ...prev, [option]: value }));
    }
  };

  const handleLanguageChange = (language) => {
    StorageUtils.setLocalStorage('app-language', language);
    setSettings(prev => ({ ...prev, language }));
  };

  const handleDeviceModeChange = (deviceMode) => {
    StorageUtils.setLocalStorage('device-mode', deviceMode);
    setSettings(prev => ({ ...prev, deviceMode }));
    // 触发自定义事件通知其他组件
    window.dispatchEvent(new CustomEvent('deviceModeChange', { detail: { deviceMode } }));
  };

  const handleAIChatConfigChange = (updates) => {
    const newConfig = { ...settings.aiChatConfig, ...updates };
    StorageManager.set('ai-chat-config', newConfig);
    setSettings(prev => ({ ...prev, aiChatConfig: newConfig }));

    // 同步到chatService
    if (typeof chatService !== 'undefined' && chatService.configure) {
      chatService.configure(newConfig);
    }
  };

  const handleEmbeddingConfigChange = (updates) => {
    const newConfig = { ...settings.embeddingConfig, ...updates };
    StorageManager.set('semantic-embedding-config', newConfig);
    setSettings(prev => ({ ...prev, embeddingConfig: newConfig }));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleBackClick}>
      <div
        className="settings-panel-ubuntu"
        onClick={e => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        ref={panelRef}
      >
        {/* 顶部标题栏 */}
        <div className="settings-header">
          <h2>{t('settings.title')}</h2>
          <button className="close-btn" onClick={handleBackClick}>×</button>
        </div>

        {/* 双栏布局 */}
        <div className="settings-body">
          {/* 左侧导航 */}
          <nav className="settings-nav">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
                onClick={() => setActiveSection(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{t(item.labelKey)}</span>
              </button>
            ))}
          </nav>

          {/* 右侧内容区 */}
          <div className="settings-content">
            {activeSection === 'general' && (
              <GeneralSettings
                settings={settings}
                onThemeChange={handleThemeChange}
                onLanguageChange={handleLanguageChange}
                onDeviceModeChange={handleDeviceModeChange}
                onCopyOptionChange={handleCopyOptionChange}
                onSearchOptionChange={handleSearchOptionChange}
              />
            )}

            {activeSection === 'export' && (
              <ExportSettings
                settings={settings}
                onExportOptionChange={handleExportOptionChange}
              />
            )}

            {activeSection === 'ai' && (
              <AISettings
                settings={settings}
                onAIChatConfigChange={handleAIChatConfigChange}
                onEmbeddingConfigChange={handleEmbeddingConfigChange}
              />
            )}

            {activeSection === 'about' && <AboutSection />}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 通用设置面板
 */
const GeneralSettings = ({ settings, onThemeChange, onLanguageChange, onDeviceModeChange, onCopyOptionChange, onSearchOptionChange }) => {
  const { t } = useI18n();

  return (
    <div className="settings-section-content">
      <SettingsSection title={t('settings.appearance.title')}>
        <SettingItem label={t('settings.appearance.theme.label')} description={t('settings.appearance.theme.description')}>
          <ThemeToggle theme={settings.theme} onToggle={onThemeChange} />
        </SettingItem>

        <SettingItem label={t('settings.appearance.language.label')} description={t('settings.appearance.language.description')}>
          <LanguageSwitcher
            variant="compact"
            showText={true}
            className="settings-language-switcher"
            onLanguageChange={onLanguageChange}
          />
        </SettingItem>

        <SettingItem label={t('settings.appearance.deviceMode.label')} description={t('settings.appearance.deviceMode.description')}>
          <select
            className="setting-select"
            value={settings.deviceMode}
            onChange={(e) => onDeviceModeChange(e.target.value)}
          >
            <option value="auto">{t('settings.appearance.deviceMode.auto')}</option>
            <option value="mobile">{t('settings.appearance.deviceMode.mobile')}</option>
            <option value="desktop">{t('settings.appearance.deviceMode.desktop')}</option>
          </select>
        </SettingItem>
      </SettingsSection>

      <SettingsSection title={t('settings.copyOptions.title')}>
        <CheckboxSetting
          label={t('settings.copyOptions.includeMetadata.label')}
          description={t('settings.copyOptions.includeMetadata.description')}
          checked={settings.copyOptions.includeMetadata}
          onChange={(checked) => onCopyOptionChange('includeMetadata', checked)}
        />
        <CheckboxSetting
          label={t('settings.copyOptions.includeThinking.label')}
          description={t('settings.copyOptions.includeThinking.description')}
          checked={settings.copyOptions.includeThinking}
          onChange={(checked) => onCopyOptionChange('includeThinking', checked)}
        />
        <CheckboxSetting
          label={t('settings.copyOptions.includeArtifacts.label')}
          description={t('settings.copyOptions.includeArtifacts.description')}
          checked={settings.copyOptions.includeArtifacts}
          onChange={(checked) => onCopyOptionChange('includeArtifacts', checked)}
        />
        <CheckboxSetting
          label={t('settings.copyOptions.includeCanvas.label')}
          description={t('settings.copyOptions.includeCanvas.description')}
          checked={settings.copyOptions.includeCanvas}
          onChange={(checked) => onCopyOptionChange('includeCanvas', checked)}
        />
        <CheckboxSetting
          label={t('settings.copyOptions.includeAttachments.label')}
          description={t('settings.copyOptions.includeAttachments.description')}
          checked={settings.copyOptions.includeAttachments}
          onChange={(checked) => onCopyOptionChange('includeAttachments', checked)}
        />
      </SettingsSection>

      <SettingsSection title={t('settings.searchOptions.title')}>
        <CheckboxSetting
          label={t('settings.searchOptions.removeDuplicates.label')}
          description={t('settings.searchOptions.removeDuplicates.description')}
          checked={settings.searchOptions.removeDuplicates}
          onChange={(checked) => onSearchOptionChange('removeDuplicates', checked)}
        />
        <CheckboxSetting
          label={t('settings.searchOptions.includeThinking.label')}
          description={t('settings.searchOptions.includeThinking.description')}
          checked={settings.searchOptions.includeThinking}
          onChange={(checked) => onSearchOptionChange('includeThinking', checked)}
        />
        <CheckboxSetting
          label={t('settings.searchOptions.includeArtifacts.label')}
          description={t('settings.searchOptions.includeArtifacts.description')}
          checked={settings.searchOptions.includeArtifacts}
          onChange={(checked) => onSearchOptionChange('includeArtifacts', checked)}
        />
      </SettingsSection>
    </div>
  );
};

/**
 * 导出设置面板
 */
const ExportSettings = ({ settings, onExportOptionChange }) => {
  const { t } = useI18n();

  const getFullFormatPreview = () => {
    const { exportOptions } = settings;
    let humanPreview = '';
    if (exportOptions.includeHeaderPrefix) {
      humanPreview += '#'.repeat(exportOptions.headerLevel) + ' ';
    }
    if (exportOptions.includeNumbering) {
      if (exportOptions.numberingFormat === 'numeric') humanPreview += '1. ';
      else if (exportOptions.numberingFormat === 'letter') humanPreview += 'A. ';
      else if (exportOptions.numberingFormat === 'roman') humanPreview += 'I. ';
    }
    humanPreview += exportOptions.humanLabel;

    let assistantPreview = '';
    if (exportOptions.includeHeaderPrefix) {
      assistantPreview += '#'.repeat(exportOptions.headerLevel) + ' ';
    }
    if (exportOptions.includeNumbering) {
      if (exportOptions.numberingFormat === 'numeric') assistantPreview += '2. ';
      else if (exportOptions.numberingFormat === 'letter') assistantPreview += 'B. ';
      else if (exportOptions.numberingFormat === 'roman') assistantPreview += 'II. ';
    }
    assistantPreview += exportOptions.assistantLabel;

    return [humanPreview, assistantPreview];
  };

  const [humanPreview, assistantPreview] = getFullFormatPreview();

  return (
    <div className="settings-section-content">
      <SettingsSection title={t('settings.exportFormat.title')}>
        <SettingItem label={t('settings.exportFormat.preview.label')} description={t('settings.exportFormat.preview.description')} static={true}>
          <div className="format-preview">
            <div className="preview-item">
              <code>{humanPreview}</code>
              <span className="preview-label">{t('settings.exportFormat.preview.userMessage')}</span>
            </div>
            <div className="preview-item">
              <code>{assistantPreview}</code>
              <span className="preview-label">{t('settings.exportFormat.preview.assistantMessage')}</span>
            </div>
          </div>
        </SettingItem>

        <SettingItem label={t('settings.exportFormat.numbering.label')} description={t('settings.exportFormat.numbering.description')}>
          <select
            className="setting-select"
            value={settings.exportOptions.includeNumbering ? settings.exportOptions.numberingFormat : 'none'}
            onChange={(e) => {
              const value = e.target.value;
              if (value === 'none') {
                onExportOptionChange('includeNumbering', false);
              } else {
                onExportOptionChange('includeNumbering', true, { numberingFormat: value });
              }
            }}
          >
            <option value="none">{t('settings.exportFormat.numbering.none')}</option>
            <option value="numeric">{t('settings.exportFormat.numbering.numeric')}</option>
            <option value="letter">{t('settings.exportFormat.numbering.letter')}</option>
            <option value="roman">{t('settings.exportFormat.numbering.roman')}</option>
          </select>
        </SettingItem>

        <SettingItem label={t('settings.exportFormat.senderLabel.label')} description={t('settings.exportFormat.senderLabel.description')}>
          <select
            className="setting-select"
            value={settings.exportOptions.senderFormat}
            onChange={(e) => onExportOptionChange('senderFormat', e.target.value)}
          >
            <option value="default">{t('settings.exportFormat.senderLabel.default')}</option>
            <option value="human-assistant">{t('settings.exportFormat.senderLabel.humanAssistant')}</option>
            <option value="custom">{t('settings.exportFormat.senderLabel.custom')}</option>
          </select>
        </SettingItem>

        {settings.exportOptions.senderFormat === 'custom' && (
          <>
            <SettingItem label={t('settings.exportFormat.customLabels.human.label')} description={t('settings.exportFormat.customLabels.human.description')}>
              <input
                type="text"
                className="setting-input"
                value={settings.exportOptions.humanLabel}
                onChange={(e) => onExportOptionChange('humanLabel', e.target.value)}
                placeholder={t('settings.exportFormat.customLabels.human.placeholder')}
              />
            </SettingItem>
            <SettingItem label={t('settings.exportFormat.customLabels.assistant.label')} description={t('settings.exportFormat.customLabels.assistant.description')}>
              <input
                type="text"
                className="setting-input"
                value={settings.exportOptions.assistantLabel}
                onChange={(e) => onExportOptionChange('assistantLabel', e.target.value)}
                placeholder={t('settings.exportFormat.customLabels.assistant.placeholder')}
              />
            </SettingItem>
          </>
        )}

        <SettingItem label={t('settings.exportFormat.headerPrefix.label')} description={t('settings.exportFormat.headerPrefix.description')}>
          <select
            className="setting-select"
            value={settings.exportOptions.includeHeaderPrefix ? settings.exportOptions.headerLevel.toString() : 'none'}
            onChange={(e) => {
              const value = e.target.value;
              if (value === 'none') {
                onExportOptionChange('includeHeaderPrefix', false);
              } else {
                onExportOptionChange('includeHeaderPrefix', true, { headerLevel: Number(value) });
              }
            }}
          >
            <option value="none">{t('settings.exportFormat.headerPrefix.none')}</option>
            <option value="1">{t('settings.exportFormat.headerPrefix.h1')}</option>
            <option value="2">{t('settings.exportFormat.headerPrefix.h2')}</option>
          </select>
        </SettingItem>

        <SettingItem label={t('settings.exportFormat.thinkingFormat.label')} description={t('settings.exportFormat.thinkingFormat.description')}>
          <select
            className="setting-select"
            value={settings.exportOptions.thinkingFormat || 'codeblock'}
            onChange={(e) => onExportOptionChange('thinkingFormat', e.target.value)}
          >
            <option value="codeblock">{t('settings.exportFormat.thinkingFormat.codeblock')}</option>
            <option value="xml">{t('settings.exportFormat.thinkingFormat.xml')}</option>
            <option value="emoji">{t('settings.exportFormat.thinkingFormat.emoji')}</option>
          </select>
        </SettingItem>
      </SettingsSection>

      <SettingsSection title={t('settings.exportContent.title')}>
        <div className="section-description">{t('settings.exportContent.description')}</div>
        <CheckboxSetting label={t('settings.exportContent.timestamps.label')} description={t('settings.exportContent.timestamps.description')} checked={settings.exportOptions.includeTimestamps} onChange={(c) => onExportOptionChange('includeTimestamps', c)} />
        <CheckboxSetting label={t('settings.exportContent.thinking.label')} description={t('settings.exportContent.thinking.description')} checked={settings.exportOptions.includeThinking} onChange={(c) => onExportOptionChange('includeThinking', c)} />
        <CheckboxSetting label={t('settings.exportContent.artifacts.label')} description={t('settings.exportContent.artifacts.description')} checked={settings.exportOptions.includeArtifacts} onChange={(c) => onExportOptionChange('includeArtifacts', c)} />
        <CheckboxSetting label={t('settings.exportContent.canvas.label')} description={t('settings.exportContent.canvas.description')} checked={settings.exportOptions.includeCanvas} onChange={(c) => onExportOptionChange('includeCanvas', c)} />
        <CheckboxSetting label={t('settings.exportContent.tools.label')} description={t('settings.exportContent.tools.description')} checked={settings.exportOptions.includeTools} onChange={(c) => onExportOptionChange('includeTools', c)} />
        <CheckboxSetting label={t('settings.exportContent.citations.label')} description={t('settings.exportContent.citations.description')} checked={settings.exportOptions.includeCitations} onChange={(c) => onExportOptionChange('includeCitations', c)} />
        <CheckboxSetting label={t('settings.exportContent.attachments.label')} description={t('settings.exportContent.attachments.description')} checked={settings.exportOptions.includeAttachments} onChange={(c) => onExportOptionChange('includeAttachments', c)} />
      </SettingsSection>
    </div>
  );
};

/**
 * AI设置面板 - 包含AI Chat API配置、MCP服务器管理、语义搜索配置
 */
const AISettings = ({ settings, onAIChatConfigChange, onEmbeddingConfigChange }) => {
  const { t } = useI18n();
  const [showAiChatPassword, setShowAiChatPassword] = useState(false);
  const [showAddMcpForm, setShowAddMcpForm] = useState(false);
  const [newMcpServer, setNewMcpServer] = useState({ name: '', type: 'stdio', command: '', args: '', baseUrl: '' });

  // 使用MCP Service hook
  const {
    servers,
    tools,
    isLoading: mcpLoading,
    addServer: mcpAddServer,
    removeServer: mcpRemoveServer,
    toggleServer: mcpToggleServer,
    refreshServers,
    refreshTools
  } = useMCPService();

  const PROTOCOL_OPTIONS = [
    { id: 'anthropic', name: 'Anthropic (Claude)' },
    { id: 'openai', name: 'OpenAI (Compatible)' }
  ];

  const handleProtocolChange = (newProtocol) => {
    // 只更新协议，保留用户已设置的 baseUrl 和 model
    // 仅当当前值是另一个协议的默认值时才替换
    const newConfig = newProtocol === 'openai' ? DEFAULT_AI_CONFIG.openai : DEFAULT_AI_CONFIG.anthropic;
    const oldConfig = newProtocol === 'openai' ? DEFAULT_AI_CONFIG.anthropic : DEFAULT_AI_CONFIG.openai;

    const updates = {
      protocol: newConfig.protocol
    };

    // 如果当前 baseUrl 是旧协议的默认值，则更新为新协议的默认值
    if (settings.aiChatConfig.baseUrl === oldConfig.baseUrl) {
      updates.baseUrl = newConfig.baseUrl;
    }

    // 如果当前 model 是旧协议的默认值，则更新为新协议的默认值
    if (settings.aiChatConfig.model === oldConfig.model) {
      updates.model = newConfig.model;
    }

    onAIChatConfigChange(updates);
  };

  const handleAddMcpServer = async () => {
    if (!newMcpServer.name.trim()) return;

    const config = {
      name: newMcpServer.name.trim(),
      ...(newMcpServer.type === 'stdio' ? {
        command: newMcpServer.command.trim(),
        args: newMcpServer.args.trim().split(/\s+/).filter(Boolean)
      } : {
        baseUrl: newMcpServer.baseUrl.trim()
      })
    };

    await mcpAddServer(config);
    setNewMcpServer({ name: '', type: 'stdio', command: '', args: '', baseUrl: '' });
    setShowAddMcpForm(false);
  };

  return (
    <div className="settings-section-content">
      {/* AI Chat API配置 */}
      <SettingsSection title={t('settings.aiChat.title')}>
        <div className="section-description">{t('settings.aiChat.description')}</div>

        <SettingItem label={t('settings.aiChat.protocol.label')} description={t('settings.aiChat.protocol.description')}>
          <select
            className="setting-select"
            value={settings.aiChatConfig.protocol}
            onChange={(e) => handleProtocolChange(e.target.value)}
          >
            {PROTOCOL_OPTIONS.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.name}</option>
            ))}
          </select>
        </SettingItem>

        <SettingItem label={t('settings.aiChat.apiKey.label')} description={t('settings.aiChat.apiKey.description')}>
          <div style={{ position: 'relative' }}>
            <input
              type={showAiChatPassword ? 'text' : 'password'}
              className="setting-input"
              value={settings.aiChatConfig.apiKey}
              onChange={(e) => onAIChatConfigChange({ apiKey: e.target.value })}
              placeholder={settings.aiChatConfig.protocol === 'openai' ? 'sk-...' : 'sk-ant-...'}
            />
            <button
              type="button"
              onClick={() => setShowAiChatPassword(!showAiChatPassword)}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {showAiChatPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </SettingItem>

        <SettingItem label={t('settings.aiChat.baseUrl.label')} description={t('settings.aiChat.baseUrl.description')}>
          <input
            type="text"
            className="setting-input"
            value={settings.aiChatConfig.baseUrl}
            onChange={(e) => onAIChatConfigChange({ baseUrl: e.target.value })}
            placeholder={settings.aiChatConfig.protocol === 'openai' ? DEFAULT_AI_CONFIG.openai.baseUrl : DEFAULT_AI_CONFIG.anthropic.baseUrl}
          />
        </SettingItem>

        <SettingItem label={t('settings.aiChat.model.label')} description={t('settings.aiChat.model.description')}>
          <input
            type="text"
            className="setting-input"
            value={settings.aiChatConfig.model}
            onChange={(e) => onAIChatConfigChange({ model: e.target.value })}
            placeholder={settings.aiChatConfig.protocol === 'openai' ? DEFAULT_AI_CONFIG.openai.model : DEFAULT_AI_CONFIG.anthropic.model}
          />
        </SettingItem>

        <SettingItem label={t('settings.aiChat.maxTokens.label')} description={t('settings.aiChat.maxTokens.description')}>
          <input
            type="number"
            className="setting-input"
            value={settings.aiChatConfig.maxTokens}
            onChange={(e) => onAIChatConfigChange({ maxTokens: parseInt(e.target.value, 10) || 4096 })}
            min={1}
            max={200000}
          />
        </SettingItem>
      </SettingsSection>

      {/* MCP服务器管理 */}
      <SettingsSection title={t('settings.mcp.title')}>
        <div className="section-description">{t('settings.mcp.description')}</div>

        {/* 状态栏 */}
        <div className="mcp-stats">
          <span className="mcp-badge">{servers.length} {t('settings.mcp.serversCount')}</span>
          <span className="mcp-badge">{tools.length} {t('settings.mcp.toolsCount')}</span>
          <button
            className="btn-secondary"
            onClick={() => setShowAddMcpForm(!showAddMcpForm)}
            style={{ marginLeft: 'auto' }}
          >
            {showAddMcpForm ? t('settings.mcp.cancelAdd') : t('settings.mcp.addServer')}
          </button>
        </div>

        {/* 添加服务器表单 */}
        {showAddMcpForm && (
          <div className="mcp-add-form">
            <input
              type="text"
              className="setting-input"
              placeholder={t('settings.mcp.serverName')}
              value={newMcpServer.name}
              onChange={(e) => setNewMcpServer({ ...newMcpServer, name: e.target.value })}
            />

            <div className="mcp-type-selector">
              <label>
                <input
                  type="radio"
                  name="mcp-type"
                  value="stdio"
                  checked={newMcpServer.type === 'stdio'}
                  onChange={() => setNewMcpServer({ ...newMcpServer, type: 'stdio' })}
                />
                {t('settings.mcp.typeStdio')}
              </label>
              <label>
                <input
                  type="radio"
                  name="mcp-type"
                  value="http"
                  checked={newMcpServer.type === 'http'}
                  onChange={() => setNewMcpServer({ ...newMcpServer, type: 'http' })}
                />
                {t('settings.mcp.typeHttp')}
              </label>
            </div>

            {newMcpServer.type === 'stdio' ? (
              <>
                <input
                  type="text"
                  className="setting-input"
                  placeholder={t('settings.mcp.command')}
                  value={newMcpServer.command}
                  onChange={(e) => setNewMcpServer({ ...newMcpServer, command: e.target.value })}
                />
                <input
                  type="text"
                  className="setting-input"
                  placeholder={t('settings.mcp.args')}
                  value={newMcpServer.args}
                  onChange={(e) => setNewMcpServer({ ...newMcpServer, args: e.target.value })}
                />
              </>
            ) : (
              <input
                type="text"
                className="setting-input"
                placeholder={t('settings.mcp.serverUrl')}
                value={newMcpServer.baseUrl}
                onChange={(e) => setNewMcpServer({ ...newMcpServer, baseUrl: e.target.value })}
              />
            )}

            <button
              className="btn-primary"
              onClick={handleAddMcpServer}
              disabled={!newMcpServer.name.trim()}
            >
              {t('settings.mcp.confirmAdd')}
            </button>
          </div>
        )}

        {/* 服务器列表 */}
        <div className="mcp-server-list">
          {servers.length === 0 ? (
            <div className="mcp-empty">{t('settings.mcp.noServers')}</div>
          ) : (
            servers.map(server => (
              <div key={server.id} className={`mcp-server-item ${server.isActive ? 'active' : ''}`}>
                <div className="mcp-server-info">
                  <div className="mcp-server-name">
                    {server.name}
                    {server.type === 'builtin' && <span className="mcp-badge builtin">{t('settings.mcp.builtin')}</span>}
                  </div>
                  <div className="mcp-server-meta">
                    {server.command && `${server.command} ${server.args?.join(' ')}`}
                    {server.baseUrl}
                  </div>
                </div>
                <div className="mcp-server-actions">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={server.isActive}
                      onChange={(e) => mcpToggleServer(server.id, e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  {server.type !== 'builtin' && (
                    <button
                      className="btn-icon"
                      onClick={() => mcpRemoveServer(server.id)}
                      title={t('settings.mcp.removeServer')}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 可用工具预览 */}
        {tools.length > 0 && (
          <div className="mcp-tools-preview">
            <h4>{t('settings.mcp.availableTools')}</h4>
            <div className="mcp-tools-list">
              {tools.map(tool => (
                <div key={tool.id} className="mcp-tool-item">
                  <span className="tool-name">🔧 {tool.name}</span>
                  <span className="tool-server">{tool.serverName}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </SettingsSection>

      {/* 语义搜索（Embedding）配置 */}
      <SettingsSection title={t('settings.embedding.title')}>
        <div className="section-description">{t('settings.embedding.description')}</div>

        <SettingItem label={t('settings.embedding.apiUrl.label')} description={t('settings.embedding.apiUrl.description')}>
          <input
            type="text"
            className="setting-input"
            value={settings.embeddingConfig.lmStudioUrl}
            onChange={(e) => onEmbeddingConfigChange({ lmStudioUrl: e.target.value })}
            placeholder="http://localhost:1234"
          />
        </SettingItem>

        <SettingItem label={t('settings.embedding.modelName.label')} description={t('settings.embedding.modelName.description')}>
          <input
            type="text"
            className="setting-input"
            value={settings.embeddingConfig.modelName}
            onChange={(e) => onEmbeddingConfigChange({ modelName: e.target.value })}
            placeholder="qwen3-embedding"
          />
        </SettingItem>

        <div className="setting-info">
          💡 {t('settings.embedding.info')}
        </div>
      </SettingsSection>
    </div>
  );
};

/**
 * 关于面板 - 包含应用信息和AI Chat功能说明
 */
const AboutSection = () => {
  const { t } = useI18n();

  return (
    <div className="settings-section-content">
      {/* 应用信息 */}
      <SettingsSection title={t('settings.about.title')}>
        <SettingItem label={t('settings.about.appName')} description={t('settings.about.appDescription')} static={true} />
        <SettingItem label={t('settings.about.version')} description={'v1.7.4'} static={true} />
        <SettingItem label={t('settings.about.github')} description={t('settings.about.githubDescription')}>
          <a
            href="https://github.com/Yalums/lyra-exporter"
            target="_blank"
            rel="noopener noreferrer"
            className="github-link"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            <span>GitHub</span>
          </a>
        </SettingItem>
      </SettingsSection>

      {/* AI Chat功能说明 */}
      <SettingsSection title={t('settings.about.aiChatTitle')}>
        <div className="section-description">{t('settings.about.aiChatDescription')}</div>

        <div className="about-features">
          <h4>{t('settings.about.mainFeatures')}</h4>
            <li>{t('settings.about.feature1')}</li>
            <li>{t('settings.about.feature2')}</li>
            <li>{t('settings.about.feature3')}</li>
            <li>{t('settings.about.feature4')}</li>
        </div>
      </SettingsSection>
    </div>
  );
};

// ========== 通用UI组件 ==========

const SettingsSection = ({ title, children }) => (
  <div className="settings-section">
    <h3>{title}</h3>
    {children}
  </div>
);

const SettingItem = ({ label, description, children, static: isStatic = false }) => (
  <div className={`setting-item ${isStatic ? 'static' : ''}`}>
    <div className="setting-label">
      <span>{label}</span>
      {description && <span className="setting-description">{description}</span>}
    </div>
    {!isStatic && children}
  </div>
);

const CheckboxSetting = ({ label, description, checked, onChange }) => (
  <div className="setting-item">
    <label className="setting-checkbox">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="setting-label">
        <span>{label}</span>
        {description && <span className="setting-description">{description}</span>}
      </div>
    </label>
  </div>
);

const ThemeToggle = ({ theme, onToggle }) => {
  const { t } = useI18n();

  const getThemeIcon = () => {
    switch (theme) {
      case 'dark': return '🌙';
      case 'light': return '☀️';
      case 'eink': return '📖';
      default: return '🌙';
    }
  };

  const getThemeText = () => {
    switch (theme) {
      case 'dark': return t('settings.appearance.theme.dark');
      case 'light': return t('settings.appearance.theme.light');
      case 'eink': return t('settings.appearance.theme.eink');
      default: return t('settings.appearance.theme.dark');
    }
  };

  const getNextThemeText = () => {
    switch (theme) {
      case 'dark': return t('settings.appearance.theme.toggleToLight');
      case 'light': return t('settings.appearance.theme.toggleToEink');
      case 'eink': return t('settings.appearance.theme.toggleToDark');
      default: return t('settings.appearance.theme.toggleToLight');
    }
  };

  return (
    <button
      className="theme-toggle-btn"
      onClick={onToggle}
      title={getNextThemeText()}
    >
      <span className="theme-icon">{getThemeIcon()}</span>
      <span className="theme-text">{getThemeText()}</span>
    </button>
  );
};

/**
 * 快速主题切换器（用于工具栏）
 */
export const QuickThemeToggle = () => {
  const [theme, setTheme] = useState(ThemeUtils.getCurrentTheme());
  const { t } = useI18n();
  const handleToggle = () => {
    const newTheme = ThemeUtils.toggleTheme();
    setTheme(newTheme);
  };

  return (
    <button
      className="quick-theme-toggle"
      onClick={handleToggle}
      title={theme === 'dark' ? t('settings.appearance.theme.toggleToLight') : t('settings.appearance.theme.toggleToDark')}
    >
    </button>
  );
};

export default SettingsPanel;
