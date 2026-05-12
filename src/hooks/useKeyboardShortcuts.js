import { useEffect, useCallback, useState } from 'react';

const SHORTCUTS = [
  { key: 'n', ctrl: true, action: 'add', label: 'New record', tab: 'add' },
  { key: 'e', ctrl: true, action: 'edit', label: 'Edit selected', tab: null },
  { key: 'd', ctrl: true, action: 'duplicate', label: 'Duplicate selected', tab: null },
  { key: 's', ctrl: true, action: 'save', label: 'Save form', tab: null },
  { key: 'Delete', ctrl: false, action: 'delete', label: 'Delete selected', tab: null },
  { key: 'f', ctrl: true, action: 'search', label: 'Focus search', tab: null },
  { key: 'a', ctrl: true, action: 'selectAll', label: 'Select all records', tab: null },
  { key: 'Escape', ctrl: false, action: 'escape', label: 'Close/Cancel', tab: null },
  { key: 'z', ctrl: true, action: 'undo', label: 'Undo', tab: null },
  { key: '/', ctrl: true, action: 'shortcuts', label: 'Show shortcuts', tab: null },
  { key: '1', ctrl: true, action: 'tabRecords', label: 'Go to Records', tab: 'records' },
  { key: '2', ctrl: true, action: 'tabAdd', label: 'Go to Add', tab: 'add' },
  { key: '3', ctrl: true, action: 'tabImport', label: 'Go to Import', tab: 'import' },
  { key: '4', ctrl: true, action: 'tabPreview', label: 'Go to Preview', tab: 'preview' },
  { key: '5', ctrl: true, action: 'tabReports', label: 'Go to Reports', tab: 'reports' },
];

export { SHORTCUTS };

export function useKeyboardShortcuts(handlers) {
  const [showHelp, setShowHelp] = useState(false);

  const handleKeyDown = useCallback((e) => {
    const ctrl = e.ctrlKey || e.metaKey;
    const key = e.key;

    if (ctrl && key === '/') {
      e.preventDefault();
      setShowHelp(p => !p);
      return;
    }

    if (key === 'Escape') {
      if (showHelp) { setShowHelp(false); return; }
      if (handlers.onEscape) { handlers.onEscape(); }
      return;
    }

    if (ctrl && key === 'n') {
      e.preventDefault();
      if (handlers.onNewRecord) handlers.onNewRecord();
      return;
    }

    if (ctrl && key === 'e') {
      e.preventDefault();
      if (handlers.onEdit) handlers.onEdit();
      return;
    }

    if (ctrl && key === 'd') {
      e.preventDefault();
      if (handlers.onDuplicate) handlers.onDuplicate();
      return;
    }

    if (key === 'Delete' && !ctrl) {
      if (handlers.onDelete) handlers.onDelete();
      return;
    }

    if (ctrl && key === 'f') {
      e.preventDefault();
      if (handlers.onSearch) handlers.onSearch();
      return;
    }

    if (ctrl && key === 's') {
      e.preventDefault();
      if (handlers.onSave) handlers.onSave();
      return;
    }

    if (ctrl && key === 'a') {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'SELECT') return;
      e.preventDefault();
      if (handlers.onSelectAll) handlers.onSelectAll();
      return;
    }

    if (ctrl && key === 'z') {
      if (handlers.onUndo) { handlers.onUndo(); }
      return;
    }

    if (ctrl && !isNaN(Number(key)) && Number(key) >= 1 && Number(key) <= 5) {
      e.preventDefault();
      const tabMap = { 1: 'records', 2: 'add', 3: 'import', 4: 'preview', 5: 'reports' };
      if (handlers.onTabChange) handlers.onTabChange(tabMap[key]);
      return;
    }
  }, [handlers, showHelp]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { showHelp, setShowHelp };
}
