    // Helper function to fetch images via GM_xmlhttpRequest (bypass CORS)
    function fetchViaGM(url, headers = {}) {
        return new Promise((resolve, reject) => {
            if (typeof GM_xmlhttpRequest === 'undefined') {
                fetch(url, { headers }).then(r => {
                    if (r.ok) return r.blob();
                    return Promise.reject(new Error(`Status: ${r.status}`));
                }).then(resolve).catch(reject);
                return;
            }
            GM_xmlhttpRequest({
                method: "GET",
                url,
                headers,
                responseType: "blob",
                onload: r => {
                    if (r.status >= 200 && r.status < 300) {
                        resolve(r.response);
                    } else {
                        reject(new Error(`Status: ${r.status}`));
                    }
                },
                onerror: e => reject(new Error(e.statusText || 'Network error'))
            });
        });
    }

    // Process image element and return base64 data
    async function processImageElement(imgElement, accessToken = null) {
        if (!imgElement) return null;
        const url = imgElement.src;
        if (!url || url.startsWith('data:')) return null;

        try {
            let base64Data, mimeType, size;

            if (url.startsWith('blob:')) {
                try {
                    const blob = await fetch(url).then(r => r.ok ? r.blob() : Promise.reject());
                    base64Data = await Utils.blobToBase64(blob);
                    mimeType = blob.type;
                    size = blob.size;
                } catch {
                    // Canvas fallback
                    const canvas = document.createElement('canvas');
                    canvas.width = imgElement.naturalWidth || imgElement.width;
                    canvas.height = imgElement.naturalHeight || imgElement.height;
                    canvas.getContext('2d').drawImage(imgElement, 0, 0);

                    const isPhoto = canvas.width * canvas.height > 50000;
                    const dataURL = isPhoto ? canvas.toDataURL('image/jpeg', 0.85) : canvas.toDataURL('image/png');
                    mimeType = isPhoto ? 'image/jpeg' : 'image/png';
                    base64Data = dataURL.split(',')[1];
                    size = Math.round((base64Data.length * 3) / 4);
                }
            } else {
                const headers = {};
                if (url.includes('backend-api') && accessToken) {
                    headers['Authorization'] = `Bearer ${accessToken}`;
                }

                const blob = await fetchViaGM(url, headers);
                base64Data = await Utils.blobToBase64(blob);
                mimeType = blob.type;
                size = blob.size;

                // Fix MIME type if it's octet-stream or empty
                if (!mimeType || mimeType === 'application/octet-stream' || !mimeType.startsWith('image/')) {
                    if (url.includes('.jpg') || url.includes('.jpeg')) {
                        mimeType = 'image/jpeg';
                    } else if (url.includes('.png')) {
                        mimeType = 'image/png';
                    } else if (url.includes('.gif')) {
                        mimeType = 'image/gif';
                    } else if (url.includes('.webp')) {
                        mimeType = 'image/webp';
                    } else {
                        // Detect from base64 magic bytes
                        const firstBytes = base64Data.substring(0, 20);
                        if (firstBytes.startsWith('iVBORw0KGgo')) mimeType = 'image/png';
                        else if (firstBytes.startsWith('/9j/')) mimeType = 'image/jpeg';
                        else if (firstBytes.startsWith('R0lGOD')) mimeType = 'image/gif';
                        else if (firstBytes.startsWith('UklGR')) mimeType = 'image/webp';
                        else mimeType = 'image/png';
                    }
                }
            }

            return { type: 'image', format: mimeType, size, data: base64Data, original_src: url };
        } catch (e) {
            console.error('[ChatGPT] Failed to process image:', url.substring(0, 80));
            return null;
        }
    }

    const ChatGPTHandler = {
        init: () => {
            const rawFetch = window.fetch;
            window.fetch = async function(resource, options) {
                const headers = options?.headers;
                if (headers) {
                    let authHeader = null;
                    if (typeof headers === 'string') {
                        authHeader = headers;
                    } else if (headers instanceof Headers) {
                        authHeader = headers.get('Authorization');
                    } else {
                        authHeader = headers.Authorization || headers.authorization;
                    }

                    if (authHeader?.startsWith('Bearer ')) {
                        const token = authHeader.slice(7);
                        if (token && token.toLowerCase() !== 'dummy') {
                            State.chatgptAccessToken = token;
                        }
                    }
                }

                return rawFetch.apply(this, arguments);
            };
        },

        ensureAccessToken: async () => {
            if (State.chatgptAccessToken) return State.chatgptAccessToken;

            try {
                const response = await fetch('/api/auth/session?unstable_client=true');
                const session = await response.json();
                if (session.accessToken) {
                    State.chatgptAccessToken = session.accessToken;
                    return session.accessToken;
                }
            } catch (error) {
                console.error('Failed to get access token:', error);
            }

            return null;
        },

        getOaiDeviceId: () => {
            const cookieString = document.cookie;
            const match = cookieString.match(/oai-did=([^;]+)/);
            return match ? match[1] : null;
        },

        getCurrentConversationId: () => {
            const match = window.location.pathname.match(/\/c\/([a-zA-Z0-9-]+)/);
            return match ? match[1] : null;
        },

        getAllConversations: async () => {
            const token = await ChatGPTHandler.ensureAccessToken();
            if (!token) throw new Error(i18n.t('tokenNotFound'));

            const deviceId = ChatGPTHandler.getOaiDeviceId();
            if (!deviceId) throw new Error('Cannot get device ID');

            const headers = {
                'Authorization': `Bearer ${token}`,
                'oai-device-id': deviceId
            };

            if (State.chatgptWorkspaceType === 'team' && State.chatgptWorkspaceId) {
                headers['ChatGPT-Account-Id'] = State.chatgptWorkspaceId;
            }

            const allConversations = [];
            let offset = 0;
            let hasMore = true;

            while (hasMore) {
                const response = await fetch(`/backend-api/conversations?offset=${offset}&limit=28&order=updated`, { headers });
                if (!response.ok) throw new Error('Failed to fetch conversation list');

                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    allConversations.push(...data.items);
                    hasMore = data.items.length === 28;
                    offset += data.items.length;
                } else {
                    hasMore = false;
                }
            }

            return allConversations;
        },

        // Extract images from DOM for current conversation
        extractImagesFromDOM: async (conversationId, includeImages, accessToken = null) => {
            if (!includeImages) return {};

            const currentId = ChatGPTHandler.getCurrentConversationId();
            if (currentId !== conversationId) {
                console.log('[ChatGPT] Not current conversation, skipping DOM image extraction');
                return {};
            }

            const imageMap = {};
            let lastUserMessageId = null;  // 追踪最后的用户消息 ID，用于关联孤立的助手图片

            const messageGroups = document.querySelectorAll('[data-testid^="conversation-turn-"]');

            for (const group of messageGroups) {
                // 查找整个 group 中所有可能的 message-id
                const findMessageId = (container) => {
                    if (!container) return null;
                    return container.getAttribute('data-message-id') ||
                           container.closest('[data-message-id]')?.getAttribute('data-message-id') ||
                           group.querySelector('[data-message-id]')?.getAttribute('data-message-id');
                };

                // User messages - look for uploaded images
                const userContainer = group.querySelector('[data-message-author-role="user"]');
                if (userContainer) {
                    // 记录用户消息 ID，即使没有图片也要记录（用于关联后续的助手生成图片）
                    const userMessageId = findMessageId(userContainer);
                    if (userMessageId) {
                        lastUserMessageId = userMessageId;
                    }

                    // Find images in user message
                    const userImages = userContainer.querySelectorAll('img[src*="backend-api"], img[src*="files.oaiusercontent.com"], img[src*="oaiusercontent"]');
                    if (userImages.length > 0) {
                        const images = [];
                        for (const img of userImages) {
                            const imageData = await processImageElement(img, accessToken);
                            if (imageData) images.push(imageData);
                        }
                        if (images.length > 0 && lastUserMessageId) {
                            if (!imageMap[lastUserMessageId]) imageMap[lastUserMessageId] = {};
                            imageMap[lastUserMessageId].user = images;
                        }
                    }
                }

                // Assistant messages - look for generated images (including DALL-E generated images)
                const assistantContainer = group.querySelector('[data-message-author-role="assistant"]');
                
                // Collect all candidate assistant images from multiple sources
                const candidateImages = [];
                const seenSrcs = new Set();
                
                // Helper to add images without duplicates
                const addImages = (imgs) => {
                    for (const img of imgs) {
                        if (img.src && !seenSrcs.has(img.src)) {
                            seenSrcs.add(img.src);
                            candidateImages.push(img);
                        }
                    }
                };
                
                // 1. Images in assistant container
                if (assistantContainer) {
                    addImages(assistantContainer.querySelectorAll('img'));
                }
                
                // 2. AI-generated images - find by id pattern (image-xxxx)
                addImages(group.querySelectorAll('[id^="image-"] img'));
                
                // 3. Images with estuary/content URLs (generated content)
                addImages(group.querySelectorAll('img[src*="estuary/content"], img[src*="estuary"]'));
                
                // 4. Images with "已生成图片" or "Generated" alt text
                addImages(group.querySelectorAll('img[alt*="生成"], img[alt*="Generated"], img[alt*="generated"]'));
                
                // 5. Find imagegen containers by iterating through elements (handles class names with /)
                group.querySelectorAll('div').forEach(div => {
                    const classList = div.className || '';
                    if (classList.includes('imagegen') || classList.includes('image-gen')) {
                        addImages(div.querySelectorAll('img'));
                    }
                });
                
                // 6. Find by aria-label
                addImages(group.querySelectorAll('img[aria-label*="图片"], img[aria-label*="image"]'));
                
                // Exclude user images
                const userImgSrcs = new Set();
                group.querySelectorAll('[data-message-author-role="user"] img').forEach(img => userImgSrcs.add(img.src));
                
                const uniqueImages = candidateImages.filter(img => !userImgSrcs.has(img.src));

                if (uniqueImages.length > 0) {
                    const images = [];
                    for (const img of uniqueImages) {
                        // Skip loading/placeholder images (blurred intermediate images during generation)
                        // Check blur on img itself
                        const imgStyle = window.getComputedStyle(img);
                        const imgFilter = imgStyle.filter || imgStyle.webkitFilter || '';
                        if (imgFilter.includes('blur')) continue;

                        // Check blur on parent element (ChatGPT applies blur to parent div)
                        const parent = img.parentElement;
                        if (parent) {
                            const parentStyle = window.getComputedStyle(parent);
                            const parentFilter = parentStyle.filter || parentStyle.webkitFilter || '';
                            if (parentFilter.includes('blur')) continue;
                        }

                        // Skip images with loading/placeholder/pulse classes
                        const classList = img.className || '';
                        if (classList.includes('loading') || classList.includes('placeholder') ||
                            classList.includes('skeleton') || classList.includes('pulse')) continue;

                        // Skip images with loading aria attributes
                        if (img.getAttribute('aria-busy') === 'true' || img.getAttribute('data-loading') === 'true') continue;

                        // Wait for image to load if needed
                        if (!img.complete) {
                            await new Promise(r => {
                                img.onload = img.onerror = r;
                                setTimeout(r, 3000);
                            });
                        }

                        // Skip small images (icons/UI elements)
                        const width = img.naturalWidth || img.width || 0;
                        const height = img.naturalHeight || img.height || 0;
                        if (width < 50 || height < 50) continue;

                        const imageData = await processImageElement(img, accessToken);
                        if (imageData) images.push(imageData);
                    }
                    
                    if (images.length > 0) {
                        // 尝试多种方式获取 messageId
                        let messageId = findMessageId(assistantContainer);
                        
                        // 如果 assistantContainer 没有 messageId，尝试查找 group 中的任何 assistant 相关的 messageId
                        if (!messageId) {
                            // 方法1: 查找所有 data-message-id 属性
                            const allMessageIds = group.querySelectorAll('[data-message-id]');
                            for (const el of allMessageIds) {
                                const role = el.getAttribute('data-message-author-role');
                                if (role === 'assistant') {
                                    messageId = el.getAttribute('data-message-id');
                                    break;
                                }
                            }
                        }
                        
                        // 方法2: 在同一 group 中查找用户消息
                        if (!messageId) {
                            const userContainer = group.querySelector('[data-message-author-role="user"]');
                            const userMessageId = findMessageId(userContainer);
                            if (userMessageId) {
                                if (!imageMap[userMessageId]) imageMap[userMessageId] = {};
                                imageMap[userMessageId].assistant_generated = images;
                                continue;
                            }
                        }

                        // 方法3: 使用之前遍历过的用户消息 ID（跨 group 查找）
                        if (!messageId && lastUserMessageId) {
                            if (!imageMap[lastUserMessageId]) imageMap[lastUserMessageId] = {};
                            imageMap[lastUserMessageId].assistant_generated = images;
                            continue;
                        }

                        if (messageId) {
                            if (!imageMap[messageId]) imageMap[messageId] = {};
                            imageMap[messageId].assistant = images;
                        }
                    }
                }
            }

            return imageMap;
        },

        getConversation: async (conversationId, includeImages = false) => {
            const token = await ChatGPTHandler.ensureAccessToken();
            if (!token) {
                console.error('[ChatGPT] Token not found');
                throw new Error(i18n.t('tokenNotFound'));
            }

            const deviceId = ChatGPTHandler.getOaiDeviceId();
            if (!deviceId) {
                console.error('[ChatGPT] Device ID not found in cookies');
                throw new Error('Cannot get device ID');
            }

            const headers = {
                'Authorization': `Bearer ${token}`,
                'oai-device-id': deviceId
            };

            if (State.chatgptWorkspaceType === 'team' && State.chatgptWorkspaceId) {
                headers['ChatGPT-Account-Id'] = State.chatgptWorkspaceId;
            }

            const response = await fetch(`/backend-api/conversation/${conversationId}`, { headers });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[ChatGPT] Fetch failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText,
                    conversationId,
                    workspaceType: State.chatgptWorkspaceType
                });

                let errorMessage = `Failed to fetch conversation (${response.status}): ${errorText || response.statusText}`;
                if (response.status === 404) {
                    const currentMode = State.chatgptWorkspaceType === 'team' ? i18n.t('teamWorkspace') : i18n.t('userWorkspace');
                    const suggestMode = State.chatgptWorkspaceType === 'team' ? i18n.t('userWorkspace') : i18n.t('teamWorkspace');
                    errorMessage += `\n\n当前模式: ${currentMode}\n建议尝试切换到: ${suggestMode}`;
                    if (State.chatgptWorkspaceType === 'team') {
                        errorMessage += '并手动填写工作区ID';
                    } else {
                        errorMessage += '并手动填写个人ID';
                    }
                }

                throw new Error(errorMessage);
            }

            const data = await response.json();

            // Extract and merge images from DOM if requested
            if (includeImages) {
                const imageMap = await ChatGPTHandler.extractImagesFromDOM(conversationId, includeImages, token);

                // Merge images into conversation data
                if (data.mapping && Object.keys(imageMap).length > 0) {
                    const messageIdToNodeId = {};
                    for (const nodeId in data.mapping) {
                        const node = data.mapping[nodeId];
                        if (node?.message?.id) {
                            messageIdToNodeId[node.message.id] = nodeId;
                        }
                    }

                    for (const [messageId, images] of Object.entries(imageMap)) {
                        const nodeId = messageIdToNodeId[messageId];
                        if (nodeId && data.mapping[nodeId]) {
                            if (!data.mapping[nodeId].lyra_images) {
                                data.mapping[nodeId].lyra_images = {};
                            }
                            if (images.user) {
                                data.mapping[nodeId].lyra_images.user = images.user;
                            }
                            if (images.assistant) {
                                data.mapping[nodeId].lyra_images.assistant = images.assistant;
                            }
                            if (images.assistant_generated) {
                                data.mapping[nodeId].lyra_images.assistant_generated = images.assistant_generated;
                            }
                        }
                    }
                }
            }

            return data;
        },

        previewConversation: async () => {
            const conversationId = ChatGPTHandler.getCurrentConversationId();
            if (!conversationId) {
                alert(i18n.t('uuidNotFound'));
                return;
            }

            try {
                const includeImages = State.includeImages || false;
                const data = await ChatGPTHandler.getConversation(conversationId, includeImages);
                const jsonString = JSON.stringify(data, null, 2);
                const filename = `chatgpt_${data.title || 'conversation'}_${conversationId.substring(0, 8)}.json`;
                await LyraCommunicator.open(jsonString, filename);
            } catch (error) {
                ErrorHandler.handle(error, 'Preview conversation', {
                    userMessage: `${i18n.t('loadFailed')} ${error.message}`
                });
            }
        },

        exportCurrent: async (btn) => {
            const conversationId = ChatGPTHandler.getCurrentConversationId();
            if (!conversationId) {
                alert(i18n.t('uuidNotFound'));
                return;
            }

            const original = btn.innerHTML;
            Utils.setButtonLoading(btn, i18n.t('exporting'));

            try {
                const includeImages = State.includeImages || false;
                const data = await ChatGPTHandler.getConversation(conversationId, includeImages);

                const filename = prompt(i18n.t('enterFilename'), data.title || i18n.t('untitledChat'));
                if (!filename) {
                    Utils.restoreButton(btn, original);
                    return;
                }

                Utils.downloadJSON(JSON.stringify(data, null, 2), `${Utils.sanitizeFilename(filename)}.json`);
            } catch (error) {
                ErrorHandler.handle(error, 'Export conversation');
            } finally {
                Utils.restoreButton(btn, original);
            }
        },

        exportAll: async (btn, controlsArea) => {
            if (typeof fflate === 'undefined' || typeof fflate.zipSync !== 'function' || typeof fflate.strToU8 !== 'function') {
                const errorMsg = i18n.currentLang === 'zh'
                    ? '批量导出功能需要压缩库支持。\n\n由于当前平台的安全策略限制,该功能暂时不可用。\n建议使用"导出当前"功能单个导出对话。'
                    : 'Batch export requires compression library.\n\nThis feature is currently unavailable due to platform security policies.\nPlease use "Export" button to export conversations individually.';
                alert(errorMsg);
                return;
            }

            // 先探测对话数量
            const original = btn.innerHTML;
            Utils.setButtonLoading(btn, i18n.t('detectingConversations'));

            let allConvs;
            try {
                allConvs = await ChatGPTHandler.getAllConversations();
                if (!allConvs || !Array.isArray(allConvs)) throw new Error(i18n.t('fetchFailed'));
            } catch (error) {
                ErrorHandler.handle(error, 'Detect conversations');
                Utils.restoreButton(btn, original);
                return;
            }

            const totalCount = allConvs.length;
            Utils.restoreButton(btn, original);

            // 弹出确认框让用户选择导出数量
            const promptMsg = i18n.currentLang === 'zh'
                ? `${i18n.t('foundConversations')} ${totalCount} ${i18n.t('conversations')}\n\n${i18n.t('selectExportCount')}`
                : `${i18n.t('foundConversations')} ${totalCount} ${i18n.t('conversations')}\n\n${i18n.t('selectExportCount')}`;

            const userInput = prompt(promptMsg, totalCount.toString());

            // 用户取消
            if (userInput === null) {
                alert(i18n.t('exportCancelled'));
                return;
            }

            // 解析用户输入
            let exportCount = totalCount;
            const trimmedInput = userInput.trim();

            if (trimmedInput !== '' && trimmedInput !== '0') {
                const parsed = parseInt(trimmedInput, 10);
                if (isNaN(parsed) || parsed < 0) {
                    alert(i18n.t('invalidNumber'));
                    return;
                }
                exportCount = Math.min(parsed, totalCount);
            }

            // 开始导出
            const progress = Utils.createProgressElem(controlsArea);
            progress.textContent = i18n.t('preparing');
            Utils.setButtonLoading(btn, i18n.t('exporting'));

            try {
                let exported = 0;
                const zipEntries = {};

                const includeImages = State.includeImages || false;
                const currentConvId = ChatGPTHandler.getCurrentConversationId();

                // 只导出最近的 exportCount 个对话
                const convsToExport = allConvs.slice(0, exportCount);
                console.log(`Starting export of ${convsToExport.length} conversations (out of ${totalCount} total)`);

                for (let i = 0; i < convsToExport.length; i++) {
                    const conv = convsToExport[i];
                    progress.textContent = `${i18n.t('gettingConversation')} ${i + 1}/${convsToExport.length}`;

                    if (i > 0 && i % 5 === 0) {
                        await new Promise(resolve => setTimeout(resolve, Config.TIMING.BATCH_EXPORT_YIELD));
                    } else if (i > 0) {
                        await Utils.sleep(Config.TIMING.BATCH_EXPORT_SLEEP);
                    }

                    try {
                        // Note: DOM image extraction only works for the currently open conversation
                        const shouldExtractImages = includeImages && conv.id === currentConvId;
                        const data = await ChatGPTHandler.getConversation(conv.id, shouldExtractImages);
                        if (data) {
                            const title = Utils.sanitizeFilename(data.title || conv.id);
                            const filename = `chatgpt_${conv.id.substring(0, 8)}_${title}.json`;
                            zipEntries[filename] = fflate.strToU8(JSON.stringify(data, null, 2));
                            exported++;
                        }
                    } catch (error) {
                        console.error(`Failed to process ${conv.id}:`, error);
                    }
                }

                progress.textContent = `${i18n.t('compressing')}…`;
                const zipUint8 = fflate.zipSync(zipEntries, { level: 1 });
                const zipBlob = new Blob([zipUint8], { type: 'application/zip' });

                const zipFilename = `chatgpt_export_${exportCount === totalCount ? 'all' : 'recent_' + exportCount}_${new Date().toISOString().slice(0, 10)}.zip`;
                Utils.downloadFile(zipBlob, zipFilename);
                alert(`${i18n.t('successExported')} ${exported} ${i18n.t('conversations')}`);
            } catch (error) {
                ErrorHandler.handle(error, 'Export all conversations');
            } finally {
                Utils.restoreButton(btn, original);
                if (progress.parentNode) progress.parentNode.removeChild(progress);
            }
        },

        addUI: (controls) => {
            // Image inclusion toggle
            const imageToggle = Utils.createToggle(
                i18n.t('includeImages'),
                Config.IMAGE_SWITCH_ID,
                State.includeImages
            );

            const imageToggleInput = imageToggle.querySelector('input');
            imageToggleInput.addEventListener('change', (e) => {
                State.includeImages = e.target.checked;
                localStorage.setItem('lyraIncludeImages', State.includeImages);
                console.log('[ChatGPT] Include images:', State.includeImages);
            });

            controls.appendChild(imageToggle);

            // Workspace type toggle
            const initialLabel = State.chatgptWorkspaceType === 'team' ? i18n.t('teamWorkspace') : i18n.t('userWorkspace');
            const workspaceToggle = Utils.createToggle(
                initialLabel,
                Config.WORKSPACE_TYPE_ID,
                State.chatgptWorkspaceType === 'team'
            );

            const toggleInput = workspaceToggle.querySelector('input');
            const toggleLabel = workspaceToggle.querySelector('.lyra-toggle-label');

            toggleInput.addEventListener('change', (e) => {
                State.chatgptWorkspaceType = e.target.checked ? 'team' : 'user';
                localStorage.setItem('lyraChatGPTWorkspaceType', State.chatgptWorkspaceType);
                toggleLabel.textContent = e.target.checked ? i18n.t('teamWorkspace') : i18n.t('userWorkspace');
                console.log('[ChatGPT] Workspace type changed to:', State.chatgptWorkspaceType);
                UI.recreatePanel();
            });

            controls.appendChild(workspaceToggle);
        },

        addButtons: (controls) => {
            controls.appendChild(Utils.createButton(
                `${previewIcon} ${i18n.t('viewOnline')}`,
                () => ChatGPTHandler.previewConversation()
            ));

            controls.appendChild(Utils.createButton(
                `${exportIcon} ${i18n.t('exportCurrentJSON')}`,
                (btn) => ChatGPTHandler.exportCurrent(btn)
            ));

            controls.appendChild(Utils.createButton(
                `${zipIcon} ${i18n.t('exportAllConversations')}`,
                (btn) => ChatGPTHandler.exportAll(btn, controls)
            ));

            const idLabel = document.createElement('div');
            idLabel.className = 'lyra-input-trigger';

            if (State.chatgptWorkspaceType === 'user') {
                idLabel.textContent = `${i18n.t('manualUserId')}`;
                idLabel.addEventListener('click', () => {
                    const newId = prompt(i18n.t('enterUserId'));
                    if (newId?.trim()) {
                        State.chatgptUserId = newId.trim();
                        localStorage.setItem('lyraChatGPTUserId', State.chatgptUserId);
                        alert(i18n.t('userIdSaved'));
                    }
                });
            } else {
                idLabel.textContent = `${i18n.t('manualWorkspaceId')}`;
                idLabel.addEventListener('click', () => {
                    const newId = prompt(i18n.t('enterWorkspaceId'));
                    if (newId?.trim()) {
                        State.chatgptWorkspaceId = newId.trim();
                        localStorage.setItem('lyraChatGPTWorkspaceId', State.chatgptWorkspaceId);
                        alert(i18n.t('workspaceIdSaved'));
                    }
                });
            }

            controls.appendChild(idLabel);
        }
    };