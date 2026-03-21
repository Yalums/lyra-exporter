// components/SettingsPanel.js
// Settings panel for GitHub Pages / standalone mode (mirrors popup.js functionality)
import React, { useState, useEffect } from 'react';
import StorageManager from '../utils/data/storageManager.js';
import { useI18n } from '../index.js';

const EXPORT_CONFIG_KEY = 'export-config';
const THEME_KEY = 'app-theme';

const DEFAULTS = {
  // Format
  includeNumbering: true,
  numberingFormat: 'numeric',
  senderFormat: 'default',
  humanLabel: 'Human',
  assistantLabel: 'Assistant',
  includeHeaderPrefix: true,
  headerLevel: 2,
  thinkingFormat: 'codeblock',
  includeBranchMarkers: true,
  // Content
  includeTimestamps: false,
  includeThinking: false,
  includeArtifacts: true,
  includeTools: false,
  includeCitations: false,
  includeAttachments: true,
  // Claude extras
  includeProjectInfo: false,
  includeUserMemory: false,
  // Appearance
  theme: 'dark',
};

export default function SettingsPanel({ onClose, exportOptions, setExportOptions }) {
  const { t, currentLanguage } = useI18n();
  const zh = currentLanguage === 'zh';

  const [cfg, setCfg] = useState(() => ({
    ...DEFAULTS,
    ...StorageManager.get(EXPORT_CONFIG_KEY, {}),
    theme: StorageManager.get(THEME_KEY, 'dark'),
  }));
  const [saved, setSaved] = useState(false);

  // Persist on every change (theme only applied immediately; exportOptions synced on close)
  useEffect(() => {
    const { theme, ...exportCfg } = cfg;
    StorageManager.set(EXPORT_CONFIG_KEY, exportCfg);
    StorageManager.set(THEME_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
    // Sync settings to userscript opener (e.g. claude.ai tab) via postMessage
    console.log('[Loominary] SettingsPanel: window.opener =', window.opener, '| posting config:', JSON.stringify(exportCfg));
    if (window.opener) {
      window.opener.postMessage({ type: 'LOOMINARY_SETTINGS_UPDATE', config: exportCfg }, '*');
    }
  }, [cfg]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync exportOptions to App.js only when panel closes (avoids scroll-to-top on every keystroke)
  const syncExportOptionsAndClose = () => {
    if (setExportOptions) {
      setExportOptions(prev => ({
        ...prev,
        includeTimestamps: cfg.includeTimestamps,
        includeThinking: cfg.includeThinking,
        includeArtifacts: cfg.includeArtifacts,
        includeTools: cfg.includeTools,
        includeCitations: cfg.includeCitations,
        includeAttachments: cfg.includeAttachments,
      }));
    }
    onClose();
  };

  const set = (key, value) => {
    setCfg(prev => ({ ...prev, [key]: value }));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const Toggle = ({ label, desc, cfgKey }) => (
    <label className="setting-item" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <span>
        <span style={{ fontWeight: 500 }}>{label}</span>
        {desc && <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-tertiary)', marginTop: 2 }}>{desc}</span>}
      </span>
      <input
        type="checkbox"
        checked={!!cfg[cfgKey]}
        onChange={e => set(cfgKey, e.target.checked)}
        style={{ width: 16, height: 16, flexShrink: 0, marginLeft: 12 }}
      />
    </label>
  );

  const Select = ({ label, cfgKey, options }) => (
    <div className="setting-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <span style={{ fontWeight: 500 }}>{label}</span>
      <select
        value={cfg[cfgKey]}
        onChange={e => set(cfgKey, e.target.value)}
        style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '3px 6px', fontSize: 13 }}
      >
        {options.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
      </select>
    </div>
  );

  const SectionHeader = ({ title, desc }) => (
    <div style={{ marginTop: 18, marginBottom: 6 }}>
      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</div>
      {desc && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{desc}</div>}
    </div>
  );

  const s = zh ? {
    title: '设置', close: '×', saved: '已保存',
    appearance: '外观', theme: '主题', dark: '🌙 深色', light: '☀️ 浅色',
    format: '导出格式',
    numbering: '序号', noNumbering: '无',
    senderLabel: '发送者标签',
    senderDefault: '默认（用户 / AI）', senderHumanAssistant: 'Human / Assistant', senderCustom: '自定义',
    human: '用户名', assistant: 'AI 名称',
    headerPrefix: '标题前缀', headerNone: '无',
    thinkingFmt: '思考过程格式', codeblock: '代码块', xml: 'XML 标签', emoji: '表情符号',
    content: '导出内容', contentDesc: '控制导出 Markdown 时包含的内容',
    timestamps: '时间戳', timestampsDesc: '消息发送时间',
    thinking: '思考过程', thinkingDesc: 'AI 内部思考',
    artifacts: 'Artifacts', artifactsDesc: '代码、文档等生成内容',
    tools: '工具使用', toolsDesc: '搜索、计算等工具调用',
    citations: '引用来源', citationsDesc: '网页链接等引用',
    attachments: '附件', attachmentsDesc: '用户上传的文件',
    branchMarkers: '分支标识符', branchMarkersDesc: '导出时包含分支标记',
    claudeExtras: 'Claude 附加信息',
    projectInfo: '项目信息', projectInfoDesc: '对话所属项目',
    userMemory: '用户记忆', userMemoryDesc: '用户记忆内容',
  } : {
    title: 'Settings', close: '×', saved: 'Saved',
    appearance: 'Appearance', theme: 'Theme', dark: '🌙 Dark', light: '☀️ Light',
    format: 'Export Format',
    numbering: 'Numbering', noNumbering: 'None',
    senderLabel: 'Sender Label',
    senderDefault: 'Default (User / AI)', senderHumanAssistant: 'Human / Assistant', senderCustom: 'Custom',
    human: 'Human label', assistant: 'Assistant label',
    headerPrefix: 'Header Prefix', headerNone: 'None',
    thinkingFmt: 'Thinking Format', codeblock: 'Code Block', xml: 'XML Tags', emoji: 'Emoji',
    content: 'Export Content', contentDesc: 'Control what is included in exported Markdown',
    timestamps: 'Timestamps', timestampsDesc: 'Message send times',
    thinking: 'Thinking', thinkingDesc: 'AI internal reasoning',
    artifacts: 'Artifacts', artifactsDesc: 'Code, docs, and generated content',
    tools: 'Tool Use', toolsDesc: 'Search, compute, and other tool calls',
    citations: 'Citations', citationsDesc: 'Web links and references',
    attachments: 'Attachments', attachmentsDesc: 'User-uploaded files',
    branchMarkers: 'Branch Markers', branchMarkersDesc: 'Include branch markers in export',
    claudeExtras: 'Claude Extras',
    projectInfo: 'Project Info', projectInfoDesc: 'Conversation project context',
    userMemory: 'User Memory', userMemoryDesc: 'User memory content',
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) syncExportOptionsAndClose(); }}
    >
      <div
        className="settings-panel-ubuntu"
        style={{ background: 'var(--bg-primary)', borderRadius: 12, width: 640, maxWidth: '96vw', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-xl)' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <span style={{ fontWeight: 600, fontSize: 16 }}>{s.title}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {saved && <span style={{ fontSize: 12, color: 'var(--accent-primary)' }}>{s.saved}</span>}
            <button onClick={syncExportOptionsAndClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-secondary)', lineHeight: 1 }}>{s.close}</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '8px 20px 20px' }}>

          {/* Appearance — full width */}
          <SectionHeader title={s.appearance} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', marginBottom: 10 }}>
            <span style={{ fontWeight: 500 }}>{s.theme}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {[['dark', s.dark], ['light', s.light]].map(([val, lbl]) => (
                <button key={val} onClick={() => set('theme', val)}
                  style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid', fontSize: 13, cursor: 'pointer',
                    borderColor: cfg.theme === val ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    background: cfg.theme === val ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                    color: cfg.theme === val ? '#fff' : 'var(--text-primary)' }}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Two-column grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>

            {/* Left column: Format */}
            <div>
              <SectionHeader title={s.format} />
              <Select label={s.numbering} cfgKey="numberingFormat" options={[
                ['numeric', '1. 2. 3.'], ['alpha', 'a. b. c.'], ['roman', 'I. II. III.'], ['none', s.noNumbering]
              ]} />
              <Select label={s.senderLabel} cfgKey="senderFormat" options={[
                ['default', s.senderDefault], ['human-assistant', s.senderHumanAssistant], ['custom', s.senderCustom]
              ]} />
              {cfg.senderFormat === 'custom' && (
                <div style={{ paddingLeft: 10, borderLeft: '2px solid var(--border-subtle)', marginBottom: 4 }}>
                  {[['humanLabel', s.human], ['assistantLabel', s.assistant]].map(([key, label]) => (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
                      <input
                        type="text"
                        value={cfg[key]}
                        onChange={e => set(key, e.target.value)}
                        style={{ width: 90, background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '3px 6px', fontSize: 12 }}
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className="setting-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontWeight: 500 }}>{s.headerPrefix}</span>
                <select
                  value={cfg.includeHeaderPrefix ? String(cfg.headerLevel || 2) : 'none'}
                  onChange={e => {
                    if (e.target.value === 'none') set('includeHeaderPrefix', false);
                    else { set('includeHeaderPrefix', true); set('headerLevel', parseInt(e.target.value, 10)); }
                  }}
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '3px 6px', fontSize: 13 }}
                >
                  <option value="none">{s.headerNone}</option>
                  <option value="2">H2</option>
                  <option value="3">H3</option>
                  <option value="4">H4</option>
                </select>
              </div>
              <Select label={s.thinkingFmt} cfgKey="thinkingFormat" options={[
                ['codeblock', s.codeblock], ['xml', s.xml], ['emoji', s.emoji]
              ]} />
              <Toggle label={s.branchMarkers} desc={s.branchMarkersDesc} cfgKey="includeBranchMarkers" />

              <SectionHeader title={s.claudeExtras} />
              <Toggle label={s.projectInfo} desc={s.projectInfoDesc} cfgKey="includeProjectInfo" />
              <Toggle label={s.userMemory} desc={s.userMemoryDesc} cfgKey="includeUserMemory" />
            </div>

            {/* Right column: Content */}
            <div>
              <SectionHeader title={s.content} desc={s.contentDesc} />
              <Toggle label={s.timestamps} desc={s.timestampsDesc} cfgKey="includeTimestamps" />
              <Toggle label={s.thinking} desc={s.thinkingDesc} cfgKey="includeThinking" />
              <Toggle label={s.artifacts} desc={s.artifactsDesc} cfgKey="includeArtifacts" />
              <Toggle label={s.tools} desc={s.toolsDesc} cfgKey="includeTools" />
              <Toggle label={s.citations} desc={s.citationsDesc} cfgKey="includeCitations" />
              <Toggle label={s.attachments} desc={s.attachmentsDesc} cfgKey="includeAttachments" />
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
