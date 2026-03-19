#!/usr/bin/env python3
"""
用于将模块化的 JavaScript 源文件合并成 Userscript 和 Chrome 扩展

Usage:
    python build.py              # 构建完整版（Userscript + Extension）
    python build.py all          # 构建完整版（Userscript + Extension）
    python build.py userscript   # 只构建 Userscript
    python build.py extension    # 只构建 Chrome 扩展（所有平台）
    python build.py extension claude   # 只构建 Chrome 扩展（仅 Claude 平台）
    python build.py firefox      # 构建 Firefox 扩展（基于 Chrome 扩展产物）
    python build.py firefox claude     # 仅 Claude 平台的 Firefox 扩展
    python build.py claude       # 只构建 Claude 版本（Userscript）
    python build.py chatgpt      # 只构建 ChatGPT 版本（Userscript）
    python build.py gemini       # 只构建 Gemini 版本（Userscript）

架构说明：
    - src/ 目录是唯一的代码来源
    - dist/ 输出 Userscript 构建结果
    - extension/ 输出 Chrome 扩展构建结果
    - 修改代码时只需修改 src/ 目录下的文件，然后运行 build.py
"""

import sys
import os
import re
import shutil
import json
import subprocess
from pathlib import Path
from datetime import datetime

# 设置 UTF-8 输出编码（Windows 兼容）
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# 版本号（统一管理）
VERSION = "0.6.1"

# ============================================================
# Claude 镜像域名配置
# 在这里添加镜像站，构建时自动注入到 manifest、content.js、React bundle
# 格式：完整 origin，不加末尾斜杠
# ============================================================
CLAUDE_MIRRORS = [
# 'https://claude.rent',
]

# 平台配置
PLATFORMS = {
    'claude': {
        'name': 'Claude',
        'matches': [
            'https://claude.ai/*'
        ]
    },
    'chatgpt': {
        'name': 'ChatGPT',
        'matches': [
            'https://chatgpt.com/*',
            'https://chat.openai.com/*'
        ]
    },
    'grok': {
        'name': 'Grok',
        'matches': [
            'https://grok.com/*'
        ],
        'image_hosts': [
            '*://*.grok.com/*',
        ]
    },
    'copilot': {
        'name': 'Copilot',
        'matches': [
            'https://copilot.microsoft.com/*',
            'https://www.bing.com/*',
            'https://bing.com/*'
        ],
        'connect': [
            'copilot.microsoft.com',
            'bing.com',
            'r.bing.com',
            'edgeservices.bing.com'
        ]
    },
    'gemini': {
        'name': 'Gemini',
        'matches': [
            'https://gemini.google.com/*',
            'https://notebooklm.google.com/*',
            'https://aistudio.google.com/*'
        ],
        'includes': [
            '*://gemini.google.com/*',
            '*://notebooklm.google.com/*',
            '*://aistudio.google.com/*'
        ]
    }
}

def apply_mirrors_to_code(code, mirrors):
    """
    将镜像域名注入到 JS 代码的 claude.ai 检测中。
    替换 host.includes('claude.ai') → 同时匹配镜像域名。
    """
    if not mirrors:
        return code

    mirror_hostnames = [m.replace('https://', '').replace('http://', '') for m in mirrors]
    extra = ' || ' + ' || '.join(f"host.includes('{h}')" for h in mirror_hostnames)

    # 平台检测：common-base.js 中的 host.includes('claude.ai')
    code = code.replace(
        "host.includes('claude.ai')",
        f"(host.includes('claude.ai'){extra})"
    )
    return code


