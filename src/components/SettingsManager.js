// components/SettingsManager.js
// 统一的设置管理组件 - 整合主题、语言、复制选项和导出设置

import React, { useState, useEffect } from 'react';
import { ThemeUtils, StorageUtils } from '../utils/commonUtils';
import { CopyConfigManager } from '../utils/copyManager';
import LanguageSwitcher from './LanguageSwitcher';
import { useI18n } from '../hooks/useI18n';

/**
 * 导出配置管理器 - 直接使用 localStorage
 */
const ExportConfigManager = {
  CONFIG_KEY: 'export-config',
  
  getConfig() {
    return StorageUtils.getLocalStorage(this.CONFIG_KEY, {
      // 格式设置
      includeNumbering: true,
      numberingFormat: 'numeric', // 'numeric', 'letter', 'roman'
      senderFormat: 'default', // 'default', 'human-assistant', 'custom'
      humanLabel: 'Human',
      assistantLabel: 'Assistant',
      includeHeaderPrefix: true,
      headerLevel: 2, // 1-6 对应 # 到 ##
      thinkingFormat: 'codeblock', // 'codeblock', 'xml', 'emoji'
      
      // 内容设置（从导出选项面板移过来）
      includeTimestamps: false,
      includeThinking: false,
      includeArtifacts: true,
      includeTools: false,
      includeCitations: false
    });
  },
  
  saveConfig(config) {
    StorageUtils.setLocalStorage(this.CONFIG_KEY, config);
  }
};

/**
 * 设置面板组件
 */
