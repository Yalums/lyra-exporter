import React, { useState, useMemo, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useI18n } from '../../index.js';
import { extractChatData, detectBranches } from '../../utils/fileParser';
import { TextUtils, DateTimeUtils } from '../../utils/fileParser';
import PlatformIcon from '../PlatformIcon';
import BranchSwitcher from '../shared/BranchSwitcher';
import { analyzeBranches, filterDisplayMessages, ROOT_UUID } from '../../utils/branchAnalysis';
import { computeTreeLayout, getBranchColor } from '../../utils/whiteboardLayoutEngine';

// Parse JSONL format
function parseJSONL(text) {
  const lines = text.split('\n').filter(l => l.trim());
  const objects = lines.map(l => JSON.parse(l));
  return objects.length === 1 ? objects[0] : objects;
}

// ReactMarkdown 预览组件配置（与时间线一致的简化渲染）
const markdownComponents = {
  p: ({ children }) => <span>{children}</span>,
  h1: ({ children }) => <strong>{children}</strong>,
  h2: ({ children }) => <strong>{children}</strong>,
  h3: ({ children }) => <strong>{children}</strong>,
  h4: ({ children }) => <strong>{children}</strong>,
  h5: ({ children }) => <strong>{children}</strong>,
  h6: ({ children }) => <strong>{children}</strong>,
  strong: ({ children }) => <strong>{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  code: ({ inline, children }) => inline ?
    <code className="inline-code">{children}</code> :
    <code>{children}</code>,
  pre: ({ children }) => <span>{children}</span>,
  blockquote: ({ children }) => <span>" {children} "</span>,
  a: ({ children }) => <span>{children}</span>,
  ul: ({ children }) => <span>{children}</span>,
  ol: ({ children }) => <span>{children}</span>,
  li: ({ children }) => <span>• {children}</span>
};

const CardPickerPanel = ({
  files,
  fileMetadata,
  currentFileIndex,
  processedData,
  parsedFilesCache,
  onParsedFilesUpdate,
  canvasCards,
  onAddCard,
  onAddCardsWithLayout,
  onClose,
  pan,
  scale,
  viewportWidth,
  viewportHeight,
}) => {
  const { t } = useI18n();
  const [selectedFileIdx, setSelectedFileIdx] = useState(currentFileIndex);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // 分支状态
  const [branchFilters, setBranchFilters] = useState(new Map());
  const [showAllBranches, setShowAllBranches] = useState(false);

  // Fix 1c: Synchronous dedup ref to prevent rapid double-click adding
  const addingRef = useRef(new Set());

  // Get file display names
  const fileOptions = useMemo(() => {
    return files.map((file, idx) => {
      const meta = fileMetadata[file.name] || {};
      return {
        idx,
        name: meta.title || meta.name || file.name.replace(/\.(json|jsonl)$/i, ''),
        platform: meta.platform || meta.format || 'claude',
        format: meta.format,
        messageCount: meta.messageCount || 0,
      };
    });
  }, [files, fileMetadata]);

  // Get messages for selected file
  const getFileData = useCallback(async (fileIdx) => {
    // Use processedData for current file
    if (fileIdx === currentFileIndex && processedData) {
      return processedData;
    }
    // Check cache
    const file = files[fileIdx];
    if (!file) return null;
    if (parsedFilesCache[file.name]) return parsedFilesCache[file.name];

    // Check for pre-processed merged data (merged JSONL files)
    if (file._mergedProcessedData) {
      const data = file._mergedProcessedData;
      onParsedFilesUpdate(prev => ({ ...prev, [file.name]: data }));
      return data;
    }

    // Parse on demand
    setLoading(true);
    setError(null);
    try {
      const text = await file.text();
      const isJSONL = file.name.endsWith('.jsonl') || (text.includes('\n{') && !text.trim().startsWith('['));
      const jsonData = isJSONL ? parseJSONL(text) : JSON.parse(text);
      let data = extractChatData(jsonData, file.name);
      data = detectBranches(data);
      onParsedFilesUpdate(prev => ({ ...prev, [file.name]: data }));
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [files, currentFileIndex, processedData, parsedFilesCache, onParsedFilesUpdate]);

  // Messages for selected file
  const [fileData, setFileData] = useState(null);

  // Load file data when selection changes
  React.useEffect(() => {
    let cancelled = false;
    getFileData(selectedFileIdx).then(data => {
      if (!cancelled) setFileData(data);
    });
    return () => { cancelled = true; };
  }, [selectedFileIdx, getFileData]);

  const messages = useMemo(() => {
    if (!fileData) return [];
    return fileData.chat_history || [];
  }, [fileData]);

  // 分支分析
  const branchAnalysis = useMemo(() => analyzeBranches(messages), [messages]);

  // 根据分支过滤消息
  const branchFilteredMessages = useMemo(() =>
    filterDisplayMessages(messages, branchFilters, branchAnalysis, showAllBranches),
    [messages, branchFilters, branchAnalysis, showAllBranches]
  );

  // 搜索过滤（在分支过滤之上叠加）
  const filteredMessages = useMemo(() => {
    if (!search.trim()) return branchFilteredMessages;
    const q = search.toLowerCase();
    return branchFilteredMessages.filter(m =>
      (m.display_text || '').toLowerCase().includes(q) ||
      (m.sender_label || '').toLowerCase().includes(q)
    );
  }, [branchFilteredMessages, search]);

  // Track which messages are already on canvas
  const addedUuids = useMemo(() => {
    const uuids = new Set();
    Object.values(canvasCards).forEach(card => {
      uuids.add(card.sourceMessageUuid);
    });
    return uuids;
  }, [canvasCards]);

  // 分支切换 handlers
  const handleBranchSwitch = useCallback((branchPointUuid, newIndex) => {
    setShowAllBranches(false);
    setBranchFilters(prev => new Map(prev).set(branchPointUuid, newIndex));
  }, []);

  const handleShowAllBranches = useCallback(() => {
    setShowAllBranches(prev => !prev);
  }, []);

  // 切换文件时重置分支状态
  const handleFileChange = useCallback((fileIdx) => {
    setSelectedFileIdx(fileIdx);
    setBranchFilters(new Map());
    setShowAllBranches(false);
  }, []);

  // 获取当前文件的平台信息
  const currentFileMeta = useMemo(() => {
    const file = files[selectedFileIdx];
    if (!file) return {};
    return fileMetadata[file.name] || {};
  }, [files, selectedFileIdx, fileMetadata]);

  // 根分支数据
  const rootBranchData = useMemo(() => {
    return branchAnalysis.branchPoints.get(ROOT_UUID);
  }, [branchAnalysis]);

  // Add a message as card
  const handleAddMessage = useCallback((msg) => {
    // Fix 1c: Synchronous dedup guard
    if (addingRef.current.has(msg.uuid)) return;
    addingRef.current.add(msg.uuid);

    const file = files[selectedFileIdx];
    if (!file) return;
    const meta = fileMetadata[file.name] || {};
    const preview = TextUtils?.getPreview
      ? TextUtils.getPreview(msg.display_text, 80)
      : (msg.display_text || '').slice(0, 80);
    const fullPreview = TextUtils?.getPreview
      ? TextUtils.getPreview(msg.display_text, 500)
      : (msg.display_text || '').slice(0, 500);

    // Position: center of viewport with slight random offset
    const cx = viewportWidth ? (-pan.x + viewportWidth / 2) / scale : 200;
    const cy = viewportHeight ? (-pan.y + viewportHeight / 2) / scale : 200;

    onAddCard({
      sourceFileName: file.name,
      sourceMessageUuid: msg.uuid,
      sourceMessageIndex: msg.index,
      sender: msg.sender,
      senderLabel: msg.sender_label || (msg.sender === 'human' ? 'User' : 'Assistant'),
      preview,
      fullPreview,
      fullContent: msg.display_text || '', // Fix 3c: Store full content as fallback
      timestamp: msg.timestamp,
      platform: meta.platform || meta.format || 'claude',
      format: meta.format,
      x: cx - 140 + Math.random() * 60 - 30,
      y: cy - 80 + Math.random() * 60 - 30,
      width: null,
      height: null,
      color: null,
      sizePreset: 'default',
      zIndex: Object.keys(canvasCards).length,
    });
  }, [files, selectedFileIdx, fileMetadata, pan, scale, viewportWidth, viewportHeight, onAddCard, canvasCards]);

  // Add all visible messages with tree layout + auto-connections
  const handleAddAll = useCallback(() => {
    const newMessages = filteredMessages.filter(m => !addedUuids.has(m.uuid));
    if (newMessages.length === 0) return;

    const file = files[selectedFileIdx];
    if (!file) return;
    const meta = fileMetadata[file.name] || {};

    // Build nodes for tree layout using parent_uuid relationships
    const uuidToIndex = new Map();
    newMessages.forEach(msg => uuidToIndex.set(msg.uuid, msg.index));

    const nodes = newMessages.map(msg => {
      let parentIndex = null;
      if (msg.parent_uuid && uuidToIndex.has(msg.parent_uuid)) {
        parentIndex = uuidToIndex.get(msg.parent_uuid);
      }
      return {
        id: msg.index,
        uuid: msg.uuid,
        parent: parentIndex,
        role: msg.sender === 'human' ? 'user' : 'assistant',
        content: (msg.display_text || '').slice(0, 55),
      };
    });

    // Compute tree positions
    const layout = computeTreeLayout(nodes);

    // Build card data array with tree-computed positions
    const cardsToAdd = [];
    const edgesToAdd = [];

    newMessages.forEach((msg, i) => {
      const pos = layout.positions[msg.index] || { x: 100 + (i % 5) * 320, y: 100 + Math.floor(i / 5) * 210 };
      const branchId = layout.branchOf[msg.index] ?? 0;
      const branchColor = getBranchColor(branchId);
      const preview = TextUtils?.getPreview
        ? TextUtils.getPreview(msg.display_text, 80)
        : (msg.display_text || '').slice(0, 80);
      const fullPreview = TextUtils?.getPreview
        ? TextUtils.getPreview(msg.display_text, 500)
        : (msg.display_text || '').slice(0, 500);

      cardsToAdd.push({
        sourceFileName: file.name,
        sourceMessageUuid: msg.uuid,
        sourceMessageIndex: msg.index,
        sourceParentUuid: msg.parent_uuid || null,
        sender: msg.sender,
        senderLabel: msg.sender_label || (msg.sender === 'human' ? 'User' : 'Assistant'),
        preview,
        fullPreview,
        fullContent: msg.display_text || '', // Fix 3c: Store full content as fallback
        timestamp: msg.timestamp,
        platform: meta.platform || meta.format || 'claude',
        format: meta.format,
        x: pos.x,
        y: pos.y,
        width: null,
        height: null,
        color: branchColor,
        sizePreset: 'default',
        zIndex: Object.keys(canvasCards).length + i,
      });
    });

    // Build edges from the layout
    layout.edges.forEach(edge => {
      const fromMsg = newMessages.find(m => m.index === edge.from);
      const toMsg = newMessages.find(m => m.index === edge.to);
      if (fromMsg && toMsg) {
        const branchId = layout.branchOf[edge.to] ?? 0;
        edgesToAdd.push({
          fromUuid: fromMsg.uuid,
          toUuid: toMsg.uuid,
          color: getBranchColor(branchId),
        });
      }
    });

    // Delegate to parent (WhiteboardView) to add cards + connections atomically
    if (onAddCardsWithLayout) {
      onAddCardsWithLayout(cardsToAdd, edgesToAdd);
    } else {
      // Fallback: add cards individually without connections
      cardsToAdd.forEach(card => onAddCard(card));
    }
  }, [filteredMessages, addedUuids, files, selectedFileIdx, fileMetadata, onAddCard, onAddCardsWithLayout, canvasCards]);

  const newMessageCount = filteredMessages.filter(m => !addedUuids.has(m.uuid)).length;

  return (
    <div className="card-picker-panel">
      <div className="card-picker-header">
        <span className="card-picker-title">{t('whiteboard.cardPicker.title') || 'Add Cards'}</span>
        <button className="card-picker-close" onClick={onClose}>✕</button>
      </div>

      {/* File selector */}
      <div className="card-picker-file-select">
        <select
          value={selectedFileIdx}
          onChange={(e) => handleFileChange(Number(e.target.value))}
        >
          {fileOptions.map(opt => (
            <option key={opt.idx} value={opt.idx}>
              {opt.name} ({opt.messageCount} msgs)
            </option>
          ))}
        </select>
      </div>

      {/* Search */}
      <div className="card-picker-search">
        <input
          type="text"
          placeholder={t('whiteboard.cardPicker.search') || 'Search messages...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* 时间线风格消息列表 */}
      <div className="card-picker-message-list picker-timeline">
        {loading && <div className="card-picker-loading">{t('app.loading') || 'Loading...'}</div>}
        {error && <div className="card-picker-error">{error}</div>}

        {!loading && !error && (
          <>
            {/* 分支信息提示 */}
            {branchAnalysis.branchPoints.size > 0 && (
              <div className="picker-branch-info">
                <span className="picker-branch-info-text">
                  🔀 {branchAnalysis.branchPoints.size} {t('whiteboard.cardPicker.branchPoints') || 'branch points'}
                </span>
                <button
                  className="picker-branch-toggle-btn"
                  onClick={handleShowAllBranches}
                >
                  {showAllBranches
                    ? (t('whiteboard.cardPicker.showByBranch') || 'By Branch')
                    : (t('whiteboard.cardPicker.showAll') || 'Show All')
                  }
                </button>
              </div>
            )}

            {/* 根分支切换器 */}
            {rootBranchData && rootBranchData.branches.length > 1 && !showAllBranches && (
              <BranchSwitcher
                branchPoint={rootBranchData.branchPoint}
                availableBranches={rootBranchData.branches}
                currentBranchIndex={branchFilters.get(ROOT_UUID) ?? 0}
                onBranchChange={(idx) => handleBranchSwitch(ROOT_UUID, idx)}
                onShowAllBranches={handleShowAllBranches}
                showAllMode={false}
                className="picker-branch-switcher"
              />
            )}

            {/* 空状态 */}
            {filteredMessages.length === 0 && (
              <div className="card-picker-empty">{t('whiteboard.cardPicker.noMessages') || 'No messages found'}</div>
            )}

            {/* 时间线消息 */}
            <div className="picker-timeline-messages">
              <div className="picker-timeline-line"></div>

              {filteredMessages.map((msg, index) => {
                const isAdded = addedUuids.has(msg.uuid);
                const branchData = branchAnalysis.branchPoints.get(msg.uuid);
                const shouldShowSwitcher = branchData && branchData.branches.length > 1 && !showAllBranches;

                return (
                  <React.Fragment key={msg.uuid || index}>
                    <div className={`picker-timeline-message ${isAdded ? 'added' : ''}`}>
                      {/* 时间线圆点 */}
                      <div className={`picker-timeline-dot ${msg.sender === 'human' ? 'human' : 'assistant'}`} />

                      {/* 消息内容区 */}
                      <div
                        className="picker-timeline-content"
                        onClick={() => !isAdded && handleAddMessage(msg)}
                      >
                        <div className="picker-timeline-header">
                          <div className="picker-timeline-sender">
                            <div className={`picker-timeline-avatar ${msg.sender === 'human' ? 'human' : 'assistant'}`}>
                              {msg.sender === 'human' ? '👤' : (
                                <PlatformIcon
                                  platform={currentFileMeta.platform?.toLowerCase() || 'claude'}
                                  format={currentFileMeta.format}
                                  size={16}
                                  style={{ backgroundColor: 'transparent' }}
                                />
                              )}
                            </div>
                            <span className="picker-timeline-name">{msg.sender_label || (msg.sender === 'human' ? 'User' : 'AI')}</span>
                            {msg.timestamp && (
                              <span className="picker-timeline-time">
                                {DateTimeUtils.formatTime(msg.timestamp)}
                              </span>
                            )}
                          </div>
                          {/* 添加按钮 */}
                          <button
                            className={`picker-add-btn ${isAdded ? 'added' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isAdded) handleAddMessage(msg);
                            }}
                            disabled={isAdded}
                            title={isAdded ? (t('whiteboard.cardPicker.alreadyAdded') || 'Already added') : (t('whiteboard.cardPicker.addCard') || 'Add to canvas')}
                          >
                            {isAdded ? '✓' : '+'}
                          </button>
                        </div>

                        {/* ReactMarkdown 预览 */}
                        <div className="picker-timeline-body">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={markdownComponents}
                          >
                            {TextUtils?.getPreview
                              ? TextUtils.getPreview(msg.display_text)
                              : (msg.display_text || '').slice(0, 200)
                            }
                          </ReactMarkdown>
                        </div>

                        {/* Tags footer */}
                        <div className="picker-timeline-footer">
                          {msg.sender !== 'human' && msg.thinking && (
                            <span className="picker-tag">💭 {t('timeline.tags.hasThinking') || 'Thinking'}</span>
                          )}
                          {(() => {
                            const embeddedImages = msg.attachments?.filter(att =>
                              att.is_embedded_image || (currentFileMeta.format === 'grok' && att.file_type?.startsWith('image/'))
                            ) || [];
                            const totalImages = (msg.images?.length || 0) + embeddedImages.length;
                            return totalImages > 0 && (
                              <span className="picker-tag">🖼️ {totalImages}{t('timeline.tags.images') || ' images'}</span>
                            );
                          })()}
                          {(() => {
                            const regularAttachments = msg.attachments?.filter(att =>
                              !att.is_embedded_image && !(currentFileMeta.format === 'grok' && att.file_type?.startsWith('image/'))
                            ) || [];
                            return regularAttachments.length > 0 && (
                              <span className="picker-tag">📎 {regularAttachments.length}{t('timeline.tags.attachments') || ' attachments'}</span>
                            );
                          })()}
                          {msg.sender !== 'human' && msg.artifacts && msg.artifacts.length > 0 && (
                            <span className="picker-tag">🔧 {msg.artifacts.length} Artifacts</span>
                          )}
                          {msg.tools && msg.tools.length > 0 && (
                            <span className="picker-tag">🔍 {t('timeline.tags.usedTools') || 'Tools'}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 分支切换器 */}
                    {shouldShowSwitcher && (
                      <BranchSwitcher
                        key={`branch-${msg.uuid}`}
                        branchPoint={msg}
                        availableBranches={branchData.branches}
                        currentBranchIndex={branchFilters.get(msg.uuid) ?? 0}
                        onBranchChange={(idx) => handleBranchSwitch(msg.uuid, idx)}
                        onShowAllBranches={handleShowAllBranches}
                        showAllMode={false}
                        className="picker-branch-switcher"
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Bulk add */}
      {filteredMessages.length > 0 && (
        <div className="card-picker-footer">
          <button className="card-picker-add-all-btn" onClick={handleAddAll} disabled={newMessageCount === 0}>
            {t('whiteboard.cardPicker.addAll') || 'Add All'} ({newMessageCount})
          </button>
        </div>
      )}

      {/* No files state */}
      {files.length === 0 && (
        <div className="card-picker-no-files">
          {t('whiteboard.cardPicker.noFiles') || 'No files loaded'}
        </div>
      )}
    </div>
  );
};

export default React.memo(CardPickerPanel);
