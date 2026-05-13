import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  let handlers;

  beforeEach(() => {
    handlers = {
      onNewRecord: vi.fn(),
      onEdit: vi.fn(),
      onDuplicate: vi.fn(),
      onDelete: vi.fn(),
      onSearch: vi.fn(),
      onSave: vi.fn(),
      onSelectAll: vi.fn(),
      onEscape: vi.fn(),
      onUndo: vi.fn(),
      onTabChange: vi.fn(),
    };
  });

  it('calls onNewRecord on Ctrl+N', () => {
    renderHook(() => useKeyboardShortcuts(handlers));
    const event = new KeyboardEvent('keydown', { key: 'n', ctrlKey: true });
    window.dispatchEvent(event);
    expect(handlers.onNewRecord).toHaveBeenCalled();
  });

  it('calls onEdit on Ctrl+E', () => {
    renderHook(() => useKeyboardShortcuts(handlers));
    const event = new KeyboardEvent('keydown', { key: 'e', ctrlKey: true });
    window.dispatchEvent(event);
    expect(handlers.onEdit).toHaveBeenCalled();
  });

  it('calls onDelete on Delete key', () => {
    renderHook(() => useKeyboardShortcuts(handlers));
    const event = new KeyboardEvent('keydown', { key: 'Delete', ctrlKey: false });
    window.dispatchEvent(event);
    expect(handlers.onDelete).toHaveBeenCalled();
  });

  it('calls onSearch on Ctrl+F', () => {
    renderHook(() => useKeyboardShortcuts(handlers));
    const event = new KeyboardEvent('keydown', { key: 'f', ctrlKey: true });
    window.dispatchEvent(event);
    expect(handlers.onSearch).toHaveBeenCalled();
  });

  it('calls onEscape on Escape key', () => {
    renderHook(() => useKeyboardShortcuts(handlers));
    const event = new KeyboardEvent('keydown', { key: 'Escape', ctrlKey: false });
    window.dispatchEvent(event);
    expect(handlers.onEscape).toHaveBeenCalled();
  });

  it('calls onTabChange on Ctrl+1', () => {
    renderHook(() => useKeyboardShortcuts(handlers));
    const event = new KeyboardEvent('keydown', { key: '1', ctrlKey: true });
    window.dispatchEvent(event);
    expect(handlers.onTabChange).toHaveBeenCalledWith('records');
  });

  it('toggles showHelp on Ctrl+/', () => {
    const { result } = renderHook(() => useKeyboardShortcuts(handlers));
    expect(result.current.showHelp).toBe(false);
    act(() => {
      const event = new KeyboardEvent('keydown', { key: '/', ctrlKey: true });
      window.dispatchEvent(event);
    });
    expect(result.current.showHelp).toBe(true);
  });

  it('calls onSelectAll on Ctrl+A (when not in input)', () => {
    renderHook(() => useKeyboardShortcuts(handlers));
    const event = new KeyboardEvent('keydown', { key: 'a', ctrlKey: true });
    window.dispatchEvent(event);
    expect(handlers.onSelectAll).toHaveBeenCalled();
  });

  it('does not call handlers when handler is not defined', () => {
    const emptyHandlers = {};
    renderHook(() => useKeyboardShortcuts(emptyHandlers));
    const event = new KeyboardEvent('keydown', { key: 'n', ctrlKey: true });
    expect(() => window.dispatchEvent(event)).not.toThrow();
  });
});
