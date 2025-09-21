// hooks/useFileManager.js
import { useState, useCallback, useEffect, useMemo } from 'react';
import { extractChatData, detectBranches } from '../utils/fileParser';

export const useFileManager = () => {
  const [files, setFiles] = useState([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [processedData, setProcessedData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showTypeConflictModal, setShowTypeConflictModal] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [fileMetadata, setFileMetadata] = useState({}); // 存储每个文件的基本元数据

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
      const text = await file.text();
      const jsonData = JSON.parse(text);
      
      // 解析AI对话数据（支持Claude、Gemini、NotebookLM格式）
      let data = extractChatData(jsonData, file.name);
      // 检测分支（主要用于Claude格式）
      data = detectBranches(data);
      
      setProcessedData(data);
    } catch (err) {
      console.error('处理文件出错:', err);
      setError(err.message);
      setProcessedData(null);
    } finally {
      setIsLoading(false);
    }
  }, [files, currentFileIndex]);

  // 当文件或索引改变时，处理文件
  useEffect(() => {
    processCurrentFile();
  }, [processCurrentFile]);

  // 检查文件类型是否兼容
  const checkFileTypeCompatibility = useCallback(async (newFiles) => {
    if (files.length === 0) return true;

    try {
      // 检查第一个新文件的类型
      const firstNewFile = newFiles[0];
      const text = await firstNewFile.text();
      const jsonData = JSON.parse(text);
      const newFileData = extractChatData(jsonData, firstNewFile.name);
      
      // 检查当前已加载文件的类型
      const currentFile = files[currentFileIndex];
      const currentText = await currentFile.text();
      const currentJsonData = JSON.parse(currentText);
      const currentFileData = extractChatData(currentJsonData, currentFile.name);
      
      // 如果有claude_full_export格式，不能与其他格式混合
      const isNewFullExport = newFileData.format === 'claude_full_export';
      const isCurrentFullExport = currentFileData.format === 'claude_full_export';
      
      return !(isNewFullExport !== isCurrentFullExport);
    } catch (error) {
      console.warn('文件类型检查失败:', error);
      return true; // 如果检查失败，允许加载
    }
  }, [files, currentFileIndex]);

  // 加载文件
  const loadFiles = useCallback(async (fileList) => {
    const jsonFiles = fileList.filter(file => {
      // 检查文件扩展名和类型
      return file.name.endsWith('.json') || file.type === 'application/json';
    });
    
    if (jsonFiles.length === 0) {
      setError('未找到JSON文件');
      return;
    }

    // 检查重复文件
    const newFiles = jsonFiles.filter(newFile => 
      !files.some(existingFile => 
        existingFile.name === newFile.name && 
        existingFile.lastModified === newFile.lastModified
      )
    );

    if (newFiles.length === 0) {
      setError('选择的文件已经加载');
      return;
    }

    // 检查文件类型兼容性
    const isCompatible = await checkFileTypeCompatibility(newFiles);
    
    if (!isCompatible) {
      setPendingFiles(newFiles);
      setShowTypeConflictModal(true);
      return;
    }

    // 提取新文件的元数据
    const newMetadata = {};
    for (const file of newFiles) {
      try {
        const text = await file.text();
        const jsonData = JSON.parse(text);
        const data = extractChatData(jsonData, file.name);
        
        // 提取基本信息
        newMetadata[file.name] = {
          format: data.format,
          platform: data.platform || 'claude',
          messageCount: data.chat_history?.length || 0,
          conversationCount: data.format === 'claude_full_export' ? 
            (data.views?.conversationList?.length || 0) : 1,
          title: data.meta_info?.title || file.name,
          model: data.meta_info?.model || (data.format === 'claude' ? '' : 'Claude'), // 对 claude 格式使用空字符串
          created_at: data.meta_info?.created_at,
          updated_at: data.meta_info?.updated_at
        };
      } catch (err) {
        console.warn(`无法提取文件 ${file.name} 的元数据:`, err);
        newMetadata[file.name] = {
          format: 'unknown',
          messageCount: 0,
          conversationCount: 0,
          title: file.name,
          model: '' // 默认为空，让 getModelDisplay 处理
        };
      }
    }
    
    setFileMetadata(prev => ({ ...prev, ...newMetadata }));
    setFiles(prevFiles => [...prevFiles, ...newFiles]);
    setError(null);
  }, [files, checkFileTypeCompatibility]);

  // 确认替换文件
  const confirmReplaceFiles = useCallback(() => {
    setFiles(pendingFiles);
    setCurrentFileIndex(0);
    setPendingFiles([]);
    setShowTypeConflictModal(false);
    setError(null);
  }, [pendingFiles]);

  // 取消替换文件
  const cancelReplaceFiles = useCallback(() => {
    setPendingFiles([]);
    setShowTypeConflictModal(false);
  }, []);

  // 移除文件
  const removeFile = useCallback((index) => {
    const fileToRemove = files[index];
    
    if (fileToRemove) {
      // 清理元数据
      setFileMetadata(prev => {
        const newMetadata = { ...prev };
        delete newMetadata[fileToRemove.name];
        return newMetadata;
      });
    }
    
    setFiles(prevFiles => {
      const newFiles = prevFiles.filter((_, i) => i !== index);
      
      // 调整当前索引
      if (newFiles.length === 0) {
        setCurrentFileIndex(0);
      } else if (index <= currentFileIndex && currentFileIndex > 0) {
        setCurrentFileIndex(currentFileIndex - 1);
      }
      
      return newFiles;
    });
  }, [currentFileIndex, files]);

  // 切换文件
  const switchFile = useCallback((index) => {
    if (index >= 0 && index < files.length) {
      setCurrentFileIndex(index);
    }
  }, [files.length]);

  // 重排序文件
  const reorderFiles = useCallback((fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    
    setFiles(prevFiles => {
      const newFiles = [...prevFiles];
      const [movedFile] = newFiles.splice(fromIndex, 1);
      newFiles.splice(toIndex, 0, movedFile);
      
      // 更新当前文件索引
      if (fromIndex === currentFileIndex) {
        setCurrentFileIndex(toIndex);
      } else if (fromIndex < currentFileIndex && toIndex >= currentFileIndex) {
        setCurrentFileIndex(currentFileIndex - 1);
      } else if (fromIndex > currentFileIndex && toIndex <= currentFileIndex) {
        setCurrentFileIndex(currentFileIndex + 1);
      }
      
      return newFiles;
    });
  }, [currentFileIndex]);

  // 获取当前文件信息
  const currentFile = files[currentFileIndex] || null;

  // 使用 useMemo 稳定 actions 对象，避免不必要的重新渲染
  const actions = useMemo(() => ({
    loadFiles,
    removeFile,
    switchFile,
    reorderFiles,
    confirmReplaceFiles,
    cancelReplaceFiles
  }), [loadFiles, removeFile, switchFile, reorderFiles, confirmReplaceFiles, cancelReplaceFiles]);

  return {
    // 状态
    files,
    currentFile,
    currentFileIndex,
    processedData,
    isLoading,
    error,
    showTypeConflictModal,
    pendingFiles,
    fileMetadata, // 新增文件元数据
    
    // 操作
    actions
  };
};