const SettingsPanel = ({ isOpen, onClose, exportOptions, setExportOptions }) => {
  const { t } = useI18n();
  const [settings, setSettings] = useState({
    theme: 'dark',
    copyOptions: {
      includeThinking: false,
      includeArtifacts: false,
      includeMetadata: true
    },
    language: 'zh-CN',
    exportOptions: {
      // 格式设置
      includeNumbering: true,
      numberingFormat: 'numeric',
      senderFormat: 'default',
      humanLabel: 'Human',
      assistantLabel: 'Assistant',
      includeHeaderPrefix: true,
      headerLevel: 2,
      
      // 内容设置
      includeTimestamps: false,
      includeThinking: false,
      includeArtifacts: true,
      includeTools: false,
      includeCitations: false,
      thinkingFormat: 'codeblock'
    }
  });

  // 初始化设置
  useEffect(() => {
    if (isOpen) {
      setSettings({
        theme: ThemeUtils.getCurrentTheme(),
        copyOptions: CopyConfigManager.getConfig(),
        language: StorageUtils.getLocalStorage('app-language', 'en-US'),
        exportOptions: ExportConfigManager.getConfig()
      });
    }
  }, [isOpen]);

  // 处理主题切换
  const handleThemeChange = () => {
    const newTheme = ThemeUtils.toggleTheme();
    setSettings(prev => ({ ...prev, theme: newTheme }));
  };

  // 处理复制选项更改
  const handleCopyOptionChange = (option, value) => {
    const newOptions = { ...settings.copyOptions, [option]: value };
    CopyConfigManager.saveConfig(newOptions);
    setSettings(prev => ({ 
      ...prev, 
      copyOptions: newOptions 
    }));
  };

  // 处理导出选项更改
  const handleExportOptionChange = (option, value) => {
    const newOptions = { ...settings.exportOptions, [option]: value };
    
    // 如果改变了 senderFormat，自动调整标签
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
    setSettings(prev => ({ 
      ...prev, 
      exportOptions: newOptions 
    }));
    
    // 如果是内容相关的选项，同步更新 App.js 中的 exportOptions
    if (setExportOptions && ['includeTimestamps', 'includeThinking', 'includeArtifacts', 'includeTools', 'includeCitations'].includes(option)) {
      setExportOptions(prev => ({
        ...prev,
        [option]: value
      }));
    }
  };

  // 处理语言切换
  const handleLanguageChange = (language) => {
    StorageUtils.setLocalStorage('app-language', language);
    setSettings(prev => ({ ...prev, language }));
  };

  // 获取完整格式预览
  const getFullFormatPreview = () => {
    const { exportOptions } = settings;
    
    // 人类消息预览
    let humanPreview = '';
    if (exportOptions.includeHeaderPrefix) {
      humanPreview += '#'.repeat(exportOptions.headerLevel) + ' ';
    }
    if (exportOptions.includeNumbering) {
      if (exportOptions.numberingFormat === 'numeric') {
        humanPreview += '1. ';
      } else if (exportOptions.numberingFormat === 'letter') {
        humanPreview += 'A. ';
      } else if (exportOptions.numberingFormat === 'roman') {
        humanPreview += 'I. ';
      }
    }
    humanPreview += exportOptions.humanLabel;
    
    // Assistant 消息预览
    let assistantPreview = '';
    if (exportOptions.includeHeaderPrefix) {
      assistantPreview += '#'.repeat(exportOptions.headerLevel) + ' ';
    }
    if (exportOptions.includeNumbering) {
      if (exportOptions.numberingFormat === 'numeric') {
        assistantPreview += '2. ';
      } else if (exportOptions.numberingFormat === 'letter') {
        assistantPreview += 'B. ';
      } else if (exportOptions.numberingFormat === 'roman') {
        assistantPreview += 'II. ';
      }
    }
    assistantPreview += exportOptions.assistantLabel;
    
    return [humanPreview, assistantPreview];
  };

  if (!isOpen) return null;

  const [humanPreview, assistantPreview] = getFullFormatPreview();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content settings-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('settings.title')}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="settings-content">
          {/* 外观设置 */}
          <SettingsSection title={t('settings.appearance.title')}>
            <SettingItem label={t('settings.appearance.theme.label')} description={t('settings.appearance.theme.description')}>
              <ThemeToggle theme={settings.theme} onToggle={handleThemeChange} />
            </SettingItem>
            
            <SettingItem label={t('settings.appearance.language.label')} description={t('settings.appearance.language.description')}>
              <LanguageSwitcher 
                variant="compact"
                showText={true}
                className="settings-language-switcher"
                onLanguageChange={handleLanguageChange}
              />
            </SettingItem>
          </SettingsSection>

          {/* 复制设置 */}
          <SettingsSection title={t('settings.copyOptions.title')}>
            <CheckboxSetting
              label={t('settings.copyOptions.includeMetadata.label')}
              description={t('settings.copyOptions.includeMetadata.description')}
              checked={settings.copyOptions.includeMetadata}
              onChange={(checked) => handleCopyOptionChange('includeMetadata', checked)}
            />
            
            <CheckboxSetting
              label={t('settings.copyOptions.includeThinking.label')}
              description={t('settings.copyOptions.includeThinking.description')}
              checked={settings.copyOptions.includeThinking}
              onChange={(checked) => handleCopyOptionChange('includeThinking', checked)}
            />
            
            <CheckboxSetting
              label={t('settings.copyOptions.includeArtifacts.label')}
              description={t('settings.copyOptions.includeArtifacts.description')}
              checked={settings.copyOptions.includeArtifacts}
              onChange={(checked) => handleCopyOptionChange('includeArtifacts', checked)}
            />
          </SettingsSection>

          {/* 导出设置 - 格式部分 */}
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
                    handleExportOptionChange('includeNumbering', false);
                  } else {
                    handleExportOptionChange('includeNumbering', true);
                    handleExportOptionChange('numberingFormat', value);
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
                onChange={(e) => handleExportOptionChange('senderFormat', e.target.value)}
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
                    onChange={(e) => handleExportOptionChange('humanLabel', e.target.value)}
                    placeholder={t('settings.exportFormat.customLabels.human.placeholder')}
                  />
                </SettingItem>
                
                <SettingItem label={t('settings.exportFormat.customLabels.assistant.label')} description={t('settings.exportFormat.customLabels.assistant.description')}>
                  <input 
                    type="text"
                    className="setting-input"
                    value={settings.exportOptions.assistantLabel}
                    onChange={(e) => handleExportOptionChange('assistantLabel', e.target.value)}
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
                    handleExportOptionChange('includeHeaderPrefix', false);
                  } else {
                    handleExportOptionChange('includeHeaderPrefix', true);
                    handleExportOptionChange('headerLevel', Number(value));
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
                onChange={(e) => handleExportOptionChange('thinkingFormat', e.target.value)}
              >
                <option value="codeblock">{t('settings.exportFormat.thinkingFormat.codeblock')}</option>
                <option value="xml">{t('settings.exportFormat.thinkingFormat.xml')}</option>
                <option value="emoji">{t('settings.exportFormat.thinkingFormat.emoji')}</option>
              </select>
            </SettingItem>

          </SettingsSection>

          {/* 导出设置 - 内容部分 */}
          <SettingsSection title={t('settings.exportContent.title')}>
            <div className="section-description">{t('settings.exportContent.description')}</div>
            
            <CheckboxSetting
              label={t('settings.exportContent.timestamps.label')}
              description={t('settings.exportContent.timestamps.description')}
              checked={settings.exportOptions.includeTimestamps}
              onChange={(checked) => handleExportOptionChange('includeTimestamps', checked)}
            />
            
            <CheckboxSetting
              label={t('settings.exportContent.thinking.label')}
              description={t('settings.exportContent.thinking.description')}
              checked={settings.exportOptions.includeThinking}
              onChange={(checked) => handleExportOptionChange('includeThinking', checked)}
            />
            
            <CheckboxSetting
              label={t('settings.exportContent.artifacts.label')}
              description={t('settings.exportContent.artifacts.description')}
              checked={settings.exportOptions.includeArtifacts}
              onChange={(checked) => handleExportOptionChange('includeArtifacts', checked)}
            />
            
            <CheckboxSetting
              label={t('settings.exportContent.tools.label')}
              description={t('settings.exportContent.tools.description')}
              checked={settings.exportOptions.includeTools}
              onChange={(checked) => handleExportOptionChange('includeTools', checked)}
            />
            
            <CheckboxSetting
              label={t('settings.exportContent.citations.label')}
              description={t('settings.exportContent.citations.description')}
              checked={settings.exportOptions.includeCitations}
              onChange={(checked) => handleExportOptionChange('includeCitations', checked)}
            />
          </SettingsSection>

          {/* 关于 */}
          <SettingsSection title={t('settings.about.title')}>
            <SettingItem label={t('settings.about.appName')} description={t('settings.about.appDescription')} static={true} />
            <SettingItem label={t('settings.about.version')} description={'v1.5.3'} static={true} />
            <SettingItem label={t('settings.about.github')} description={t('settings.about.githubDescription')} static={true} />
          </SettingsSection>
        </div>
        
        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}>
            {t('settings.done')}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * 设置区块组件
 */
const SettingsSection = ({ title, children }) => (
  <div className="settings-section">
    <h3>{title}</h3>
    {children}
  </div>
);

/**
 * 设置项组件
 */
const SettingItem = ({ label, description, children, static: isStatic = false }) => (
  <div className={`setting-item ${isStatic ? 'static' : ''}`}>
    <div className="setting-label">
      <span>{label}</span>
      {description && <span className="setting-description">{description}</span>}
    </div>
    {!isStatic && children}
  </div>
);

/**
 * 复选框设置组件
 */
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

/**
 * 主题切换按钮组件
 */
const ThemeToggle = ({ theme, onToggle }) => {
  const { t } = useI18n();
  return (
    <button 
      className="theme-toggle-btn"
      onClick={onToggle}
      title={theme === 'dark' ? t('settings.appearance.theme.toggleToLight') : t('settings.appearance.theme.toggleToDark')}
    >
      <span className="theme-icon">
        {theme === 'dark' ? '🌙' : '☀️'}
      </span>
      <span className="theme-text">
        {theme === 'dark' ? t('settings.appearance.theme.dark') : t('settings.appearance.theme.light')}
      </span>
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