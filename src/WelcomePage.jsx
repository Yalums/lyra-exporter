import { useState, useEffect, useRef } from "react";
import './styles/variables.css';
import './styles/WelcomePage.css';

import claudeIcon from './assets/icons/Claude.svg';
import chatgptIcon from './assets/icons/ChatGPT.svg';
import geminiIcon from './assets/icons/Gemini.svg';
import grokIcon from './assets/icons/Grok.svg';
import notebookLMIcon from './assets/icons/NotebookLM.svg';
import sillyTavernIcon from './assets/icons/SillyTavern.png';

// Lucide-react icons to replace Font Awesome
import {
  Search, Tag, GitBranch, Star,
  FileOutput, Image, Box, Wrench, Quote, Layers,
  Puzzle, Download, Sparkles, Brain,
  FileText,
} from 'lucide-react';

function useInView(threshold = 0.1) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold, rootMargin: "0px 0px -60px 0px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function Anim({ children, delay = 0, className = "" }) {
  const [ref, vis] = useInView();
  return (
    <div ref={ref} className={className} style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(28px)", transition: `all 0.8s cubic-bezier(0.22,1,0.36,1) ${delay}s` }}>
      {children}
    </div>
  );
}

function Glass({ children, aura = "primary", className = "", style = {} }) {
  return (
    <div className={`wp-glass wp-aura-${aura} ${className}`} style={style}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <div style={{ position:"relative",zIndex:1 }}>{children}</div>
    </div>
  );
}

function TagPill({ children }) {
  return <span className="wp-tag">{children}</span>;
}

function PlatformIcon({ src, title, mono }) {
  return (
    <div title={title} className="wp-platform-icon">
      <img src={src} alt={title} className={`wp-platform-img${mono ? ' wp-platform-img-mono' : ''}`} />
    </div>
  );
}

const features = [
  { icon: Search, title: "智能搜索", desc: "Real-time search across message content and titles. Supports semantic search with embedding models.", tags: ["Content", "Semantic", "Images"], aura: "primary" },
  { icon: Tag, title: "标签系统", desc: "Mark messages as completed, important, or deleted. Tag states persist across sessions and export.", tags: ["Done", "Important", "Cleanup"], aura: "secondary" },
  { icon: GitBranch, title: "分支检测", desc: "Auto-detect and visualize conversation branches. One-click jump to the latest branch.", tags: ["Visualize", "Jump"], aura: "accent" },
  { icon: Star, title: "收藏管理", desc: "Preserves Claude's conversation favorites. Mark, filter, and reset stars with real-time stats.", tags: ["Favorites", "Stats"], aura: "primary" },
];

const parsers = [
  { icon: Image, title: "图像附件", sub: "Thumbnails + full view", aura: "primary" },
  { icon: Brain, title: "思维过程", sub: "Collapsible display", aura: "secondary" },
  { icon: Box, title: "Artifacts", sub: "Code, docs, charts", aura: "accent" },
  { icon: Wrench, title: "工具调用", sub: "Search, execute, read", aura: "secondary" },
  { icon: Quote, title: "引用溯源", sub: "Reference sources", aura: "primary" },
  { icon: Layers, title: "多标签视图", sub: "Content / Think / Art", aura: "accent" },
];

const steps = [
  { num: "01", title: "导出对话", desc: "Use Loominary to export from any supported platform", aura: "primary" },
  { num: "02", title: "精选内容", desc: "Identify 3–5 related conversations worth organizing", aura: "secondary" },
  { num: "03", title: "投喂分析", desc: "Feed them to NotebookLM for analysis and synthesis", aura: "accent" },
  { num: "04", title: "归档沉淀", desc: "Archive refined insights in Obsidian", aura: "primary" },
];

const platforms = [
  { src: claudeIcon, title: "Claude", mono: true },
  { src: chatgptIcon, title: "ChatGPT", mono: true },
  { src: geminiIcon, title: "Gemini" },
  { src: grokIcon, title: "Grok", mono: true },
  { src: notebookLMIcon, title: "NotebookLM" },
  { src: sillyTavernIcon, title: "SillyTavern" },
];

