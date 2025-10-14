// hooks/useFileManager.js - 精简版
import { useState, useCallback, useEffect, useMemo } from 'react';
import { extractChatData, detectBranches, parseJSONL } from '../utils/fileParser';

export const useFileManager = () => {
  const [files, setFiles] = useState([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [processedData, setProcessedData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showTypeConflictModal, setShowTypeConflictModal] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [fileMetadata, setFileMetadata] = useState({});

  // 智能解析文件（JSON或JSONL）
  const parseFile = useCallback(async (file) => {
    const text = await file.text();
    const isJSONL = file.name.endsWith('.jsonl') || (text.includes('\n{') && !text.trim().startsWith('['));
    return isJSONL ? parseJSONL(text) : JSON.parse(text);
  }, []);

  // 处理当前文件
  const processCurrentFile = useCallback(async () => {
    if (!files.length || currentFileIndex >= files.length) {
      setProcessedData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const file = files[currentFileIndex];
      const jsonData = await parseFile(file);
      let data = extractChatData(jsonData, file.name);
      data = detectBranches(data);
      setProcessedData(data);
    } catch (err) {
      console.error('处理文件出错:', err);
      setError(err.message);
      setProcessedData(null);
    } finally {
      setIsLoading(false);
    }
  }, [files, currentFileIndex, parseFile]);

  useEffect(() => {
    processCurrentFile();
  }, [processCurrentFile]);

  // 检查文件兼容性
  const checkCompatibility = useCallback(async (newFiles) => {
    if (!files.length) return true;
    try {
      const newData = extractChatData(await parseFile(newFiles[0]), newFiles[0].name);
      const curData = extractChatData(await parseFile(files[currentFileIndex]), files[currentFileIndex].name);
      const isNewFull = newData.format === 'claude_full_export';
      const isCurFull = curData.format === 'claude_full_export';
      return !(isNewFull !== isCurFull);
    } catch {
      return true;
    }
  }, [files, currentFileIndex, parseFile]);

  // 加载文件
  const loadFiles = useCallback(async (fileList) => {
    const validFiles = fileList.filter(f => 
      f.name.endsWith('.json') || f.name.endsWith('.jsonl') || f.type === 'application/json'
    );
    
    if (!validFiles.length) {
      setError('未找到有效的JSON/JSONL文件');
      return;
    }

    const newFiles = validFiles.filter(nf => 
      !files.some(ef => ef.name === nf.name && ef.lastModified === nf.lastModified)
    );

    if (!newFiles.length) {
      setError('文件已加载');
      return;
    }

    const isCompatible = await checkCompatibility(newFiles);
    if (!isCompatible) {
      setPendingFiles(newFiles);
      setShowTypeConflictModal(true);
      return;
    }

    // 提取元数据
    const newMeta = {};
    for (const file of newFiles) {
      try {
        const data = extractChatData(await parseFile(file), file.name);
        newMeta[file.name] = {
          format: data.format,
          platform: data.platform || data.format,
          messageCount: data.chat_history?.length || 0,
          conversationCount: data.format === 'claude_full_export' ? 
            (data.views?.conversationList?.length || 0) : 1,
          title: data.meta_info?.title || file.name,
          model: data.meta_info?.model || '',
          created_at: data.meta_info?.created_at,
          updated_at: data.meta_info?.updated_at
        };
      } catch (err) {
        console.warn(`提取元数据失败 ${file.name}:`, err);
        newMeta[file.name] = { format: 'unknown', messageCount: 0, title: file.name };
      }
    }
    
    setFileMetadata(prev => ({ ...prev, ...newMeta }));
    setFiles(prev => [...prev, ...newFiles]);
    setError(null);
  }, [files, checkCompatibility, parseFile]);

  const confirmReplaceFiles = useCallback(() => {
    setFiles(pendingFiles);
    setCurrentFileIndex(0);
    setPendingFiles([]);
    setShowTypeConflictModal(false);
    setError(null);
  }, [pendingFiles]);

  const cancelReplaceFiles = useCallback(() => {
    setPendingFiles([]);
    setShowTypeConflictModal(false);
  }, []);

  const removeFile = useCallback((index) => {
    const toRemove = files[index];
    if (toRemove) {
      setFileMetadata(prev => {
        const { [toRemove.name]: _, ...rest } = prev;
        return rest;
      });
    }
    
    setFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index);
      if (!newFiles.length) setCurrentFileIndex(0);
      else if (index <= currentFileIndex && currentFileIndex > 0) {
        setCurrentFileIndex(currentFileIndex - 1);
      }
      return newFiles;
    });
  }, [currentFileIndex, files]);

  const switchFile = useCallback((index) => {
    if (index >= 0 && index < files.length) {
      setCurrentFileIndex(index);
    }
  }, [files.length]);

  const reorderFiles = useCallback((fromIdx, toIdx) => {
    if (fromIdx === toIdx) return;
    
    setFiles(prev => {
      const newFiles = [...prev];
      const [moved] = newFiles.splice(fromIdx, 1);
      newFiles.splice(toIdx, 0, moved);
      
      if (fromIdx === currentFileIndex) setCurrentFileIndex(toIdx);
      else if (fromIdx < currentFileIndex && toIdx >= currentFileIndex) {
        setCurrentFileIndex(currentFileIndex - 1);
      } else if (fromIdx > currentFileIndex && toIdx <= currentFileIndex) {
        setCurrentFileIndex(currentFileIndex + 1);
      }
      
      return newFiles;
    });
  }, [currentFileIndex]);

  const actions = useMemo(() => ({
    loadFiles,
    removeFile,
    switchFile,
    reorderFiles,
    confirmReplaceFiles,
    cancelReplaceFiles
  }), [loadFiles, removeFile, switchFile, reorderFiles, confirmReplaceFiles, cancelReplaceFiles]);

  return {
    files,
    currentFile: files[currentFileIndex] || null,
    currentFileIndex,
    processedData,
    isLoading,
    error,
    showTypeConflictModal,
    pendingFiles,
    fileMetadata,
    actions
  };
};