def patch_react_sources(mirrors):
    """
    在 React 构建前临时向 validationUtils.js 和 App.js 注入镜像 origin，
    返回还原函数。
    """
    if not mirrors:
        return lambda: None  # no-op restorer

    target_files = [
        Path('src/utils/data/validationUtils.js'),
        Path('src/App.js'),
    ]
    originals = {}

    for fp in target_files:
        if not fp.exists():
            continue
        original = fp.read_text(encoding='utf-8')
        originals[fp] = original

        patched = original
        for mirror in mirrors:
            # 在 'https://claude.ai', 后插入镜像行（只插入一次）
            marker = "'https://claude.ai',"
            insert = f"\n      '{mirror}',"
            if mirror not in patched and marker in patched:
                patched = patched.replace(marker, marker + insert, 1)
        fp.write_text(patched, encoding='utf-8')

    def restore():
        for fp, original in originals.items():
            fp.write_text(original, encoding='utf-8')

    return restore


def strip_platform_code(code, target_platforms):
    """
    Strip code blocks not matching target platforms.

    Supports two marker syntaxes:
    1. Line markers (multi-line blocks):
       // #platform: chatgpt,copilot
       ... code to strip ...
       // #endplatform

    2. Inline markers (within a single line):
       ['claude'/* #platform: chatgpt */, 'chatgpt'/* #endplatform */]
    """
    if target_platforms is None:
        return code  # Full build: keep everything

    target_set = set(target_platforms)

    # 1. Strip line-based platform blocks
    result_lines = []
    skipping = False
    for line in code.split('\n'):
        stripped = line.strip()

        # Check for block start: // #platform: xxx,yyy
        match_start = re.match(r'^//\s*#platform:\s*(.+)$', stripped)
        if match_start:
            block_platforms = {p.strip() for p in match_start.group(1).split(',')}
            if not block_platforms & target_set:
                skipping = True  # None of the block's platforms are in target
            else:
                pass  # Keep this block, just skip the marker comment itself
            continue  # Don't include the marker line itself

        # Check for block end: // #endplatform
        if re.match(r'^//\s*#endplatform$', stripped):
            skipping = False
            continue  # Don't include the marker line itself

        if not skipping:
            result_lines.append(line)

    code = '\n'.join(result_lines)

    # 2. Strip inline platform markers: /* #platform: xxx */ content /* #endplatform */
    def inline_replacer(match):
        block_platforms = {p.strip() for p in match.group(1).split(',')}
        content = match.group(2)
        if block_platforms & target_set:
            return content  # Keep content, strip markers
        else:
            return ''  # Strip content and markers

    code = re.sub(
        r'/\*\s*#platform:\s*([^*]+?)\s*\*/(.*?)/\*\s*#endplatform\s*\*/',
        inline_replacer,
        code
    )

    # 3. Cleanup: remove trailing commas before closing braces/brackets, empty lines from stripping
    code = re.sub(r',(\s*\n\s*[}\]])', r'\1', code)
    # Remove excessive blank lines (3+ consecutive → 2)
    code = re.sub(r'\n{3,}', '\n\n', code)

    return code

def read_file(filepath):
    """读取文件内容"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        print(f"错误: 找不到文件 {filepath}")
        sys.exit(1)

def write_file(filepath, content):
    """写入文件内容"""
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

PLATFORM_DESCRIPTIONS = {
    'claude': {
        'name': 'Loominary for Claude',
        'name_zh': '全功能Claude对话跨分支全局搜索文档PDF长截图导出管理工具',
        'desc': 'One-click export for Claude. Backups all chat branches, artifacts, and attachments. Exports to JSON/Markdown/PDF/Editable Screenshots.',
        'desc_zh': '一键导出 Claude 对话记录（支持分支、PDF、长截图）。保留完整对话分支、附加图片、LaTeX 公式、Artifacts、附件与思考过程。',
    },
}

def extract_styles_from_ui(ui_code):
    """从 common-ui.js 中提取 CSS 样式"""
    # 匹配 GM_addStyle(`...`) 中的内容
    pattern = r"GM_addStyle\s*\(\s*`([\s\S]*?)`\s*\)"
    match = re.search(pattern, ui_code)
    if match:
        css = match.group(1)
        # 清理缩进
        lines = css.split('\n')
        cleaned_lines = []
        for line in lines:
            # 移除前导空格（保持CSS缩进结构）
            cleaned = line.strip()
            if cleaned:
                cleaned_lines.append(cleaned)
        return '\n'.join(cleaned_lines)
    return ""

# Userscript 只发布 claude, grok, gemini 三个平台
USERSCRIPT_PLATFORMS = ['claude', 'grok', 'gemini']

def generate_userscript_header(platforms):
    """生成 Userscript 的 ==UserScript== 元数据块"""
    us_platforms = platforms or USERSCRIPT_PLATFORMS
    matches = []
    for p in us_platforms:
        matches.extend(PLATFORMS.get(p, {}).get('matches', []))

    match_lines = '\n'.join(f'// @match        {m}' for m in matches)

    return f"""\
