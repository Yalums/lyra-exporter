// components/GranularExportMenu.js
// Menu de exportação granular com ícones e opções de visualização

import React, { useState, useEffect, useRef } from 'react';
import {
  Package,
  FolderOpen,
  FileText,
  MessageSquare,
  Brain,
  FileCode,
  Plus,
  Settings,
  ChevronRight,
  X,
  Download,
  Check
} from 'lucide-react';
import { getGranularExportManager } from '../utils/export/granularExportManager';

/**
 * Componente de menu de exportação granular
 */
const GranularExportMenu = ({
  isOpen,
  onClose,
  processedData,
  selectedMessage,
  selectedMessageIndex,
  files,
  currentFileIndex,
  viewMode,
  t
}) => {
  const [displayMode, setDisplayMode] = useState('icons'); // 'icons' | 'full'
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [branches, setBranches] = useState([]);
  const panelRef = useRef(null);
  const exportManager = getGranularExportManager();

  // Carrega branches disponíveis
  useEffect(() => {
    if (processedData) {
      const branchOptions = exportManager.getBranchOptions(processedData);
      setBranches(branchOptions);
    }
  }, [processedData]);

  // Fecha ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Reset ao abrir
  useEffect(() => {
    if (isOpen) {
      setExportResult(null);
      setIsExporting(false);
    }
  }, [isOpen]);

  // Opções de exportação com ícones
  const exportOptions = [
    {
      id: 'project',
      icon: Package,
      label: t?.('granularExport.project.label') || 'PROJETO',
      description: t?.('granularExport.project.description') || 'Extrair tudo (descrição, system prompt, banco de conhecimento, conversas)',
      action: 'exportProject',
      available: !!processedData?.format?.includes('full_export'),
      output: 'ZIP'
    },
    {
      id: 'conversation',
      icon: FolderOpen,
      label: t?.('granularExport.conversation.label') || 'CONVERSA',
      description: t?.('granularExport.conversation.description') || 'Extrair toda conversa (incluindo branches)',
      action: 'exportConversation',
      available: !!processedData,
      output: 'ZIP',
      showBranchSelector: branches.length > 1
    },
    {
      id: 'message',
      icon: FileText,
      label: t?.('granularExport.message.label') || 'MENSAGEM',
      description: t?.('granularExport.message.description') || 'Exportar mensagem selecionada',
      action: 'exportMessage',
      available: !!selectedMessage,
      output: 'ZIP',
      showBranchSelector: branches.length > 1
    },
    {
      id: 'thinking',
      icon: Brain,
      label: t?.('granularExport.thinking.label') || 'THINKING',
      description: t?.('granularExport.thinking.description') || 'Processo de pensamento da mensagem',
      action: 'exportThinking',
      available: !!selectedMessage?.thinking,
      output: 'Markdown',
      showBranchSelector: branches.length > 1
    },
    {
      id: 'output',
      icon: MessageSquare,
      label: t?.('granularExport.output.label') || 'OUTPUT',
      description: t?.('granularExport.output.description') || 'Conteúdo da mensagem',
      action: 'exportOutput',
      available: !!selectedMessage,
      output: 'Markdown',
      showBranchSelector: branches.length > 1
    },
    {
      id: 'artifact',
      icon: FileCode,
      label: t?.('granularExport.artifact.label') || 'ARTEFATO',
      description: t?.('granularExport.artifact.description') || 'Código/documento gerado',
      action: 'exportArtifact',
      available: !!(selectedMessage?.artifacts?.length > 0),
      output: 'Arquivo',
      showBranchSelector: branches.length > 1
    },
    {
      id: 'add',
      icon: Plus,
      label: t?.('granularExport.add.label') || 'ADD',
      description: t?.('granularExport.add.description') || 'Adicionar ao banco de conhecimento',
      action: 'addToKnowledge',
      available: !!selectedMessage,
      output: 'Upload'
    }
  ];

  // Handler de exportação
  const handleExport = async (option) => {
    if (!option.available || isExporting) return;

    setIsExporting(true);
    setExportResult(null);

    try {
      let result;

      switch (option.action) {
        case 'exportProject':
          // Prepara dados do projeto
          const projectData = {
            conversations: processedData?.views?.conversationList?.map(conv => ({
              ...conv,
              chat_history: processedData.chat_history?.filter(
                msg => msg.conversation_uuid === conv.uuid
              )
            })) || [processedData],
            meta: {
              name: processedData?.meta_info?.title || 'Projeto',
              description: processedData?.meta_info?.description || '',
              system_prompt: processedData?.meta_info?.system_prompt || '',
              created_at: processedData?.meta_info?.created_at,
              updated_at: processedData?.meta_info?.updated_at,
              knowledge_base: processedData?.knowledge_base || []
            }
          };
          result = await exportManager.exportProject(projectData);
          break;

        case 'exportConversation':
          result = await exportManager.exportConversation(processedData, {
            branch: selectedBranch
          });
          break;

        case 'exportMessage':
          result = await exportManager.exportMessage(
            selectedMessage,
            selectedMessageIndex + 1
          );
          break;

        case 'exportThinking':
          result = await exportManager.exportThinking(
            selectedMessage,
            selectedMessageIndex + 1
          );
          break;

        case 'exportOutput':
          result = await exportManager.exportOutput(
            selectedMessage,
            selectedMessageIndex + 1
          );
          break;

        case 'exportArtifact':
          result = await exportManager.exportArtifact(
            selectedMessage,
            selectedMessageIndex + 1,
            0 // Primeiro artefato por padrão
          );
          break;

        case 'addToKnowledge':
          // TODO: Implementar adição ao banco de conhecimento
          result = 'Feature em desenvolvimento';
          break;

        default:
          throw new Error('Ação não reconhecida');
      }

      setExportResult({
        success: true,
        message: `Exportado: ${result}`
      });
    } catch (error) {
      console.error('Erro ao exportar:', error);
      setExportResult({
        success: false,
        message: error.message || 'Erro ao exportar'
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Toggle do modo de visualização
  const toggleDisplayMode = () => {
    setDisplayMode(prev => prev === 'icons' ? 'full' : 'icons');
  };

  if (!isOpen) return null;

  return (
    <div className="granular-export-overlay" onClick={onClose}>
      <div
        className="granular-export-panel"
        ref={panelRef}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="granular-export-header">
          <h3>{t?.('granularExport.title') || 'Exportação Granular'}</h3>
          <div className="header-actions">
            <button
              className="display-mode-toggle"
              onClick={toggleDisplayMode}
              title={displayMode === 'icons' ? 'Mostrar descrições' : 'Modo compacto'}
            >
              <Settings size={18} />
            </button>
            <button className="close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Seletor de Branch (se necessário) */}
        {branches.length > 1 && (
          <div className="branch-selector">
            <label>{t?.('granularExport.selectBranch') || 'Selecionar Branch'}:</label>
            <select
              value={selectedBranch || ''}
              onChange={(e) => setSelectedBranch(e.target.value || null)}
            >
              <option value="">
                {t?.('granularExport.allBranches') || 'Todas as branches'}
              </option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>
                  {branch.marker} - {branch.id} ({branch.messageCount} msgs)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Opções de exportação */}
        <div className={`export-options-grid ${displayMode}`}>
          {exportOptions.map(option => {
            const IconComponent = option.icon;
            const isDisabled = !option.available;

            return (
              <button
                key={option.id}
                className={`export-option ${isDisabled ? 'disabled' : ''} ${displayMode}`}
                onClick={() => handleExport(option)}
                disabled={isDisabled || isExporting}
                title={isDisabled ? (t?.('granularExport.notAvailable') || 'Não disponível') : option.description}
              >
                <div className="option-icon">
                  <IconComponent size={displayMode === 'icons' ? 24 : 20} />
                </div>
                {displayMode === 'full' && (
                  <div className="option-content">
                    <span className="option-label">{option.label}</span>
                    <span className="option-description">{option.description}</span>
                    <span className="option-output">
                      <Download size={12} />
                      {option.output}
                    </span>
                  </div>
                )}
                {displayMode === 'icons' && (
                  <span className="option-label-compact">{option.label}</span>
                )}
                {!isDisabled && <ChevronRight className="option-arrow" size={16} />}
              </button>
            );
          })}
        </div>

        {/* Resultado da exportação */}
        {exportResult && (
          <div className={`export-result ${exportResult.success ? 'success' : 'error'}`}>
            {exportResult.success ? <Check size={16} /> : <X size={16} />}
            <span>{exportResult.message}</span>
          </div>
        )}

        {/* Estado de carregamento */}
        {isExporting && (
          <div className="export-loading">
            <div className="spinner" />
            <span>{t?.('granularExport.exporting') || 'Exportando...'}</span>
          </div>
        )}

        {/* Informação de nomenclatura */}
        <div className="nomenclature-info">
          <h4>{t?.('granularExport.nomenclature.title') || 'Padrão de Nomenclatura'}</h4>
          <code>DDD-AUTOR-BRANCH-SSS-TIPO.ext</code>
          <p>
            <small>
              {t?.('granularExport.nomenclature.example') ||
                'Ex: 001-USER-M-001-message.md'}
            </small>
          </p>
        </div>
      </div>
    </div>
  );
};

export default GranularExportMenu;
