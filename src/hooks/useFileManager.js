import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  applyPendingProjectConfig,
  buildMergedConversation,
  extractMetadataBatch,
  isImportableFile,
  parseImportFile,
  processImportFile,
} from '../services/import/fileImportService';
import { groupFilesByConversation } from '../services/import/conversationGroupingService';

const DEFAULT_PROGRESS = { current: 0, total: 0 };

export function useFileManager() {
  const [files, setFiles] = useState([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [processedData, setProcessedData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showTypeConflictModal, setShowTypeConflictModal] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [fileMetadata, setFileMetadata] = useState({});
  const [loadingProgress, setLoadingProgress] = useState(DEFAULT_PROGRESS);

  const processCurrentFile = useCallback(async () => {
    if (!files.length || currentFileIndex >= files.length) {
      setProcessedData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const file = files[currentFileIndex];
      if (file._mergedProcessedData) {
        setProcessedData(file._mergedProcessedData);
      } else {
        const { processedData: nextProcessedData } = await processImportFile(file);
        setProcessedData(nextProcessedData);
      }
    } catch (err) {
      console.error('[Loominary processCurrentFile] 处理文件出错:', err);
      setError(err.message);
      setProcessedData(null);
    } finally {
      setIsLoading(false);
    }
  }, [files, currentFileIndex]);

  useEffect(() => {
    processCurrentFile();
  }, [processCurrentFile]);

  const checkCompatibility = useCallback(async () => true, []);

  const loadFiles = useCallback(async (fileList, { replace = false } = {}) => {
    const validFiles = fileList.filter(isImportableFile);
    if (!validFiles.length) {
      setError('未找到有效的JSON/JSONL文件');
      return;
    }

    const newFiles = replace
      ? validFiles
      : validFiles.filter((nextFile) =>
          !files.some((existingFile) => existingFile.name === nextFile.name && existingFile.lastModified === nextFile.lastModified)
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

    setLoadingProgress({ current: 0, total: newFiles.length });
    const extractedMetadata = await extractMetadataBatch(newFiles, setLoadingProgress);
    setLoadingProgress(DEFAULT_PROGRESS);

    const configured = applyPendingProjectConfig(newFiles, extractedMetadata);
    setFileMetadata(replace ? configured.metadata : (prev) => ({ ...prev, ...configured.metadata }));
    setFiles(replace ? configured.files : (prev) => [...prev, ...configured.files]);
    if (replace) setCurrentFileIndex(0);
    setError(null);
  }, [files, checkCompatibility]);

  const loadMergedJSONLFiles = useCallback(async (fileList) => {
    const jsonlFiles = fileList.filter((file) => file.name.endsWith('.jsonl') || file.name.endsWith('.json'));

    if (!jsonlFiles.length) {
      setError('未找到 JSONL/JSON 文件');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const filesData = await Promise.all(
        jsonlFiles.map(async (file) => ({
          file,
          fileName: file.name,
          data: await parseImportFile(file),
        }))
      );

      const grouped = groupFilesByConversation(filesData);

      for (const group of grouped) {
        if (group.length === 1) {
          await loadFiles([group[0].file]);
          continue;
        }

        try {
          const { file, metadata } = buildMergedConversation(group);
          setFileMetadata((prev) => ({ ...prev, [file.name]: metadata }));
          setFiles((prev) => [...prev, file]);
        } catch (error) {
          console.error('合并文件失败:', error);
          for (const fileData of group) {
            await loadFiles([fileData.file]);
          }
        }
      }

      setError(null);
    } catch (error) {
      console.error('加载文件夹失败:', error);
      setError(`加载文件夹失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [loadFiles]);

  const confirmReplaceFiles = useCallback(async () => {
    const nextFiles = pendingFiles;
    setPendingFiles([]);
    setShowTypeConflictModal(false);
    await loadFiles(nextFiles, { replace: true });
  }, [pendingFiles, loadFiles]);

  const cancelReplaceFiles = useCallback(() => {
    setPendingFiles([]);
    setShowTypeConflictModal(false);
  }, []);

  const removeFile = useCallback((index) => {
    const toRemove = files[index];
    if (toRemove) {
      setFileMetadata((prev) => {
        const { [toRemove.name]: _removed, ...rest } = prev;
        return rest;
      });
    }

    setFiles((prev) => {
      const nextFiles = prev.filter((_, fileIndex) => fileIndex !== index);
      if (!nextFiles.length) {
        setCurrentFileIndex(0);
      } else if (index <= currentFileIndex && currentFileIndex > 0) {
        setCurrentFileIndex(currentFileIndex - 1);
      }
      return nextFiles;
    });
  }, [currentFileIndex, files]);

  const switchFile = useCallback((index) => {
    if (index >= 0 && index < files.length) {
      setCurrentFileIndex(index);
    }
  }, [files.length]);

  const reorderFiles = useCallback((fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;

    setFiles((prev) => {
      const nextFiles = [...prev];
      const [movedFile] = nextFiles.splice(fromIndex, 1);
      nextFiles.splice(toIndex, 0, movedFile);

      if (fromIndex === currentFileIndex) {
        setCurrentFileIndex(toIndex);
      } else if (fromIndex < currentFileIndex && toIndex >= currentFileIndex) {
        setCurrentFileIndex(currentFileIndex - 1);
      } else if (fromIndex > currentFileIndex && toIndex <= currentFileIndex) {
        setCurrentFileIndex(currentFileIndex + 1);
      }

      return nextFiles;
    });
  }, [currentFileIndex]);

  const actions = useMemo(() => ({
    loadFiles,
    loadMergedJSONLFiles,
    removeFile,
    switchFile,
    reorderFiles,
    confirmReplaceFiles,
    cancelReplaceFiles,
  }), [loadFiles, loadMergedJSONLFiles, removeFile, switchFile, reorderFiles, confirmReplaceFiles, cancelReplaceFiles]);

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
    loadingProgress,
    actions,
  };
}