// ==UserScript==
// @name         Loominary
// @namespace    https://github.com/Laumss/loominary
// @version      {VERSION}
// @description  Export AI chat conversations from Claude, Grok, and Gemini. Preview them on the Loominary web viewer.
// @author       Laumss
// @homepage     https://laumss.github.io/loominary
// @supportURL   https://github.com/Laumss/loominary/issues
{match_lines}
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-idle
// @license      MIT
// ==/UserScript==
"""

def build_userscript(platforms=None):
    """构建 Userscript（claude + grok + gemini）"""
    src_dir = Path('src')
    dist_dir = Path('dist')
    dist_dir.mkdir(exist_ok=True)

    us_platforms = platforms or USERSCRIPT_PLATFORMS
    output_name = 'loominary.user.js'
    build_type = '+'.join(us_platforms)

    output_path = dist_dir / output_name

    print(f"[Userscript] 构建 {build_type} 版本...")

    header = generate_userscript_header(us_platforms)

    adapter_code = read_file(src_dir / 'userscript-adapter.js')
    common_base_code = read_file(src_dir / 'common-base.js')
    markdown_core_code = read_file(src_dir / 'markdown-core.js')
    common_ui_code = read_file(src_dir / 'common-ui.js')

    # Bundle fflate inline from node_modules (avoids @require CDN dependency)
    # Use raw UMD: it sets (self/window).fflate, accessible as global within IIFE
    fflate_umd = read_file(Path('node_modules/fflate/umd/index.js'))
    fflate_inline = "// Inline fflate (bundled from node_modules)\n" + fflate_umd

    # Strip non-target platform code from shared modules
    strip_targets = us_platforms if len(us_platforms) < len(PLATFORMS) else None
    common_base_code = strip_platform_code(common_base_code, strip_targets)
    common_ui_code = strip_platform_code(common_ui_code, strip_targets)

    platform_codes = []
    for platform in us_platforms:
        platform_path = src_dir / f'{platform}.js'
        if platform_path.exists():
            platform_codes.append(read_file(platform_path))
        else:
            print(f"  警告: 找不到 {platform} 模块 ({platform_path})，跳过")

    output_lines = [
        header,
        "(function() {",
        "    'use strict';",
        "    if (window.loominaryFetchInitialized) return;",
        "    window.loominaryFetchInitialized = true;",
        "",
        fflate_inline,
        "",
        adapter_code,
        "",
        common_base_code,
        "",
        markdown_core_code,
        ""
    ]

    for platform_code in platform_codes:
        output_lines.append(platform_code)
        output_lines.append("")

    output_lines.append(common_ui_code)
    output_lines.append("")

    output_lines.extend([
        "    init();",
        "})();"
    ])

    output_content = '\n'.join(output_lines)
    write_file(output_path, output_content)

    file_size = output_path.stat().st_size
    print(f"  ✓ 构建成功: {output_path} ({file_size:,} bytes)")

    return output_path

def build_react_pages():
    """构建 React App 并推送到 GitHub Pages（https://Laumss.github.io/react）"""
    print("[Pages] 构建 React App 并部署到 GitHub Pages...")

    restore_react = patch_react_sources(CLAUDE_MIRRORS)
    try:
        result = subprocess.run(
            'set GENERATE_SOURCEMAP=false && npm run build',
            cwd=Path('.'), check=True, capture_output=True,
            text=True, encoding='utf-8', shell=True
        )
        print(f'  ✓ React App 构建成功')
    except subprocess.CalledProcessError as e:
        print(e.stdout[-2000:] if e.stdout else '')
        print(e.stderr[-2000:] if e.stderr else '')
        restore_react()
        sys.exit(1)
    finally:
        restore_react()

    build_size = sum(f.stat().st_size for f in Path('build').rglob('*') if f.is_file())
    print(f"  ✓ React 构建完成 ({build_size:,} bytes)")

    print("[Pages] 推送到 GitHub Pages (Laumss/react gh-pages 分支)...")
    try:
        result = subprocess.run(
            'npm run deploy:pages',
            cwd=Path('.'), check=True, capture_output=True,
            text=True, encoding='utf-8', shell=True
        )
        print(result.stdout[-1000:] if result.stdout else '')
        print("  ✓ 已推送到 https://Laumss.github.io/react")
    except subprocess.CalledProcessError as e:
        print(e.stdout[-2000:] if e.stdout else '')
        print(e.stderr[-2000:] if e.stderr else '')
        print("  ✗ 推送失败。请确认已创建 Laumss/react 仓库并配置了 GitHub Pages。")
        sys.exit(1)


