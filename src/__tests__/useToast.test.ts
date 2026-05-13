import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast } from '../hooks/useToast';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useToast', () => {
  it('initializes with empty toasts', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toEqual([]);
  });

  it('addToast adds a toast with default type', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast('Test message');
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe('Test message');
    expect(result.current.toasts[0].type).toBe('success');
  });

  it('addToast adds a toast with specified type', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast('Error message', 'error');
    });

    expect(result.current.toasts[0].type).toBe('error');
  });

  it('addToast auto-removes toast after duration', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast('Auto remove', 'success', 3000);
    });
    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('removeToast removes a toast by id', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast('Message 1');
      result.current.addToast('Message 2');
    });

    const id = result.current.toasts[0].id;

    act(() => {
      result.current.removeToast(id);
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].id).not.toBe(id);
  });

  it('addToast generates unique ids', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast('Message 1');
      result.current.addToast('Message 2');
    });

    expect(result.current.toasts[0].id).not.toBe(result.current.toasts[1].id);
  });
});
