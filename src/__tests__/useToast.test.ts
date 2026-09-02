import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { toast as sonner } from 'sonner';
import { useToast } from '../hooks/useToast';

// The hook delegates to Sonner: `toasts` stays empty and `removeToast` is a
// compatibility no-op (Sonner manages its own dismissal state).
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
}));

describe('useToast (Sonner-backed)', () => {
  it('initializes with empty toasts', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toEqual([]);
  });

  it('addToast routes default type to sonner.success', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast('Test message');
    });

    expect(sonner.success).toHaveBeenCalledWith('Test message');
  });

  it('addToast routes specified type to the matching sonner method', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast('Error message', 'error');
    });

    expect(sonner.error).toHaveBeenCalledWith('Error message');
  });

  it('addToast falls back to plain toast for unknown types', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      // @ts-expect-error unknown type on purpose
      result.current.addToast('Other message', 'weird');
    });

    expect(sonner).toHaveBeenCalledWith('Other message');
  });

  it('removeToast is a safe no-op', () => {
    const { result } = renderHook(() => useToast());

    expect(() => {
      act(() => {
        result.current.removeToast(1);
      });
    }).not.toThrow();
  });
});
