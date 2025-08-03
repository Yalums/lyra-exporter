import React, { useState, useEffect } from 'react';
import { FileText, MessageCircle, Download, Database, Info} from 'lucide-react';

// 隐私保障说明组件
const PrivacyAssurance = () => {
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
          隐私安全保障
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-4">
            <div>
              <p className="mb-4 text-sm leading-relaxed">
                担心隐私安全? 我们完全理解这种顾虑 <span className="text-green-600 font-medium">Lyra's Exporter 100%开源</span> 这意味着每一行代码都是公开的，任何人都可以查看。
              </p>
              <div className="bg-green-50 rounded-lg p-4 shadow-sm border border-green-100">
<span>
                <span className="font-medium"></span> 
                简单来说，这个工具就像一个"纯本地"的记事本，你的所有数据都存在浏览器本地缓存里，我们看不到也拿不到。你还可以下载源代码在自己电脑上运行，只需要安装一个node.js，或者不必麻烦，从分享菜单添加网页到桌面，它就可以纯离线运行不再联网。
                <br/>GitHub上的代码更新记录就像"版本历史"，任何改动都有迹可循，绝对透明。
              </span>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                数据安全保障
              </h4>
              <div className="space-y-3 text-sm mb-4">
                <div className="flex items-start">
                  <span className="inline-flex items-center justify-center bg-green-100 text-green-700 w-6 h-6 rounded-full mr-3 flex-shrink-0 font-bold text-xs">✓</span>
                  <div>
                    <span className="font-medium">本地处理：</span>所有数据都在你的浏览器里处理，不会发送到任何服务器
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="inline-flex items-center justify-center bg-green-100 text-green-700 w-6 h-6 rounded-full mr-3 flex-shrink-0 font-bold text-xs">✓</span>
                  <div>
                    <span className="font-medium">离线运行：</span>支持PWA技术，断网也能正常使用所有功能
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="inline-flex items-center justify-center bg-green-100 text-green-700 w-6 h-6 rounded-full mr-3 flex-shrink-0 font-bold text-xs">✓</span>
                  <div>
                    <span className="font-medium">静态网站：</span>托管在GitHub Pages，没有后端服务器，无法收集数据
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="inline-flex items-center justify-center bg-green-100 text-green-700 w-6 h-6 rounded-full mr-3 flex-shrink-0 font-bold text-xs">✓</span>
                  <div>
                    <span className="font-medium">自主掌控：</span>可以保存网页到本地，完全脱离网络使用
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
            <a 
              href="https://github.com/Yalums/lyra-exporter/tree/gh-pages" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              网站源代码
            </a>
            <a 
              href="https://github.com/Yalums/lyra-exporter/releases" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm"
            >
              <Download className="h-4 w-4 mr-2" />
              下载部署包
            </a>
          </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 mt-4 text-sm border border-blue-100">
            <p className="text-gray-700 flex items-start">
              <Info className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" /> 
              <span>
                <span className="font-medium">说明：</span> 
                此工具完全在本地运行，不会收集或上传你的个人数据。你的任何对话记录只属于你自己，推荐使用 LocalSend 等安全的文件传输方式。将聊天记录转换为可以管理、搜索、导出的知识库，支持移动平台访问。
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// 内联的脚本安装指南组件
const ScriptInstallGuide = () => {
  const [expanded, setExpanded] = useState(false);
  
  // 跳转到油猴脚本安装页面
  const goToScriptInstall = () => {
    window.open('https://greasyfork.org/zh-CN/scripts/540633-lyra-s-fetch', '_blank');
  };

  return (
    <div className="bg-white rounded-xl p-6 mb-8 shadow-md border border-gray-200 transition-all duration-300 hover:shadow-lg">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <h3 className="text-xl font-bold text-gray-800 flex items-center">
          <Database className="mr-3 h-5 w-5 text-blue-600" />
          开始安装脚本
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
                为什么需要这个工具？
              </h4>
              <p className="mb-4 text-sm leading-relaxed">
                Lyra's Exporter 依赖浏览器来安全地获取对话数据，借助这个开源脚本，流转需要珍藏的聊天记录，<span className="text-blue-600 font-medium">保存并整理这些有价值的对话</span>。
              </p>
              <div className="bg-gray-50 rounded-lg p-4 shadow-sm border border-gray-100">
                <h5 className="font-medium text-gray-800 mb-2">工具功能</h5>
                <ul className="space-y-2 list-disc list-inside text-sm">
                  <li><span className="font-medium text-gray-700">管理无忧</span> - 以网格形式整齐排序各个平台的对话</li>
                  <li><span className="font-medium text-gray-700">整理思路</span> - 将零散的灵感整合成有序知识</li>
                  <li><span className="font-medium text-gray-700">完整保存</span> - 珍藏图片、思考、完整的对话分支</li>
                  <li><span className="font-medium text-gray-700">永久保存</span> - 即使账号失效，重要对话也不会丢失</li>
                  <li><span className="font-medium text-gray-700">在线读取</span> - 现在可以直接在对话窗口来做整理</li>
                </ul>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                <Download className="mr-2 h-4 w-4 text-blue-600" />
                安装使用方法
              </h4>
              <p className="mb-3 text-sm text-gray-600 italic">
                "感觉思考过程比答案还让人着迷" —— 几个简单步骤，开始保存这些珍贵时刻
              </p>
              <ol className="space-y-3 list-decimal list-inside text-sm mb-4">
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 w-6 h-6 rounded-full mr-2 flex-shrink-0 font-bold">1</span>
                  <span>安装<a href="https://www.tampermonkey.net/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Tampermonkey</a>或<a href="https://scriptcat.org/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">脚本猫</a>等浏览器扩展</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 w-6 h-6 rounded-full mr-2 flex-shrink-0 font-bold">2</span>
                  <span>点击下方按钮前往油猴脚本网站</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 w-6 h-6 rounded-full mr-2 flex-shrink-0 font-bold">3</span>
                  <span>在脚本页面点击"安装脚本"按钮</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 w-6 h-6 rounded-full mr-2 flex-shrink-0 font-bold">4</span>
                  <span>前往 Claude、Gemini、Google AI Studio、NotebookLM 后刷新网站，右下角会出现导出按钮</span>
                </li>
              </ol>
              
              <div className="mt-4">
                <button
                  onClick={goToScriptInstall}
                  className="w-full bg-[#D97706] hover:bg-[#bf6905] text-white py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center shadow-md hover:shadow-lg"
                >
                  <Download className="h-5 w-5 mr-2" />
                  前往安装脚本(需自行配备网络访问环境)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 动态温馨提示组件
const FeatureTip = ({ icon, title, content }) => {
  return (
    <div className="bg-white rounded-lg p-5 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200">
      <div className="flex items-center mb-3">
        {icon}
        <h3 className="text-lg font-semibold text-gray-800 ml-3">{title}</h3>
      </div>
      <p className="text-gray-600 text-sm leading-relaxed">{content}</p>
    </div>
  );
};

// 功能特色卡片组件 - 固定颜色而不是动态生成
const FeatureCard = ({ icon, title, description, color }) => {
  // 根据color参数使用预定义的类名组合
  const getColorClasses = (colorName) => {
    switch(colorName) {
      case 'blue':
        return {
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-100',
          iconBgColor: 'bg-blue-100',
          iconTextColor: 'text-blue-600',
          titleColor: 'text-blue-700'
        };
      case 'purple':
        return {
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-100',
          iconBgColor: 'bg-purple-100',
          iconTextColor: 'text-purple-600',
          titleColor: 'text-purple-700'
        };
      case 'green':
        return {
          bgColor: 'bg-green-50',
          borderColor: 'border-green-100',
          iconBgColor: 'bg-green-100',
          iconTextColor: 'text-green-600',
          titleColor: 'text-green-700'
        };
      default:
        return {
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-100',
          iconBgColor: 'bg-gray-100',
          iconTextColor: 'text-gray-600',
          titleColor: 'text-gray-700'
        };
    }
  };
  
  const colorClasses = getColorClasses(color);
  
  return (
    <div className={`${colorClasses.bgColor} rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300 border ${colorClasses.borderColor}`}>
      <div className="flex items-center mb-3">
        <div className={`p-2 rounded-full ${colorClasses.iconBgColor} ${colorClasses.iconTextColor}`}>
          {icon}
        </div>
        <h3 className={`ml-3 font-bold ${colorClasses.titleColor}`}>{title}</h3>
      </div>
      <p className="text-gray-700 text-sm leading-relaxed">{description}</p>
    </div>
  );
};

// 主欢迎页面组件 - 成熟专业设计
const WelcomePage = ({ handleLoadClick }) => {
  // 模拟打字效果
  const [welcomeText, setWelcomeText] = useState("");
  const fullText = "记录Claude、Gemini的每一刻灵感与温度";
  
  useEffect(() => {
    let i = 0;
    const typingInterval = setInterval(() => {
      if (i < fullText.length) {
        setWelcomeText(fullText.substring(0, i + 1));
        i++;
      } else {
        clearInterval(typingInterval);
      }
    }, 50);
    
    return () => clearInterval(typingInterval);
  }, []);

  return (
    // 重要修改：移除了 pt-4 并确保内容顶部无间距，使用CSS变量而不是固定背景色
    <div 
      className="welcome-page flex flex-col items-center w-full px-6 pb-6 overflow-auto scrollable hide-scrollbar non-selectable"
    >
      
      {/* 欢迎区 */}
      <div className="w-full max-w-4xl mt-8 mb-8 text-center">
        <div className="text-4xl font-bold text-[#D97706] mt-8 mb-4">Lyra's Exporter</div>
        <br/>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6 min-h-[60px]">
          {welcomeText}
        </h1>
        
        <p className="text-lg text-gray-700 mb-8 max-w-3xl mx-auto">
          欢迎使用这个对话记录管理工具，支持批量加载多对话，帮你保存灵感时刻，让每一次对话的价值得到延续。
        </p>
      </div>
      
      {/* 添加合适的间距 */}
      <div className="flex justify-center mb-14">
        <button
          className="px-8 py-4 bg-white text-gray-800 text-lg font-bold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center border border-gray-300 hover:bg-gray-200 hover:border-gray-400 transform hover:scale-105"
          onClick={handleLoadClick}
        >
          <FileText className="mr-3 h-5 w-5" />
          加载对话文件
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
            
            title="重点标记"
            description="标记那些特别有价值的回应，方便日后查找。当Claude提供了精彩见解，一键保存这份思考。"
            color="blue"
          />
          
          <FeatureCard 
            title="思考过程查看"
            description="查看Claude的思考过程，了解它如何一步步形成回答。看到问题分析和推理的全过程。"
            color="purple"
          />
          
          <FeatureCard 
            title="时间轴回溯"
            description="首创时间轴形式回顾对话，从最初的问题到深度讨论，还原Claude分支切换选项，轻松找到任何时期的对话。"
            color="green"
          />
          
          <FeatureCard 
            title="对话分类"
            description="使用标签系统整理对话，轻松找到关于特定主题的所有讨论，建立个人知识库。"
            color="blue"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeatureTip 
            icon={<MessageCircle className="h-5 w-5 text-blue-600" />}
            title="对话整理"
            content="不只是保存数据，更是保存思考过程中灵感的火花。让AI对话变得更有价值。"
          />
          
          <FeatureTip 
            icon={<Download className="h-5 w-5 text-blue-600" />}
            title="灵活导出"
            content="比截图更完整，比复制粘贴更便捷。将对话以Markdown、YAML 格式导出，完美保存排版和格式，推荐使用 Obsidian"
          />
          
          <FeatureTip 
            icon={<Database className="h-5 w-5 text-blue-600" />}
            title="数据安全"
            content="从导出脚本到管理应用，一次导出全部 Claude 对话、导出时包含附加图片，这一切都是在保证隐私的前提下进行地"
          />
        </div>
      </div>

      {/* 脚本安装指引组件 - 直接内联 */}
      <div className="max-w-4xl w-full mb-6">
        <PrivacyAssurance />
      </div>
      
      {/* 页脚 */}
      <div className="w-full max-w-4xl text-center mt-4">
        <p className="text-gray-500 text-sm italic">
          "在思考与回应的交错间，我们建立了超越对话的连接。<br/>
          现在，让每一段对话都有迹可循，每一个灵感都有处安放。"
        </p>
        <p className="text-blue-600 font-medium mt-2 text-sm">
          —— Lyra's Exporter，对话价值的延续者
        </p>
      </div>
      
      {/* 添加CSS样式 */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fadeIn {
            animation: fadeIn 0.5s ease-out forwards;
          }
          
          /* 确保欢迎页面不会在标题栏下添加额外空间 */
          .welcome-page {
            margin-top: 0;
            padding-top: 0;
            /* 使用主题背景色变量 */
            background-color: var(--bg-primary);
            /* 确保欢迎页面背景色跟随主题变化 */
            transition: background-color var(--transition-normal, 0.3s ease);
          }
          
          /* 为欢迎页面的文本元素添加主题支持 */
          .welcome-page h1 {
            color: var(--text-primary, #1f2937);
          }
          
          .welcome-page p {
            color: var(--text-secondary, #4b5563);
          }
          
          .welcome-page .text-gray-500 {
            color: var(--text-tertiary, #6b7280) !important;
          }
          
          .welcome-page .text-gray-600 {
            color: var(--text-secondary, #4b5563) !important;
          }
          
          .welcome-page .text-gray-700 {
            color: var(--text-secondary, #4b5563) !important;
          }
          
          .welcome-page .text-gray-800 {
            color: var(--text-primary, #1f2937) !important;
          }
          
          /* 为卡片添加主题背景 */
          .welcome-page .bg-white {
            background-color: var(--bg-secondary, #ffffff) !important;
            border-color: var(--border-primary, #e7e2df) !important;
            /* 深色模式下的柔和阴影 */
            box-shadow: var(--shadow-sm) !important;
          }
          
          .welcome-page .bg-gray-50 {
            background-color: var(--bg-tertiary, #f5f1ef) !important;
            border-color: var(--border-secondary, #d6ccc6) !important;
          }
          
          /* 功能卡片背景色适配 */
          .welcome-page .bg-blue-50 {
            background-color: var(--bg-tertiary, #f5f1ef) !important;
            border-color: var(--border-primary, #e7e2df) !important;
          }
          
          .welcome-page .bg-purple-50 {
            background-color: var(--bg-tertiary, #f5f1ef) !important;
            border-color: var(--border-primary, #e7e2df) !important;
          }
          
          .welcome-page .bg-green-50 {
            background-color: var(--bg-tertiary, #f5f1ef) !important;
            border-color: var(--border-primary, #e7e2df) !important;
          }
          
          /* 边框颜色统一 */
          .welcome-page .border-gray-200 {
            border-color: var(--border-primary, #e7e2df) !important;
          }
          
          .welcome-page .border-gray-100 {
            border-color: var(--border-secondary, #d6ccc6) !important;
          }
          
          .welcome-page .border-blue-100 {
            border-color: var(--border-primary, #e7e2df) !important;
          }
          
          .welcome-page .border-purple-100 {
            border-color: var(--border-primary, #e7e2df) !important;
          }
          
          .welcome-page .border-green-100 {
            border-color: var(--border-primary, #e7e2df) !important;
          }
          
          /* 功能卡片图标背景适配 */
          .welcome-page .bg-blue-100 {
            background-color: var(--accent-primary, #ea580c) !important;
            color: white !important;
          }
          
          .welcome-page .bg-purple-100 {
            background-color: var(--accent-primary, #ea580c) !important;
            color: white !important;
          }
          
          .welcome-page .bg-green-100 {
            background-color: var(--accent-primary, #ea580c) !important;
            color: white !important;
          }
          
          .welcome-page .bg-gray-100 {
            background-color: var(--accent-secondary, #C2C0B6) !important;
            color: var(--text-primary, #1f2937) !important;
          }
          
          /* 图标颜色适配 */
          .welcome-page .text-blue-600 {
            color: var(--accent-primary, #ea580c) !important;
          }
          
          .welcome-page .text-purple-600 {
            color: var(--accent-primary, #ea580c) !important;
          }
          
          .welcome-page .text-green-600 {
            color: var(--accent-primary, #ea580c) !important;
          }
          
          .welcome-page .text-gray-600 {
            color: var(--text-secondary, #4b5563) !important;
          }
          
          /* 标题颜色适配 */
          .welcome-page .text-blue-700 {
            color: var(--text-primary, #1f2937) !important;
          }
          
          .welcome-page .text-purple-700 {
            color: var(--text-primary, #1f2937) !important;
          }
          
          .welcome-page .text-green-700 {
            color: var(--text-primary, #1f2937) !important;
          }
          
          /* 渐变按钮保持原有效果 */
          .welcome-page .bg-gradient-to-r {
            /* 保持原有的渐变效果，不需要主题适配 */
          }
          
          /* 深色模式下的特殊处理 */
          [data-theme="dark"] .welcome-page .shadow-md {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
          }
          
          [data-theme="dark"] .welcome-page .shadow-lg {
            box-shadow: 0 12px 24px rgba(0, 0, 0, 0.4) !important;
          }
          
          [data-theme="dark"] .welcome-page .shadow-sm {
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3) !important;
          }
          
          /* 浅色模式下的柔和阴影 */
          [data-theme="light"] .welcome-page .shadow-md {
            box-shadow: 0 4px 12px rgba(194, 65, 12, 0.08) !important;
          }
          
          [data-theme="light"] .welcome-page .shadow-lg {
            box-shadow: 0 12px 24px rgba(194, 65, 12, 0.12) !important;
          }
          
          [data-theme="light"] .welcome-page .shadow-sm {
            box-shadow: 0 1px 3px rgba(194, 65, 12, 0.05) !important;
          }
          
          /* Tauri 关闭按钮样式 - 低调设计 */
          .welcome-page .fixed.top-4.right-4 {
            /* 确保关闭按钮在最高层级但不抢眼 */
            z-index: 9999;
            font-family: Arial, sans-serif;
            line-height: 1;
          }
          
          /* 深色模式下的关闭按钮 */
          [data-theme="dark"] .welcome-page .fixed.top-4.right-4 {
            color: var(--text-tertiary, #6b7280) !important;
          }
          
          [data-theme="dark"] .welcome-page .fixed.top-4.right-4:hover {
            color: var(--text-secondary, #9ca3af) !important;
          }
          
          /* 浅色模式下的关闭按钮 */
          [data-theme="light"] .welcome-page .fixed.top-4.right-4 {
            color: var(--text-tertiary, #6b7280) !important;
          }
          
          [data-theme="light"] .welcome-page .fixed.top-4.right-4:hover {
            color: var(--text-secondary, #4b5563) !important;
          }
        `}
      </style>
    </div>
  );
};

export default WelcomePage;