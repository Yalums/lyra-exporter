import React, { useState, useEffect } from 'react';
import { FileText, MessageCircle, Download, Database, Info, Star, Brain, Clock, FolderTree, Moon, Sun} from 'lucide-react';
import { useI18n } from '../hooks/useI18n.js';
import LanguageSwitcher from '../components/LanguageSwitcher.js';
import { ThemeUtils } from '../utils/commonUtils.js';

// 隐私保障说明组件 - 国际化版本（简化版）
const PrivacyAssurance = () => {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="bg-white rounded-xl p-6 mb-8 shadow-md border border-gray-200 transition-all duration-300 hover:shadow-lg">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <h3 className="text-xl font-bold text-gray-800 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          {t('welcomePage.privacyAssurance.title')}
        </h3>
        <div className="text-green-600">
          {expanded ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
              <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
              <path d="M213.66,154.34a8,8,0,0,1-11.32,11.32L128,91.31,53.66,165.66a8,8,0,0,1-11.32-11.32l80-80a8,8,0,0,1,11.32,0Z"/>
            </svg>
          )}
        </div>
      </div>
      
      {expanded && (
        <div className="mt-4 text-gray-700">
          <p className="mb-4 text-sm leading-relaxed">
            {t('welcomePage.privacyAssurance.intro')} <span className="text-green-600 font-medium">{t('welcomePage.privacyAssurance.openSource')}</span> {t('welcomePage.privacyAssurance.description')}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="privacy-feature">
              <span className="privacy-icon">✓</span>
              <div>
                <span className="font-medium">{t('welcomePage.privacyAssurance.guarantees.localProcessing.title')}</span>
                {t('welcomePage.privacyAssurance.guarantees.localProcessing.description')}
              </div>
            </div>
            <div className="privacy-feature">
              <span className="privacy-icon">✓</span>
              <div>
                <span className="font-medium">{t('welcomePage.privacyAssurance.guarantees.offlineMode.title')}</span>
                {t('welcomePage.privacyAssurance.guarantees.offlineMode.description')}
              </div>
            </div>
            <div className="privacy-feature">
              <span className="privacy-icon">✓</span>
              <div>
                <span className="font-medium">{t('welcomePage.privacyAssurance.guarantees.staticSite.title')}</span>
                {t('welcomePage.privacyAssurance.guarantees.staticSite.description')}
              </div>
            </div>
            <div className="privacy-feature">
              <span className="privacy-icon">✓</span>
              <div>
                <span className="font-medium">{t('welcomePage.privacyAssurance.guarantees.selfHosted.title')}</span>
                {t('welcomePage.privacyAssurance.guarantees.selfHosted.description')}
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 mt-4">
            <a 
              href="https://github.com/Yalums/lyra-exporter/tree/gh-pages" 
              target="_blank" 
              rel="noopener noreferrer"
              className="privacy-link primary"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              {t('welcomePage.privacyAssurance.links.sourceCode')}
            </a>
            <a 
              href="https://github.com/Yalums/lyra-exporter/releases" 
              target="_blank" 
              rel="noopener noreferrer"
              className="privacy-link secondary"
            >
              <Download className="h-4 w-4 mr-2" />
              {t('welcomePage.privacyAssurance.links.download')}
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

// 内联的脚本安装指南组件 - 国际化版本
const ScriptInstallGuide = () => {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(true);
  
  // 跳转到油猴脚本安装页面
  const goToScriptInstall = () => {
    window.open('https://greasyfork.org/en/scripts/539579-lyra-s-exporter-fetch', '_blank');
  };

  return (
    <div className="bg-white rounded-xl p-6 mb-8 shadow-md border border-gray-200 transition-all duration-300 hover:shadow-lg">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <h3 className="text-xl font-bold text-gray-800 flex items-center">
          <Database className="mr-3 h-5 w-5 text-blue-600" />
          {t('welcomePage.scriptInstall.title')}
        </h3>
        <div className="text-blue-600">
          {expanded ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
              <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
              <path d="M213.66,154.34a8,8,0,0,1-11.32,11.32L128,91.31,53.66,165.66a8,8,0,0,1-11.32-11.32l80-80a8,8,0,0,1,11.32,0Z"/>
            </svg>
          )}
        </div>
      </div>
      
      {expanded && (
        <div className="mt-4 text-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-4">
            <div>
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                <Info className="mr-2 h-4 w-4 text-blue-600" /> 
                {t('welcomePage.scriptInstall.whyNeeded')}
              </h4>
              <p className="mb-4 text-sm leading-relaxed">
                {t('welcomePage.scriptInstall.purpose')}<span className="text-blue-600 font-medium">{t('welcomePage.scriptInstall.valueProposition')}</span>。
              </p>
              <div className="bg-gray-50 rounded-lg p-4 shadow-sm border border-gray-100">
                <h5 className="font-medium text-gray-800 mb-2">{t('welcomePage.scriptInstall.featuresTitle')}</h5>
                <ul className="space-y-2 list-disc list-inside text-sm">
                  <li>{t('welcomePage.scriptInstall.features.management')}</li>
                  <li>{t('welcomePage.scriptInstall.features.organization')}</li>
                  <li>{t('welcomePage.scriptInstall.features.preservation')}</li>
                  <li>{t('welcomePage.scriptInstall.features.permanence')}</li>
                  <li>{t('welcomePage.scriptInstall.features.onlineReading')}</li>
                </ul>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                <Download className="mr-2 h-4 w-4 text-blue-600" />
                {t('welcomePage.scriptInstall.installTitle')}
              </h4>
              <p className="mb-3 text-sm text-gray-600 italic">
                {t('welcomePage.scriptInstall.inspirationQuote')}
              </p>
              <ol className="space-y-3 list-decimal list-inside text-sm mb-4">
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 w-6 h-6 rounded-full mr-2 flex-shrink-0 font-bold">1</span>
                  <span>{t('welcomePage.scriptInstall.steps.1')}</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 w-6 h-6 rounded-full mr-2 flex-shrink-0 font-bold">2</span>
                  <span>{t('welcomePage.scriptInstall.steps.2')}</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 w-6 h-6 rounded-full mr-2 flex-shrink-0 font-bold">3</span>
                  <span>{t('welcomePage.scriptInstall.steps.3')}</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 w-6 h-6 rounded-full mr-2 flex-shrink-0 font-bold">4</span>
                  <span>{t('welcomePage.scriptInstall.steps.4')}</span>
                </li>
              </ol>
              
              <div className="mt-4">
                <button
                  onClick={goToScriptInstall}
                  className="w-full bg-[#D97706] hover:bg-[#bf6905] text-white py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center shadow-md hover:shadow-lg"
                >
                  <Download className="h-5 w-5 mr-2" />
                  {t('welcomePage.buttons.installScript')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 动态温馨提示组件 - 国际化版本
const FeatureTip = ({ icon, titleKey, contentKey }) => {
  const { t } = useI18n();
  
  return (
    <div className="bg-white rounded-lg p-5 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200">
      <div className="flex items-center mb-3">
        <div className="p-2 rounded-full bg-orange-100 text-orange-600">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-gray-800 ml-3">{t(titleKey)}</h3>
      </div>
      <p className="text-gray-600 text-sm leading-relaxed">{t(contentKey)}</p>
    </div>
  );
};

// 功能特色卡片组件 - 国际化版本
const FeatureCard = ({ titleKey, descriptionKey }) => {
  const { t } = useI18n();
  
  return (
    <div className="bg-white rounded-lg p-5 border border-gray-200">
      <h3 className="font-bold text-gray-800 mb-3">{t(titleKey)}</h3>
      <p className="text-gray-600 text-sm leading-relaxed">{t(descriptionKey)}</p>
    </div>
  );
};

// 主欢迎页面组件 - 国际化版本
const WelcomePage = ({ handleLoadClick }) => {
  const { t, isReady } = useI18n();
  const [currentTheme, setCurrentTheme] = useState(ThemeUtils.getCurrentTheme());
  
  // 处理主题切换（不刷新）
  const handleThemeToggle = () => {
    const newTheme = ThemeUtils.toggleTheme();
    setCurrentTheme(newTheme);
  };
  
  // 处理语言切换（强制刷新）
  const handleLanguageChange = () => {
    setTimeout(() => window.location.reload(), 300);
  };
  
  // 模拟打字效果 - 使用国际化文本
  const [welcomeText, setWelcomeText] = useState("");
  const [fullText, setFullText] = useState("");
  
  // 当语言改变时，重新设置打字效果
  useEffect(() => {
    if (!isReady) return;
    
    const newFullText = t('welcomePage.subtitle');
    setFullText(newFullText);
    setWelcomeText("");
    
    let i = 0;
    const typingInterval = setInterval(() => {
      if (i < newFullText.length) {
        setWelcomeText(newFullText.substring(0, i + 1));
        i++;
      } else {
        clearInterval(typingInterval);
      }
    }, 50);
    
    return () => clearInterval(typingInterval);
  }, [t, isReady]);

  // 如果i18n还没准备好，显示加载状态
  if (!isReady) {
    return (
      <div className="welcome-page flex items-center justify-center w-full h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#D97706] border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="welcome-page flex flex-col items-center w-full px-6 pb-6 overflow-auto scrollable hide-scrollbar non-selectable"
          >
      {/* 右上角控制面板 */}
      <div className="welcome-control-panel">
        <div className="control-panel">
          {/* 主题切换按钮 */}
          <button 
            onClick={handleThemeToggle}
            className="control-button"
            title={currentTheme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
          >
            {currentTheme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>
          
          {/* 语言切换器 */}
          <LanguageSwitcher 
            variant="compact"
            showText={false}
            onLanguageChange={handleLanguageChange}
          />
        </div>
      </div>
      
      {/* 欢迎区 */}
      <div className="w-full max-w-4xl mt-8 mb-8 text-center">
        <div className="text-4xl font-bold text-[#D97706] mt-8 mb-4">{t('welcomePage.title')}</div>
        <br/>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6 min-h-[60px]">
          {welcomeText}
        </h1>
        
        <p className="text-lg text-gray-700 mb-8 max-w-3xl mx-auto">
          {t('welcomePage.description')}
        </p>
      </div>
      
      {/* 添加合适的间距 */}
      <div className="flex justify-center mb-14">
        <button
          className="px-8 py-4 bg-white text-gray-800 text-lg font-bold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center border border-gray-300 hover:bg-gray-200 hover:border-gray-400 transform hover:scale-105"
          onClick={handleLoadClick}
        >
          <FileText className="mr-3 h-5 w-5" />
          {t('welcomePage.buttons.loadFiles')}
        </button>
      </div>
      
      <div className="max-w-4xl w-full mb-6">
        <ScriptInstallGuide />
      </div>
      
      {/* 功能速览 - 默认全部展示 */}
      <div className="w-full max-w-4xl mb-8">
        <br/>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <FeatureCard 
            titleKey="welcomePage.features.marking.title"
            descriptionKey="welcomePage.features.marking.description"
          />
          
          <FeatureCard 
            titleKey="welcomePage.features.thinking.title"
            descriptionKey="welcomePage.features.thinking.description"
          />
          
          <FeatureCard 
            titleKey="welcomePage.features.timeline.title"
            descriptionKey="welcomePage.features.timeline.description"
          />
          
          <FeatureCard 
            titleKey="welcomePage.features.classification.title"
            descriptionKey="welcomePage.features.classification.description"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeatureTip 
            icon={<MessageCircle className="h-5 w-5" />}
            titleKey="welcomePage.tips.conversationOrg.title"
            contentKey="welcomePage.tips.conversationOrg.content"
          />
          
          <FeatureTip 
            icon={<Download className="h-5 w-5" />}
            titleKey="welcomePage.tips.flexibleExport.title"
            contentKey="welcomePage.tips.flexibleExport.content"
          />
          
          <FeatureTip 
            icon={<Database className="h-5 w-5" />}
            titleKey="welcomePage.tips.dataSecurity.title"
            contentKey="welcomePage.tips.dataSecurity.content"
          />
        </div>
      </div>

      {/* 脚本安装指引组件 - 直接内联 */}
      <div className="max-w-4xl w-full mb-6">
        <PrivacyAssurance />
      </div>
      
      {/* 页脚 */}
      <div className="w-full max-w-4xl text-center mt-4">
        <p className="text-gray-500 text-sm italic whitespace-pre-line">
          {t('welcomePage.footer.quote')}
        </p>
        <p className="text-blue-600 font-medium mt-2 text-sm">
          {t('welcomePage.footer.signature')}
        </p>
      </div>
      
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fadeIn {
            animation: fadeIn 0.5s ease-out forwards;
          }
          
          /* 控制面板容器 - 响应式定位 */
          .welcome-control-panel {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 50;
          }
          
          @media (max-width: 768px) {
            .welcome-control-panel {
              top: 16px;
              right: 16px;
            }
          }
          
          /* 控制面板样式 - 无动画版本 */
          .control-panel {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 4px;
            border-radius: 16px;
            background: var(--bg-overlay);
            box-shadow: var(--shadow-md);
          }
          
          /* 控制按钮样式 - 无动画版本 */
          .control-button {
            width: 44px;
            height: 44px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            border: none;
            outline: none;
            background: transparent;
            color: var(--text-primary);
          }
          
          .control-button:hover {
            background: var(--bg-tertiary);
          }
          
          .control-button:active {
            opacity: 0.7;
          }
          
          /* 欢迎页面基础样式 */
          .welcome-page {
            margin-top: 0;
            padding-top: 0;
            background-color: var(--bg-primary);
            transition: background-color var(--transition-normal);
          }
          
          .welcome-page h1 {
            color: var(--text-primary);
          }
          
          .welcome-page p {
            color: var(--text-secondary);
          }
          
          .welcome-page .text-gray-500 {
            color: var(--text-tertiary) !important;
          }
          
          .welcome-page .text-gray-600 {
            color: var(--text-secondary) !important;
          }
          
          .welcome-page .text-gray-700 {
            color: var(--text-secondary) !important;
          }
          
          .welcome-page .text-gray-800 {
            color: var(--text-primary) !important;
          }
          
          /* 卡片样式 */
          .welcome-page .bg-white {
            background-color: var(--bg-secondary) !important;
            border-color: var(--border-primary) !important;
            box-shadow: var(--shadow-sm) !important;
          }
          
          .welcome-page .bg-white:hover {
            box-shadow: var(--shadow-md) !important;
          }
          
          /* 图标背景 - FeatureTip组件 */
          .welcome-page .bg-orange-100 {
            background: var(--gradient-primary);
          }
          
          .welcome-page .bg-orange-100 svg {
            color: #FFFFFF !important;
          }
          
          .welcome-page .bg-gray-50 {
            background-color: var(--bg-tertiary) !important;
            border-color: var(--border-secondary) !important;
          }
          
          /* 功能卡片背景 */
          .welcome-page .bg-blue-50,
          .welcome-page .bg-purple-50,
          .welcome-page .bg-green-50 {
            background-color: var(--bg-tertiary) !important;
            border-color: var(--border-primary) !important;
          }
          
          /* 边框颜色 */
          .welcome-page .border-gray-200,
          .welcome-page .border-blue-100,
          .welcome-page .border-purple-100,
          .welcome-page .border-green-100 {
            border-color: var(--border-primary) !important;
          }
          
          .welcome-page .border-gray-100 {
            border-color: var(--border-secondary) !important;
          }
          
          /* 图标颜色 */
          .welcome-page .text-blue-600,
          .welcome-page .text-purple-600,
          .welcome-page .text-green-600 {
            color: var(--accent-primary) !important;
          }
          
          .welcome-page .text-blue-700,
          .welcome-page .text-purple-700,
          .welcome-page .text-green-700 {
            color: var(--text-primary) !important;
          }
          
          /* 隐私保障特性样式 */
          .privacy-feature {
            display: flex;
            align-items: start;
            padding: 12px;
            border-radius: 8px;
            transition: all 0.2s ease;
            background: var(--bg-tertiary);
          }
          
          .privacy-feature:hover {
            background: var(--bg-primary);
          }
          
          .privacy-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            margin-right: 12px;
            flex-shrink: 0;
            font-weight: bold;
            font-size: 14px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
          }
          
          .privacy-link {
            display: inline-flex;
            align-items: center;
            padding: 10px 16px;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s ease;
            text-decoration: none;
          }
          
          .privacy-link.primary {
            background: var(--bg-tertiary);
            color: var(--text-primary);
            border: 1px solid var(--border-primary);
          }
          
          .privacy-link.primary:hover {
            background: var(--bg-primary);
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
          }
          
          .privacy-link.secondary {
            background: var(--accent-primary);
            color: white;
          }
          
          .privacy-link.secondary:hover {
            opacity: 0.9;
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
          }
        `}
      </style>
    </div>
  );
};

export default WelcomePage;