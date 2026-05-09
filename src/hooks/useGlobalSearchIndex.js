import { useEffect } from 'react';
import { getGlobalSearchManager } from '../utils/globalSearchManager';

export function useGlobalSearchIndex({ files, processedData, currentFileIndex, allFilesLoaded, customNames }) {
  useEffect(() => {
    if (!files.length || !allFilesLoaded) {
      return undefined;
    }

    const timer = setTimeout(() => {
      const globalSearchManager = getGlobalSearchManager();
      globalSearchManager.buildGlobalIndex(files, processedData, currentFileIndex, customNames)
        .catch((error) => {
          console.error('[App] 构建全局搜索索引失败:', error);
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [files, processedData, currentFileIndex, allFilesLoaded, customNames]);
}