def build_extension_firefox(platforms=None):
    """构建 Firefox 扩展（基于 Chrome 扩展，调整 manifest）"""
    ext_dir = Path('chrome')
    ff_dir = Path('firefox')

    # 必须先有 Chrome 扩展构建产物
    if not (ext_dir / 'content.js').exists():
        print("[Firefox] Chrome 扩展尚未构建，先执行 build_extension()...")
        build_extension(platforms)

    if platforms:
        build_label = '+'.join(platforms)
    else:
        build_label = 'all'
    print(f"[Firefox] 构建 Firefox 扩展 ({build_label})...")

    # 复制 chrome/ → firefox/
    if ff_dir.exists():
        shutil.rmtree(ff_dir)
    shutil.copytree(ext_dir, ff_dir)
    print(f"  ✓ 复制 chrome/ → firefox/")

    # 读取并修改 manifest.json → Firefox 版本
    manifest_path = ff_dir / 'manifest.json'
    manifest = json.loads(read_file(manifest_path))

    # 1. 将 service_worker 改为 scripts（Firefox MV3 使用 background scripts）
    if 'background' in manifest and 'service_worker' in manifest['background']:
        manifest['background'] = {
            'scripts': [manifest['background']['service_worker']]
        }

    # 2. 添加 browser_specific_settings（AMO 发布必须，本地调试也推荐）
    manifest['browser_specific_settings'] = {
        'gecko': {
            'id': 'loominary@laumss',
            'strict_min_version': '109.0'
        }
    }

    # 3. downloads 权限（background.js 有 handleDownload，Firefox 也需要）
    if 'downloads' not in manifest.get('permissions', []):
        manifest.setdefault('permissions', []).append('downloads')

    write_file(manifest_path, json.dumps(manifest, indent=2, ensure_ascii=False))
    print(f"  ✓ 生成 Firefox manifest.json (background.scripts, gecko id)")

    # 打包为 zip（Firefox 加载 .zip 或解压目录均可）
    zip_path = Path('dist') / f'loominary-firefox-{VERSION}.zip'
    Path('dist').mkdir(exist_ok=True)
    import zipfile
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for file in ff_dir.rglob('*'):
            if file.is_file():
                zf.write(file, file.relative_to(ff_dir))
    zip_size = zip_path.stat().st_size
    print(f"  ✓ 打包: {zip_path} ({zip_size:,} bytes)")
    print(f"  ✓ Firefox 扩展构建完成: {ff_dir}/")
    print(f"    安装方式: about:debugging → 临时加载附加组件 → 选 firefox/manifest.json")
    print(f"    AMO 提交: 上传 {zip_path}")

    return ff_dir


