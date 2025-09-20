// components/SettingsPanel.js
import React, { useState, useEffect } from 'react';
import LanguageSwitcher from './LanguageSwitcher';

const SettingsPanel = ({ isOpen, onClose }) => {
  const [theme, setTheme] = useState('dark');
  const [copyOptions, setCopyOptions] = useState({
    includeThinking: false,
    includeArtifacts: false
  });
  const [isInitialized, setIsInitialized] = useState(false);

  // 初始化设置 - 只在第一次打开时读取
  useEffect(() => {
    if (isOpen && !isInitialized) {
      // 读取主题设置
      const savedTheme = localStorage.getItem('app-theme') || 'dark';
      setTheme(savedTheme);
      
      // 读取复制选项
      try {
        const saved = localStorage.getItem('copy_options');
        if (saved) {
          setCopyOptions(JSON.parse(saved));
        }
      } catch (e) {
        console.error('Failed to load copy options:', e);
      }
      
      setIsInitialized(true);
    }
  }, [isOpen, isInitialized]);

  const handleThemeChange = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    
    // 应用主题
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('app-theme', newTheme);
    
    // 更新PWA主题色
    if (window.updatePWAThemeColor) {
      setTimeout(() => {
        window.updatePWAThemeColor();
      }, 50);
    }
  };

  const handleCopyOptionChange = (option, value) => {
    const newOptions = { ...copyOptions, [option]: value };
    setCopyOptions(newOptions);
    localStorage.setItem('copy_options', JSON.stringify(newOptions));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content settings-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>设置</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="settings-content">
          {/* 外观设置 */}
          <div className="settings-section">
            <h3>外观</h3>
            <div className="setting-item">
              <div className="setting-label">
                <span>主题</span>
                <span className="setting-description">选择深色或浅色主题</span>
              </div>
              <button 
                className="theme-toggle-btn"
                onClick={handleThemeChange}
                title={theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'}
              >
                <span className="theme-icon">{theme === 'dark' ? '🌙' : '☀️'}</span>
                <span className="theme-text">{theme === 'dark' ? '深色主题' : '浅色主题'}</span>
              </button>
            </div>
            
            <div className="setting-item">
              <div className="setting-label">
                <span>语言</span>
                <span className="setting-description">选择界面显示语言</span>
              </div>
              <LanguageSwitcher 
                variant="compact"
                showText={true}
                className="settings-language-switcher"
              />
            </div>
          </div>

          {/* 复制设置 */}
          <div className="settings-section">
            <h3>复制选项</h3>
            <div className="setting-item">
              <label className="setting-checkbox">
                <input 
                  type="checkbox"
                  checked={copyOptions.includeThinking}
                  onChange={(e) => handleCopyOptionChange('includeThinking', e.target.checked)}
                />
                <div className="setting-label">
                  <span>包含思考过程</span>
                  <span className="setting-description">复制消息时包含Claude的思考过程</span>
                </div>
              </label>
            </div>
            
            <div className="setting-item">
              <label className="setting-checkbox">
                <input 
                  type="checkbox"
                  checked={copyOptions.includeArtifacts}
                  onChange={(e) => handleCopyOptionChange('includeArtifacts', e.target.checked)}
                />
                <div className="setting-label">
                  <span>包含Artifacts</span>
                  <span className="setting-description">复制消息时包含生成的代码和文档</span>
                </div>
              </label>
            </div>
          </div>

          {/* 关于 */}
          <div className="settings-section">
            <h3>关于</h3>
            <div className="setting-item static">
              <div className="setting-label">
                <span>Lyra Exporter</span>
                <span className="setting-description">强大的对话导出和管理工具</span>
              </div>
            </div>
          </div>
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

export default SettingsPanel;