// Detect system preferred color scheme
function getSystemTheme() {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

export default function LoominaryLanding() {
  // Theme: system detection → storage override → live update from popup
  useEffect(() => {
    // Ensure html/body allow scrolling for standalone page
    document.documentElement.style.height = '100%';
    document.documentElement.style.overflow = 'auto';
    document.body.style.height = '100%';
    document.body.style.overflow = 'auto';
    document.body.style.margin = '0';

    // eslint-disable-next-line no-undef
    const chromeApi = typeof chrome !== 'undefined' ? chrome : null;
    const hasChromeStorage = chromeApi && chromeApi.storage && chromeApi.storage.local;

    // 1. Apply system theme as default
    applyTheme(getSystemTheme());

    // 2. Override with stored preference (if any)
    if (hasChromeStorage) {
      chromeApi.storage.local.get('loominary_export_config', (result) => {
        const theme = result?.loominary_export_config?.theme;
        if (theme) applyTheme(theme);
      });
    } else {
      try {
        const stored = localStorage.getItem('app-theme');
        if (stored) applyTheme(stored);
      } catch (e) { /* ignore */ }
    }

    // 3. Listen for live theme changes from popup / settings
    let storageListener;
    if (hasChromeStorage && chromeApi.storage.onChanged) {
      storageListener = (changes) => {
        const configChange = changes.loominary_export_config;
        if (configChange?.newValue?.theme) {
          applyTheme(configChange.newValue.theme);
        }
      };
      chromeApi.storage.onChanged.addListener(storageListener);
    }

    // 4. Listen for system theme changes (e.g. OS dark/light switch)
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      // Only auto-follow system if no manual override is stored
      if (hasChromeStorage) {
        chromeApi.storage.local.get('loominary_export_config', (result) => {
          if (!result?.loominary_export_config?.theme) {
            applyTheme(getSystemTheme());
          }
        });
      } else {
        try {
          if (!localStorage.getItem('app-theme')) {
            applyTheme(getSystemTheme());
          }
        } catch (e) { /* ignore */ }
      }
    };
    mql.addEventListener('change', handleSystemChange);

    // Load Google Fonts
    if (!document.getElementById('wp-fonts')) {
      const link = document.createElement('link');
      link.id = 'wp-fonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700;900&family=Poppins:wght@200;300;400;500;600&display=swap';
      document.head.appendChild(link);
    }

    return () => {
      document.documentElement.style.height = '';
      document.documentElement.style.overflow = '';
      document.body.style.height = '';
      document.body.style.overflow = '';
      mql.removeEventListener('change', handleSystemChange);
      if (storageListener && hasChromeStorage) {
        chromeApi.storage.onChanged.removeListener(storageListener);
      }
    };
  }, []);

  return (
    <div className="wp-root">
      <div className="wp-bg-fixed" />

      <div style={{ position:"relative",zIndex:10 }}>

        {/* Header */}
        <header>
          <div style={{ maxWidth:"80rem",margin:"0 auto",padding:"2rem 1.5rem 1rem" }}>
            <nav style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"4rem" }}>
              <div style={{ display:"flex",alignItems:"center",gap:"0.75rem" }}>
                <span className="wp-logo-text">Loominary</span>
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:"1.25rem" }}>
                <a href="https://github.com/Yalums/lyra-exporter" target="_blank" rel="noreferrer" className="wp-nav-link">GitHub</a>
                <a href="../index.html?fresh=1" className="wp-nav-btn">Open App</a>
              </div>
            </nav>

            <div style={{ maxWidth:"48rem",marginBottom:"5rem" }}>
              <Anim delay={0.1}><p className="wp-label" style={{ marginBottom:"1.25rem" }}>Conversation Archive &amp; Export Tool</p></Anim>
              <Anim delay={0.2}>
                <h1 style={{ fontFamily:"'Noto Serif SC',serif",fontWeight:900,fontSize:"clamp(2.8rem,6vw,4.2rem)",lineHeight:1.05,marginBottom:"1.5rem" }}>
                  织光而行<br />
                  <span className="wp-hero-sub">Weave Light. Walk Forward.</span>
                </h1>
              </Anim>
              <Anim delay={0.3}><p className="wp-hero-desc">A feature-rich tool to manage and export conversations from Claude, ChatGPT, Gemini, Grok, NotebookLM &amp; AI Studio.</p></Anim>
              <Anim delay={0.4}>
                <div style={{ display:"flex",alignItems:"center",gap:"0.625rem",marginTop:"2rem",flexWrap:"wrap" }}>
                  {platforms.map(p => <PlatformIcon key={p.title} src={p.src} title={p.title} mono={p.mono} />)}
                </div>
              </Anim>
            </div>
          </div>
          <div className="wp-shimmer-bar" />
        </header>

        {/* Main: Search & Manage */}
        <main style={{ maxWidth:"80rem",margin:"0 auto",padding:"5rem 1.5rem" }}>
          <section className="wp-asym-grid" style={{ marginBottom:"6rem" }}>
            <div style={{ paddingTop:"0.5rem" }}>
              <div className="wp-anchor-glyph">搜</div>
              <p className="wp-label" style={{ marginTop:"1rem" }}>Search &amp; Manage</p>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem" }}>
              {features.map((f, i) => (
                <Anim key={f.title} delay={0.3 + i * 0.1}>
                  <Glass aura={f.aura} style={{ padding:"1.25rem" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:"0.625rem",marginBottom:"0.75rem" }}>
                      <f.icon size={16} className="wp-icon-accent" />
                      <span className="wp-card-title">{f.title}</span>
                    </div>
                    <p className="wp-card-desc">{f.desc}</p>
                    <div style={{ display:"flex",flexWrap:"wrap",gap:"0.375rem" }}>
                      {f.tags.map(t => <TagPill key={t}>{t}</TagPill>)}
                    </div>
                  </Glass>
                </Anim>
              ))}
            </div>
          </section>

          {/* Export */}
          <section className="wp-asym-grid" style={{ marginBottom:"6rem" }}>
            <div style={{ paddingTop:"0.5rem" }}>
              <div className="wp-anchor-glyph">织</div>
              <p className="wp-label" style={{ marginTop:"1rem" }}>Export &amp; Weave</p>
            </div>
            <div>
              <Anim delay={0.3}>
                <Glass aura="secondary" style={{ padding:"1.5rem",marginBottom:"1rem" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:"0.625rem",marginBottom:"1rem" }}>
                    <FileOutput size={16} className="wp-icon-accent" />
                    <span style={{ fontFamily:"'Noto Serif SC',serif",fontWeight:700,fontSize:"1.125rem" }}>多格式导出</span>
                    <span className="wp-text-muted" style={{ marginLeft:"auto" }}>Flexible output</span>
                  </div>
                  <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.75rem" }}>
                    {[
                      { icon: FileText, label: "Markdown", sub: "Code highlights" },
                      { icon: FileText, label: "PDF", sub: "LaTeX + images" },
                      { icon: Image, label: "Screenshot", sub: "Long capture" },
                    ].map(({ icon: Icon, label, sub }) => (
                      <div key={label} className="wp-export-format-card">
                        <Icon size={20} className="wp-icon-accent" style={{ display:"block",margin:"0 auto 0.375rem" }} />
                        <span style={{ fontSize:"0.75rem",fontWeight:400,display:"block" }}>{label}</span>
                        <span className="wp-text-muted" style={{ fontSize:"0.6rem",display:"block",marginTop:"0.125rem" }}>{sub}</span>
                      </div>
                    ))}
                  </div>
                </Glass>
              </Anim>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem" }}>
                <Anim delay={0.4}>
                  <Glass aura="accent" style={{ padding:"1.25rem" }}>
                    <span className="wp-card-title" style={{ display:"block",marginBottom:"0.5rem" }}>导出范围</span>
                    <p className="wp-card-desc">Current, operated, all, or latest branches — batch to ZIP.</p>
                  </Glass>
                </Anim>
                <Anim delay={0.5}>
                  <Glass aura="primary" style={{ padding:"1.25rem" }}>
                    <span className="wp-card-title" style={{ display:"block",marginBottom:"0.5rem" }}>内容筛选</span>
                    <p className="wp-card-desc">Timestamps, thinking, Artifacts, tool usage, citations.</p>
                  </Glass>
                </Anim>
              </div>
            </div>
          </section>

          {/* Parsers */}
          <section className="wp-asym-grid">
            <div style={{ paddingTop:"0.5rem" }}>
              <div className="wp-anchor-glyph">光</div>
              <p className="wp-label" style={{ marginTop:"1rem" }}>Parse &amp; Illuminate</p>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1rem" }}>
              {parsers.map((p, i) => (
                <Anim key={p.title} delay={0.3 + i * 0.1}>
                  <Glass aura={p.aura} style={{ padding:"1rem",textAlign:"center" }}>
                    <div style={{ padding:"0.5rem 0" }}>
                      <p.icon size={20} className="wp-icon-accent" style={{ display:"block",margin:"0 auto 0.625rem" }} />
                      <span className="wp-card-title" style={{ display:"block",marginBottom:"0.25rem" }}>{p.title}</span>
                      <span className="wp-text-muted" style={{ fontSize:"0.62rem" }}>{p.sub}</span>
                    </div>
                  </Glass>
                </Anim>
              ))}
            </div>
          </section>
        </main>

        {/* Workflow */}
        <section className="wp-workflow-section">
          <div className="wp-workflow-backdrop" />
          <div style={{ position:"relative",zIndex:10,maxWidth:"80rem",margin:"0 auto",padding:"0 1.5rem",display:"grid",gridTemplateColumns:"1fr 2fr",gap:"3rem",alignItems:"center" }}>
            <div>
              <p className="wp-label" style={{ marginBottom:"0.75rem" }}>Recommended Workflow</p>
              <h2 style={{ fontFamily:"'Noto Serif SC',serif",fontWeight:900,fontSize:"1.875rem",lineHeight:1.2,marginBottom:"0.75rem" }}>推荐工作流</h2>
              <p className="wp-card-desc">Export, curate, synthesize, archive.</p>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:"1.25rem" }}>
              {steps.map((s, i) => (
                <Anim key={s.num} delay={0.2 + i * 0.1}>
                  <div style={{ position:"relative",paddingLeft:"2.5rem" }}>
                    {i < steps.length - 1 && <div className="wp-step-line" />}
                    <div className="wp-step-dot" />
                    <Glass aura={s.aura} style={{ padding:"1rem" }}>
                      <div style={{ display:"flex",alignItems:"flex-start",gap:"0.75rem" }}>
                        <span className="wp-step-badge">Step {s.num}</span>
                        <div>
                          <span className="wp-card-title">{s.title}</span>
                          <p className="wp-card-desc" style={{ marginTop:"0.125rem" }}>{s.desc}</p>
                        </div>
                      </div>
                    </Glass>
                  </div>
                </Anim>
              ))}
            </div>
          </div>
        </section>

        {/* Quick Start */}
        <section style={{ maxWidth:"80rem",margin:"0 auto",padding:"4rem 1.5rem" }}>
          <div style={{ textAlign:"center",marginBottom:"3rem" }}>
            <p className="wp-label" style={{ marginBottom:"0.75rem" }}>Get Started</p>
            <h2 style={{ fontFamily:"'Noto Serif SC',serif",fontWeight:900,fontSize:"1.875rem" }}>快速开始</h2>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1.25rem",maxWidth:"48rem",margin:"0 auto" }}>
            {[
              { icon: Puzzle, title: "安装脚本", desc: "Install Tampermonkey + Loominary Fetch script", aura: "primary" },
              { icon: Download, title: "获取数据", desc: "Visit any AI platform, click export", aura: "secondary" },
              { icon: Sparkles, title: "管理导出", desc: "Search, tag, filter, export to MD / PDF", aura: "accent" },
            ].map((s, i) => (
              <Anim key={s.title} delay={0.2 + i * 0.1}>
                <Glass aura={s.aura} style={{ padding:"1.25rem",textAlign:"center" }}>
                  <div className="wp-quickstart-icon">
                    <s.icon size={18} className="wp-icon-accent" />
                  </div>
                  <span className="wp-card-title" style={{ display:"block",marginBottom:"0.375rem" }}>{s.title}</span>
                  <p className="wp-card-desc">{s.desc}</p>
                </Glass>
              </Anim>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="wp-footer">
          <div style={{ maxWidth:"80rem",margin:"0 auto" }}>
            <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:"2rem" }}>
              <div>
                <div style={{ display:"flex",alignItems:"center",gap:"0.625rem",marginBottom:"1rem" }}>
                  <span style={{ fontSize:"0.875rem",fontWeight:500,letterSpacing:"0.08em" }}>Loominary</span>
                </div>
                <p style={{ fontSize:"0.75rem",fontWeight:200,lineHeight:1.7,maxWidth:"16rem",opacity:0.6 }}>A personal project co-created with Claude. Open-source, privacy-first.</p>
                <p style={{ fontSize:"0.6rem",fontWeight:200,marginTop:"1rem",opacity:0.4 }}>Formerly Lyra Exporter</p>
              </div>
              {[
                { title: "Resources", items: [{ t: "GitHub", href: "https://github.com/Yalums/lyra-exporter" }, { t: "Companion Script", href: "https://greasyfork.org/en/scripts/539579-lyra-s-exporter-fetch" }, { t: "Tampermonkey", href: "https://www.tampermonkey.net/" }] },
                { title: "Platforms", items: [{ t: "Claude" }, { t: "ChatGPT" }, { t: "Gemini" }, { t: "Grok · NotebookLM" }] },
                { title: "Export", items: [{ t: "Markdown" }, { t: "PDF + LaTeX" }, { t: "Long Screenshot" }, { t: "Batch ZIP" }] },
              ].map(col => (
                <div key={col.title}>
                  <span style={{ fontSize:"0.65rem",fontWeight:500,letterSpacing:"0.15em",textTransform:"uppercase",display:"block",marginBottom:"1rem",opacity:0.6 }}>{col.title}</span>
                  <div style={{ display:"flex",flexDirection:"column",gap:"0.625rem" }}>
                    {col.items.map(it => it.href
                      ? <a key={it.t} href={it.href} target="_blank" rel="noreferrer" className="wp-footer-link">{it.t}</a>
                      : <span key={it.t} style={{ fontSize:"0.75rem",fontWeight:300,opacity:0.7 }}>{it.t}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="wp-footer-bottom">
              <span>&copy; 2026 Loominary. MIT License.</span>
              <span style={{ letterSpacing:"0.1em" }}>WEAVE LIGHT. WALK FORWARD.</span>
            </div>
            <div className="wp-footer-attribution">
              PDF export uses <a href="https://hyperos.mi.com/font" target="_blank" rel="noopener noreferrer">MiSans</a> font, &copy; Xiaomi. Used under the MiSans Font IP License.
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}
