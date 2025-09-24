// components/SettingsManager.js
// 统一的设置管理组件 - 整合主题、语言、复制选项和导出设置

import React, { useState, useEffect } from 'react';
import { ThemeUtils, StorageUtils } from '../utils/commonUtils';
import { CopyConfigManager } from '../utils/copyManager';
import LanguageSwitcher from './LanguageSwitcher';

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
      humanLabel: '人类',
      assistantLabel: 'Claude',
      includeHeaderPrefix: true,
      headerLevel: 2, // 1-6 对应 # 到 ##
      
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
      humanLabel: '人类',
      assistantLabel: 'Claude',
      includeHeaderPrefix: true,
      headerLevel: 2,
      
      // 内容设置
      includeTimestamps: false,
      includeThinking: false,
      includeArtifacts: true,
      includeTools: false,
      includeCitations: false
    }
  });

  // 初始化设置
  useEffect(() => {
    if (isOpen) {
      setSettings({
        theme: ThemeUtils.getCurrentTheme(),
        copyOptions: CopyConfigManager.getConfig(),
        language: StorageUtils.getLocalStorage('app-language', 'zh-CN'),
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
        newOptions.humanLabel = '人类';
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
          <h2>设置</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="settings-content">
          {/* 外观设置 */}
          <SettingsSection title="外观">
            <SettingItem label="主题" description="选择深色或浅色主题">
              <ThemeToggle theme={settings.theme} onToggle={handleThemeChange} />
            </SettingItem>
            
            <SettingItem label="语言" description="选择界面显示语言">
              <LanguageSwitcher 
                variant="compact"
                showText={true}
                className="settings-language-switcher"
                onLanguageChange={handleLanguageChange}
              />
            </SettingItem>
          </SettingsSection>

          {/* 复制设置 */}
          <SettingsSection title="复制选项">
            <CheckboxSetting
              label="包含元数据"
              description="复制时包含发送者和时间信息"
              checked={settings.copyOptions.includeMetadata}
              onChange={(checked) => handleCopyOptionChange('includeMetadata', checked)}
            />
            
            <CheckboxSetting
              label="包含思考过程"
              description="复制消息时包含Claude的思考过程"
              checked={settings.copyOptions.includeThinking}
              onChange={(checked) => handleCopyOptionChange('includeThinking', checked)}
            />
            
            <CheckboxSetting
              label="包含Artifacts"
              description="复制消息时包含生成的代码和文档"
              checked={settings.copyOptions.includeArtifacts}
              onChange={(checked) => handleCopyOptionChange('includeArtifacts', checked)}
            />
          </SettingsSection>

          {/* 导出设置 - 格式部分 */}
          <SettingsSection title="导出格式">
            <SettingItem label="格式预览" description="查看当前设置下的标题格式效果" static={true}>
              <div className="format-preview">
                <div className="preview-item">
                  <code>{humanPreview}</code>
                  <span className="preview-label">（用户消息）</span>
                </div>
                <div className="preview-item">
                  <code>{assistantPreview}</code>
                  <span className="preview-label">（助手消息）</span>
                </div>
              </div>
            </SettingItem>
            
            <SettingItem label="序号设置" description="选择是否在消息标题中包含序号">
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
                <option value="none">不包含序号</option>
                <option value="numeric">数字序号 (1, 2, 3...)</option>
                <option value="letter">字母序号 (A, B, C...)</option>
                <option value="roman">罗马数字 (I, II, III...)</option>
              </select>
            </SettingItem>
            

            
            <SettingItem label="发送者标签" description="选择发送者的显示格式">
              <select 
                className="setting-select"
                value={settings.exportOptions.senderFormat}
                onChange={(e) => handleExportOptionChange('senderFormat', e.target.value)}
              >
                <option value="default">默认 (人类/Claude)</option>
                <option value="human-assistant">英文 (Human/Assistant)</option>
                <option value="custom">自定义</option>
              </select>
            </SettingItem>
            
            {settings.exportOptions.senderFormat === 'custom' && (
              <>
                <SettingItem label="用户标签" description="自定义用户发送者的标签">
                  <input 
                    type="text"
                    className="setting-input"
                    value={settings.exportOptions.humanLabel}
                    onChange={(e) => handleExportOptionChange('humanLabel', e.target.value)}
                    placeholder="例如：用户、User"
                  />
                </SettingItem>
                
                <SettingItem label="助手标签" description="自定义AI助手的标签">
                  <input 
                    type="text"
                    className="setting-input"
                    value={settings.exportOptions.assistantLabel}
                    onChange={(e) => handleExportOptionChange('assistantLabel', e.target.value)}
                    placeholder="例如：AI、Assistant"
                  />
                </SettingItem>
              </>
            )}
            
            <SettingItem label="标题前缀" description="选择是否在标题前添加 Markdown 标题符号">
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
                <option value="none">不包含标题前缀</option>
                <option value="1">一级标题 (#)</option>
                <option value="2">二级标题 (##)</option>
              </select>
            </SettingItem>
            

          </SettingsSection>

          {/* 导出设置 - 内容部分 */}
          <SettingsSection title="导出内容">
            <div className="section-description">控制导出的Markdown文件中包含哪些内容</div>
            
            <CheckboxSetting
              label="时间戳"
              description="包含消息的发送时间"
              checked={settings.exportOptions.includeTimestamps}
              onChange={(checked) => handleExportOptionChange('includeTimestamps', checked)}
            />
            
            <CheckboxSetting
              label="思考过程"
              description="Claude 的内部思考过程"
              checked={settings.exportOptions.includeThinking}
              onChange={(checked) => handleExportOptionChange('includeThinking', checked)}
            />
            
            <CheckboxSetting
              label="Artifacts"
              description="代码、文档等生成内容"
              checked={settings.exportOptions.includeArtifacts}
              onChange={(checked) => handleExportOptionChange('includeArtifacts', checked)}
            />
            
            <CheckboxSetting
              label="工具使用"
              description="搜索、计算等工具调用记录"
              checked={settings.exportOptions.includeTools}
              onChange={(checked) => handleExportOptionChange('includeTools', checked)}
            />
            
            <CheckboxSetting
              label="引用来源"
              description="网页链接等引用信息"
              checked={settings.exportOptions.includeCitations}
              onChange={(checked) => handleExportOptionChange('includeCitations', checked)}
            />
          </SettingsSection>

          {/* 关于 */}
          <SettingsSection title="关于">
            <SettingItem label="Lyra Exporter" description="强大的对话导出和管理工具" static={true} />
            <SettingItem label="版本" description="v1.5.0" static={true} />
            <SettingItem label="GitHub" description="开源项目，欢迎贡献和反馈" static={true} />
          </SettingsSection>
        </div>
        
        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}>
            完成
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
const ThemeToggle = ({ theme, onToggle }) => (
  <button 
    className="theme-toggle-btn"
    onClick={onToggle}
    title={theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'}
  >
    <span className="theme-icon">
      {theme === 'dark' ? '🌙' : '☀️'}
    </span>
    <span className="theme-text">
      {theme === 'dark' ? '深色主题' : '浅色主题'}
    </span>
  </button>
);

/**
 * 快速主题切换器（用于工具栏）
 */
export const QuickThemeToggle = () => {
  const [theme, setTheme] = useState(ThemeUtils.getCurrentTheme());

  const handleToggle = () => {
    const newTheme = ThemeUtils.toggleTheme();
    setTheme(newTheme);
  };

  return (
    <button 
      className="quick-theme-toggle"
      onClick={handleToggle}
      title={theme === 'dark' ? '切换到浅色主题' : '切换到暗色主题'}
    >
      {theme === 'dark' ? '🐻' : '🐻‍❄️'}
    </button>
  );
};

export default SettingsPanel;