def build_extension(platforms=None):
    """构建 Chrome 扩展"""
    src_dir = Path('src')
    ext_dir = Path('chrome')
    ext_dir.mkdir(exist_ok=True)
    (ext_dir / 'icons').mkdir(exist_ok=True)

    if platforms:
        build_label = '+'.join(platforms)
    else:
        build_label = 'all'
    print(f"[Extension] 构建 Chrome 扩展 ({build_label})...")

    # 1. 更新 manifest.json 版本号，并注入镜像域名
    manifest_path = ext_dir / 'manifest.json'
    if manifest_path.exists():
        manifest = json.loads(read_file(manifest_path))
        manifest['version'] = VERSION

        # 注入镜像到 manifest（仅 Claude 构建时注入）
        if CLAUDE_MIRRORS and (platforms is None or 'claude' in platforms):
            mirror_matches = [m.rstrip('/') + '/*' for m in CLAUDE_MIRRORS]
            # host_permissions
            host_perms = manifest.get('host_permissions', [])
            for mm in mirror_matches:
                if mm not in host_perms:
                    host_perms.append(mm)
            manifest['host_permissions'] = host_perms
            # content_scripts matches
            for cs in manifest.get('content_scripts', []):
                for mm in mirror_matches:
                    if mm not in cs.get('matches', []):
                        cs.setdefault('matches', []).append(mm)
            # web_accessible_resources matches
            for war in manifest.get('web_accessible_resources', []):
                for mm in mirror_matches:
                    if mm not in war.get('matches', []):
                        war.setdefault('matches', []).append(mm)
            print(f"  ✓ 注入镜像域名到 manifest.json: {mirror_matches}")

        # 为各构建平台注入 host_permissions / content_scripts / web_accessible_resources
        # Gemini 图片 CDN（background 代理抓取时需要 host_permissions）
        GEMINI_IMAGE_HOSTS = [
            '*://*.googleusercontent.com/*',
            '*://*.googleapis.com/*',
            '*://lh3.google.com/*',
        ]
        target_platforms_for_manifest = platforms if platforms else list(PLATFORMS.keys())
        for platform in target_platforms_for_manifest:
            pcfg = PLATFORMS.get(platform, {})
            pmatches = pcfg.get('matches', [])
            if not pmatches:
                continue

            # host_permissions
            host_perms = manifest.setdefault('host_permissions', [])
            for m in pmatches:
                if m not in host_perms:
                    host_perms.append(m)

            # Gemini 额外图片 CDN host_permissions
            if platform == 'gemini':
                for gh in GEMINI_IMAGE_HOSTS:
                    if gh not in host_perms:
                        host_perms.append(gh)

            # 平台自带图片 CDN host_permissions
            for ih in pcfg.get('image_hosts', []):
                if ih not in host_perms:
                    host_perms.append(ih)

            # content_scripts：在已有的 cs 块中追加 matches
            existing_cs = manifest.get('content_scripts', [])
            if existing_cs:
                cs = existing_cs[0]
                for m in pmatches:
                    if m not in cs.get('matches', []):
                        cs.setdefault('matches', []).append(m)
            else:
                manifest['content_scripts'] = [{
                    'matches': list(pmatches),
                    'js': ['fflate.min.js', 'content.js'],
                    'css': ['styles.css'],
                    'run_at': 'document_start'
                }]

            # web_accessible_resources：追加 matches（injected.js 需要对所有平台可访问）
            # 注意：web_accessible_resources 的 matches 必须是顶级 /* pattern，
            # 子路径（如 /i/grok/*）在某些 Chrome 版本会触发 Invalid match pattern 错误
            for war in manifest.get('web_accessible_resources', []):
                existing = war.setdefault('matches', [])
                for m in pmatches:
                    import re as _re
                    mat = _re.match(r'^(\*|https?)://(.*?)(/.*)', m)
                    if mat:
                        scheme, host, path = mat.group(1), mat.group(2), mat.group(3)
                        top = f'{scheme}://{host}/*'
                    else:
                        top = m
                    if top not in existing:
                        existing.append(top)

        print(f"  ✓ 注入平台域名到 manifest.json: {target_platforms_for_manifest}")

        write_file(manifest_path, json.dumps(manifest, indent=2, ensure_ascii=False))
        print(f"  ✓ 更新 manifest.json 版本号: {VERSION}")

    # 2. 读取源代码
    adapter_code = read_file(src_dir / 'extension-adapter.js')
    common_base_code = read_file(src_dir / 'common-base.js')
    markdown_core_code = read_file(src_dir / 'markdown-core.js')
    common_ui_code = read_file(src_dir / 'common-ui.js')

    # Strip non-target platform code from shared modules
    strip_targets = platforms if (platforms and len(platforms) < len(PLATFORMS)) else None
    common_base_code = strip_platform_code(common_base_code, strip_targets)
    common_ui_code = strip_platform_code(common_ui_code, strip_targets)

    # 注入镜像域名到平台检测代码
    if CLAUDE_MIRRORS and (platforms is None or 'claude' in platforms):
        common_base_code = apply_mirrors_to_code(common_base_code, CLAUDE_MIRRORS)
        print(f"  ✓ 注入镜像域名到 content.js: {CLAUDE_MIRRORS}")

    # 读取平台代码（全部或指定平台）
    target_platforms = platforms if platforms else list(PLATFORMS.keys())
    platform_codes = []
    for platform in target_platforms:
        platform_path = src_dir / f'{platform}.js'
        if platform_path.exists():
            platform_codes.append(read_file(platform_path))
        else:
            print(f"  警告: 找不到 {platform} 模块 ({platform_path})，跳过")

    # 3. 构建 content.js（主要内容脚本）
    content_js_lines = [
        "// ============================================================",
        "// Loominary - Content Script",
        f"// Version: {VERSION}",
        f"// Built: {datetime.now().isoformat()}",
        "// ============================================================",
        "",
        "(function() {",
        "    'use strict';",
        "    if (window.loominaryFetchInitialized) return;",
        "    window.loominaryFetchInitialized = true;",
        "",
        "    // 注入页面上下文脚本（用于拦截 fetch/XHR）",
        "    const script = document.createElement('script');",
        "    script.src = chrome.runtime.getURL('injected.js');",
        "    script.onload = function() { this.remove(); };",
        "    (document.head || document.documentElement).appendChild(script);",
        "",
        "    // 监听来自注入脚本的消息",
        "    window.addEventListener('message', (event) => {",
        "        if (event.source !== window) return;",
        "        if (event.data.type === 'LOOMINARY_USER_ID_CAPTURED') {",
        "            localStorage.setItem('claudeUserId', event.data.userId);",
        "        }",
        "        if (event.data.type === 'LOOMINARY_TOKEN_CAPTURED') {",
        "            localStorage.setItem('chatGPTToken', event.data.token);",
        "        }",
        "    });",
        "",
        adapter_code,
        "",
        common_base_code,
        "",
        markdown_core_code,
        "",
    ]

    for platform_code in platform_codes:
        content_js_lines.append(platform_code)
        content_js_lines.append("")

    content_js_lines.append(common_ui_code)
    content_js_lines.append("")
    content_js_lines.extend([
        "    init();",
        "})();"
    ])

    content_js = '\n'.join(content_js_lines)
    write_file(ext_dir / 'content.js', content_js)
    print(f"  ✓ 构建 content.js ({len(content_js):,} bytes)")

    # 4. 提取并构建 styles.css
    css_content = extract_styles_from_ui(common_ui_code)
    css_header = f"""/* ============================================================
 * Loominary - Extension Styles
 * Version: {VERSION}
 * Built: {datetime.now().isoformat()}
 * ============================================================ */

"""
    write_file(ext_dir / 'styles.css', css_header + css_content)
    print(f"  ✓ 构建 styles.css ({len(css_content):,} bytes)")

    # 5. 复制 fflate 库（需要手动下载或使用 CDN）
    # 在扩展中，我们需要将 fflate 作为本地文件包含
    fflate_notice = ext_dir / 'FFLATE_NOTICE.txt'
    write_file(fflate_notice, """fflate 库需要手动添加：

1. 下载 fflate: https://cdn.jsdelivr.net/npm/fflate@0.7.4/umd/index.js
2. 保存为 chrome/fflate.min.js
3. 在 manifest.json 的 content_scripts.js 数组开头添加 "fflate.min.js"

或者在代码中使用动态加载方式。
""")

    # 6. 构建 React App 并复制到 chrome/app/
    print(f"  [React] 开始构建 React App...")

    # 构建前：临时向 React 源文件注入镜像 origin
    restore_react = patch_react_sources(
        CLAUDE_MIRRORS if (platforms is None or 'claude' in (platforms or [])) else []
    )
    if CLAUDE_MIRRORS and (platforms is None or 'claude' in (platforms or [])):
        print(f"  ✓ 临时注入镜像 origin 到 React 源文件: {CLAUDE_MIRRORS}")

    try:
        result = subprocess.run(
            'set GENERATE_SOURCEMAP=false && npm run build',
            cwd=Path('.'),
            check=True,
            capture_output=True,
            text=True,
            encoding='utf-8',
            shell=True
        )
        print(f"  ✓ React App 构建成功")
    except subprocess.CalledProcessError as e:
        print(f"  ✗ React App 构建失败:")
        print(e.stdout[-2000:] if e.stdout else '')
        print(e.stderr[-2000:] if e.stderr else '')
        restore_react()
        sys.exit(1)
    finally:
        restore_react()  # 构建完成后立即还原源文件

    # 复制 build/ 到 chrome/app/
    build_dir = Path('build')
    app_dir = ext_dir / 'app'
    if app_dir.exists():
        shutil.rmtree(app_dir)
    shutil.copytree(build_dir, app_dir)
    app_size = sum(f.stat().st_size for f in app_dir.rglob('*') if f.is_file())
    print(f"  ✓ 复制 build/ → chrome/app/ ({app_size:,} bytes)")

    print(f"  ✓ 扩展构建完成: {ext_dir}/")

    return ext_dir

