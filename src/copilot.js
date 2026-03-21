    const CopilotHandler = {
        init: () => {
            // Copilot doesn't require special initialization like token capture
            console.log('[Loominary] CopilotHandler initialized');
        },

        getCurrentConversationId: () => {
            // Copilot URL patterns:
            // https://copilot.microsoft.com/chats/{conversationId}
            // https://copilot.microsoft.com/sl/{conversationId}
            const pathSegments = window.location.pathname.split('/').filter(s => s);

            // Check for /chats/ or /sl/ pattern
            const chatsIndex = pathSegments.indexOf('chats');
            const slIndex = pathSegments.indexOf('sl');

            if (chatsIndex !== -1 && pathSegments[chatsIndex + 1]) {
                return pathSegments[chatsIndex + 1];
            }
            if (slIndex !== -1 && pathSegments[slIndex + 1]) {
                return pathSegments[slIndex + 1];
            }

            // Fallback: try last segment if it looks like an ID
            const lastSegment = pathSegments[pathSegments.length - 1];
            if (lastSegment && lastSegment.length >= 10 && !['copilot', 'chats', 'sl'].includes(lastSegment)) {
                return lastSegment;
            }

            return null;
        },


        getConversation: async (conversationId) => {
            try {
                // Always try to extract from DOM for Copilot
                // API endpoints often return empty messages
                console.log('[Copilot] Extracting conversation from DOM...');
                const conversationData = await CopilotHandler.extractFromDOM();

                if (!conversationData) {
                    throw new Error('Could not extract conversation data from DOM');
                }

                // Get messages from the conversation data
                let messages = conversationData.messages || conversationData.responses || [];

                // Simple format without responseId and createTime
                const processedResponses = messages.map(msg => ({
                    sender: msg.sender || msg.author || (msg.role === 'user' ? 'human' : 'assistant'),
                    message: msg.message || msg.content || msg.text || ''
                }));

                console.log('[Copilot] Processed responses count:', processedResponses.length);

                return {
                    conversationId,
                    title: conversationData.title || CopilotHandler.extractTitle() || '未命名对话',
                    responses: processedResponses,
                    exportTime: new Date().toISOString(),
                    platform: 'copilot'
                };
            } catch (error) {
                console.error('[Loominary] Get conversation error:', error);
                throw error;
            }
        },

        extractFromDOM: async () => {
            console.log('[Copilot] Starting DOM extraction...');

            // Get text with Markdown formatting from DOM
            const getFormattedText = (root) => {
                let texts = [];

                // Context for tracking list state
                const listStack = []; // Stack of { type: 'ul'|'ol', index: number }

                const getIndent = () => '    '.repeat(Math.max(0, listStack.length - 1));

                const walk = (node) => {
                    if (!node) return;

                    // Text node
                    if (node.nodeType === 3) {
                        const text = node.textContent || '';
                        if (text.trim()) {
                            // Normalize whitespace but preserve single spaces
                            texts.push(text.replace(/\s+/g, ' '));
                        }
                        return;
                    }

                    // Element node
                    if (node.nodeType === 1) {
                        const tag = node.tagName ? node.tagName.toUpperCase() : '';
                        if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(tag)) return;

                        // Handle specific HTML tags to preserve formatting
                        switch (tag) {
                            case 'BR':
                                texts.push('\n');
                                return;

                            case 'P':
                            case 'DIV':
                                // Check if this is inside a list item
                                const isInListItem = listStack.length > 0;

                                // Add line break before paragraph/div (but not if inside LI)
                                if (!isInListItem && texts.length > 0 && !texts[texts.length - 1].endsWith('\n')) {
                                    texts.push('\n');
                                }

                                for (const child of node.childNodes) {
                                    walk(child);
                                }

                                // Add line break after paragraph/div (but not if inside LI)
                                if (!isInListItem && texts.length > 0 && !texts[texts.length - 1].endsWith('\n')) {
                                    texts.push('\n');
                                }
                                return;

                            case 'UL':
                                // Start unordered list
                                // Only add newline if this is a top-level list (not nested)
                                if (listStack.length === 0 && texts.length > 0 && !texts[texts.length - 1].endsWith('\n')) {
                                    texts.push('\n');
                                }
                                listStack.push({ type: 'ul', index: 0 });
                                for (const child of node.childNodes) {
                                    walk(child);
                                }
                                listStack.pop();
                                // Add newline after top-level list
                                if (listStack.length === 0 && texts.length > 0 && !texts[texts.length - 1].endsWith('\n')) {
                                    texts.push('\n');
                                }
                                return;

                            case 'OL':
                                // Start ordered list
                                // Only add newline if this is a top-level list (not nested)
                                if (listStack.length === 0 && texts.length > 0 && !texts[texts.length - 1].endsWith('\n')) {
                                    texts.push('\n');
                                }
                                const startAttr = node.getAttribute('start');
                                const startIndex = startAttr ? parseInt(startAttr, 10) : 1;
                                listStack.push({ type: 'ol', index: startIndex });
                                for (const child of node.childNodes) {
                                    walk(child);
                                }
                                listStack.pop();
                                // Add newline after top-level list
                                if (listStack.length === 0 && texts.length > 0 && !texts[texts.length - 1].endsWith('\n')) {
                                    texts.push('\n');
                                }
                                return;

                            case 'LI':
                                // Handle list item based on parent list type
                                const currentList = listStack[listStack.length - 1];
                                const indent = getIndent();

                                if (texts.length > 0 && !texts[texts.length - 1].endsWith('\n')) {
                                    texts.push('\n');
                                }

                                if (currentList && currentList.type === 'ol') {
                                    // Ordered list: use number
                                    texts.push(`${indent}${currentList.index}. `);
                                    currentList.index++;
                                } else {
                                    // Unordered list or no parent list: use bullet
                                    texts.push(`${indent}- `);
                                }

                                // Process children, handling nested lists separately
                                for (const child of node.childNodes) {
                                    walk(child);
                                }
                                return;

                            case 'STRONG':
                            case 'B':
                                texts.push('**');
                                for (const child of node.childNodes) {
                                    walk(child);
                                }
                                texts.push('**');
                                return;

                            case 'EM':
                            case 'I':
                                texts.push('*');
                                for (const child of node.childNodes) {
                                    walk(child);
                                }
                                texts.push('*');
                                return;

                            case 'DEL':
                            case 'S':
                                texts.push('~~');
                                for (const child of node.childNodes) {
                                    walk(child);
                                }
                                texts.push('~~');
                                return;

                            case 'CODE':
                                // Inline code
                                const codeText = node.textContent || '';
                                if (codeText.trim()) {
                                    // Use backticks, escape if content contains backticks
                                    if (codeText.includes('`')) {
                                        texts.push('`` ' + codeText + ' ``');
                                    } else {
                                        texts.push('`' + codeText + '`');
                                    }
                                }
                                return;

                            case 'PRE':
                                // Code block
                                if (texts.length > 0 && !texts[texts.length - 1].endsWith('\n')) {
                                    texts.push('\n');
                                }
                                const codeEl = node.querySelector('code');
                                const preText = (codeEl || node).textContent || '';
                                // Try to detect language from class
                                let lang = '';
                                const langClass = (codeEl || node).className.match(/language-(\w+)/);
                                if (langClass) lang = langClass[1];
                                texts.push('```' + lang + '\n' + preText.trim() + '\n```\n');
                                return;

                            case 'A':
                                // Links
                                const href = node.getAttribute('href');
                                const linkText = node.textContent || '';
                                if (href && linkText.trim()) {
                                    texts.push(`[${linkText.trim()}](${href})`);
                                } else if (linkText.trim()) {
                                    texts.push(linkText);
                                }
                                return;

                            case 'H1':
                            case 'H2':
                            case 'H3':
                            case 'H4':
                            case 'H5':
                            case 'H6':
                                const level = parseInt(tag[1], 10);
                                if (texts.length > 0 && !texts[texts.length - 1].endsWith('\n')) {
                                    texts.push('\n');
                                }
                                texts.push('#'.repeat(level) + ' ');
                                for (const child of node.childNodes) {
                                    walk(child);
                                }
                                texts.push('\n');
                                return;

                            case 'BLOCKQUOTE':
                                if (texts.length > 0 && !texts[texts.length - 1].endsWith('\n')) {
                                    texts.push('\n');
                                }
                                texts.push('> ');
                                for (const child of node.childNodes) {
                                    walk(child);
                                }
                                texts.push('\n');
                                return;

                            case 'HR':
                                texts.push('\n---\n');
                                return;
                        }

                        // Check shadow DOM
                        if (node.shadowRoot) {
                            walk(node.shadowRoot);
                        }

                        // Default: process children
                        for (const child of node.childNodes) {
                            walk(child);
                        }
                    }
                };

                walk(root);
                return texts.join('');
            };

            // Find the main conversation container
            // Try to locate the actual conversation area, not the entire body
            const conversationSelectors = [
                // Copilot specific selectors (most specific first)
                '[class*="conversation"]',
                '[class*="chat"]',
                '[class*="messages"]',
                'article[role="article"]',
                'section[role="region"]',
                // Generic selectors (fallback)
                'main[role="main"]',
                '[role="main"]',
                'main',
                'body'
            ];

            let conversationRoot = null;
            for (const selector of conversationSelectors) {
                const candidate = document.querySelector(selector);
                if (candidate) {
                    // Verify this container has actual message content
                    const text = candidate.textContent || '';
                    // Must contain at least one message marker
                    if (text.includes('你说') || text.includes('You') || text.includes('Copilot')) {
                        conversationRoot = candidate;
                        console.log('[Copilot] Using conversation root:', selector);
                        break;
                    }
                }
            }

            // Fallback to body if no suitable container found
            if (!conversationRoot) {
                conversationRoot = document.body;
                console.log('[Copilot] Using fallback: document.body');
            }

            const fullText = getFormattedText(conversationRoot || document.body);
            console.log('[Copilot] Total text length:', fullText.length);
            console.log('[Copilot] Text preview:', fullText.substring(0, 1000));

            // Parse messages using regex patterns
            const messages = [];

            // Match patterns - support both with and without # markers
            // Pattern matches: "你说", "You", "Copilot 说", "Copilot said", etc.
            // Also supports heading markers like "##### 你说" or "###### Copilot 说"
            const pattern = /(?:^|\n)(?:#{1,6}\s*)?(你说|You\s*(?:said)?|Copilot\s*说|Copilot\s*(?:said)?)/gim;

            const matches = [];
            let match;
            while ((match = pattern.exec(fullText)) !== null) {
                const marker = match[1].trim();
                matches.push({
                    // Store the full match start (including ### markers)
                    matchStart: match.index,
                    // Store where the actual marker text starts
                    markerStart: match.index + match[0].indexOf(match[1]),
                    marker: marker,
                    fullMatch: match[0],
                    isUser: marker.includes('你说') || marker.toLowerCase().startsWith('you')
                });
            }

            console.log('[Copilot] Found markers:', matches.length);
            matches.forEach(m => console.log(`  - "${m.marker}" at ${m.markerStart} (${m.isUser ? 'user' : 'assistant'})`));

            // Extract content between markers
            for (let i = 0; i < matches.length; i++) {
                const current = matches[i];
                const next = matches[i + 1];

                // Extract content: start after current marker, end before next marker's FULL match (including ###)
                const startIndex = current.markerStart + current.marker.length;
                const endIndex = next ? next.matchStart : fullText.length;
                const content = fullText.substring(startIndex, endIndex).trim();

                if (content) {
                    messages.push({
                        sender: current.isUser ? 'human' : 'assistant',
                        message: content,
                        createTime: new Date().toISOString()
                    });
                }
            }

            console.log(`[Copilot] Extracted ${messages.length} raw messages`);

            // Merge consecutive messages from the same sender
            const mergedMessages = [];
            for (const msg of messages) {
                const lastMsg = mergedMessages[mergedMessages.length - 1];
                if (lastMsg && lastMsg.sender === msg.sender) {
                    // Same sender, merge content
                    lastMsg.message += '\n' + msg.message;
                } else {
                    // Different sender or first message
                    mergedMessages.push({
                        sender: msg.sender,
                        message: msg.message
                    });
                }
            }

            // Post-process messages to add markdown formatting
            for (const msg of mergedMessages) {
                let text = msg.message;
                // Convert "第N步：XXX" patterns to headings
                text = text.replace(/^(第[一二三四五六七八九十\d]+步[：:]\s*.+)$/gm, '\n## $1');
                // Ensure patterns like "第N周：" are bold if not already
                text = text.replace(/^- (第[一二三四五六七八九十\d]+周[：:]\s*)(?!\*\*)/gm, '- **$1**');
                text = text.replace(/^- (前[一二三四五六七八九十两\d]+小时[：:]\s*)(?!\*\*)/gm, '- **$1**');
                text = text.replace(/^- (后[一二三四五六七八九十两\d]+小时[：:]\s*)(?!\*\*)/gm, '- **$1**');
                text = text.replace(/^- (每周[末日][：:]\s*)(?!\*\*)/gm, '- **$1**');
                msg.message = text;
            }

            // Clean UI elements from all messages, especially the last one
            const uiPatterns = [
                /\n*向 Copilot 发送消息[\s\S]*$/i,
                /\n*Send a message to Copilot[\s\S]*$/i,
                /\n*Smart\n*预览对话[\s\S]*$/i,
                /\n*Smart\n*🌐[\s\S]*$/i,
                /\n*预览对话\n*导出中[\s\S]*$/i,
                /\n*🌐\s*简体中文\**\s*$/i,
                /\n*深度思考\s*$/i
            ];

            for (const msg of mergedMessages) {
                let cleaned = msg.message;
                for (const pattern of uiPatterns) {
                    cleaned = cleaned.replace(pattern, '');
                }
                // Clean up trailing whitespace and newlines
                cleaned = cleaned.replace(/[\s\n]+$/, '').trim();
                if (cleaned !== msg.message) {
                    console.log('[Copilot] Cleaned UI elements from message');
                }
                msg.message = cleaned;
            }

            // Remove empty messages after cleaning
            const finalMessages = mergedMessages.filter(msg => msg.message.length > 0);
            if (finalMessages.length < mergedMessages.length) {
                console.log('[Copilot] Removed empty messages after cleaning');
            }

            console.log(`[Copilot] Final message count: ${finalMessages.length}`);
            if (finalMessages.length > 0) {
                console.log('[Copilot] Sample messages:', finalMessages.slice(0, 2));
            } else {
                console.warn('[Copilot] No messages found! Check console logs above for text content.');
            }

            return {
                messages: finalMessages,
                title: CopilotHandler.extractTitle() || document.title || '未命名对话'
            };
        },

        extractTitle: () => {
            // Try to extract conversation title
            const titleSelectors = [
                '[data-testid="conversation-title"]',
                '.conversation-title',
                'h1',
                'h2',
                '.title'
            ];

            for (const selector of titleSelectors) {
                const titleEl = document.querySelector(selector);
                if (titleEl && titleEl.textContent.trim()) {
                    return titleEl.textContent.trim();
                }
            }

            // Use first user message as title
            return null;
        },

        addUI: () => {
            // No additional UI needed for Copilot
        },

        addButtons: (controls) => {
            controls.appendChild(Utils.createButton(
                `${previewIcon} ${i18n.t('viewOnline')}`,
                async (btn) => {
                    const conversationId = CopilotHandler.getCurrentConversationId();
                    if (!conversationId) {
                        alert(i18n.t('uuidNotFound'));
                        return;
                    }
                    const original = btn.innerHTML;
                    Utils.setButtonLoading(btn, i18n.t('loading'));
                    try {
                        const data = await CopilotHandler.getConversation(conversationId);
                        if (!data) throw new Error(i18n.t('fetchFailed'));
                        const jsonString = JSON.stringify(data, null, 2);
                        const filename = `copilot_${data.title || 'conversation'}_${conversationId.substring(0, 8)}.json`;
                        await Communicator.open(jsonString, filename);
                    } catch (error) {
                        ErrorHandler.handle(error, 'Preview conversation', {
                            userMessage: `${i18n.t('loadFailed')} ${error.message}`
                        });
                    } finally {
                        Utils.restoreButton(btn, original);
                    }
                }
            ));

            controls.appendChild(Utils.createButton(
                `${exportIcon} ${i18n.t('exportCurrentJSON')}`,
                async (btn) => {
                    const conversationId = CopilotHandler.getCurrentConversationId();
                    if (!conversationId) {
                        alert(i18n.t('uuidNotFound'));
                        return;
                    }
                    const filename = prompt(i18n.t('enterFilename'), Utils.sanitizeFilename(`copilot_${conversationId.substring(0, 8)}`));
                    if (!filename?.trim()) return;
                    const original = btn.innerHTML;
                    Utils.setButtonLoading(btn, i18n.t('exporting'));
                    try {
                        const data = await CopilotHandler.getConversation(conversationId);
                        if (!data) throw new Error(i18n.t('fetchFailed'));
                        Utils.downloadJSON(JSON.stringify(data, null, 2), `${filename.trim()}.json`);
                    } catch (error) {
                        ErrorHandler.handle(error, 'Export conversation');
                    } finally {
                        Utils.restoreButton(btn, original);
                    }
                }
            ));
        }
    };