def main():
    """主函数"""
    print("=" * 60)
    print("Build Script")
    print("=" * 60)
    print()

    if len(sys.argv) < 2 or sys.argv[1] == 'all':
        build_extension()
        build_userscript()
    elif sys.argv[1] == 'userscript':
        build_userscript()
    elif sys.argv[1] == 'pages':
        build_react_pages()
    elif sys.argv[1] == 'extension':
        if len(sys.argv) >= 3:
            ext_platform = sys.argv[2].lower()
            if ext_platform not in PLATFORMS:
                print(f"错误: 未知平台 '{ext_platform}'")
                print(f"可用平台: {', '.join(PLATFORMS.keys())}")
                sys.exit(1)
            ext_platforms = [ext_platform]
            if ext_platform == 'claude':
                if 'gemini' not in ext_platforms:
                    ext_platforms.append('gemini')
                if 'grok' not in ext_platforms:
                    ext_platforms.append('grok')
            build_extension(platforms=ext_platforms)
        else:
            build_extension()
    elif sys.argv[1] == 'firefox':
        if len(sys.argv) >= 3:
            ext_platform = sys.argv[2].lower()
            if ext_platform not in PLATFORMS:
                print(f"错误: 未知平台 '{ext_platform}'")
                print(f"可用平台: {', '.join(PLATFORMS.keys())}")
                sys.exit(1)
            ext_platforms = [ext_platform]
            if ext_platform == 'claude':
                if 'gemini' not in ext_platforms:
                    ext_platforms.append('gemini')
                if 'grok' not in ext_platforms:
                    ext_platforms.append('grok')
            build_extension_firefox(platforms=ext_platforms)
        else:
            build_extension_firefox()
    else:
        print(f"错误: 未知参数 '{sys.argv[1]}'")
        print(f"可用选项: userscript, pages, extension [platform], firefox [platform]")
        sys.exit(1)

    print()
    print("=" * 60)
    print("构建完成!")
    print("=" * 60)

if __name__ == '__main__':
    main()
