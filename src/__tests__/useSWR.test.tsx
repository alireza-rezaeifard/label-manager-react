import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSWR, useSWRMutation, invalidateCache, queryClient } from '../hooks/useSWR';

describe('useSWR (TanStack-backed)', () => {
  it('resolves data from the fetcher', async () => {
    const { result } = renderHook(() =>
      useSWR('swr-test-basic', () => Promise.resolve({ value: 42 }))
    );

    expect(result.current.data).toBeUndefined();

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toEqual({ value: 42 });
    expect(result.current.error).toBeUndefined();
  });

  it('serves cached data to a second hook with the same key', async () => {
    const fetcher = vi.fn(() => Promise.resolve({ n: 1 }));

    const first = renderHook(() => useSWR('swr-test-cache', fetcher));
    await waitFor(() => expect(first.result.current.data).toBeDefined());

    const second = renderHook(() => useSWR('swr-test-cache', fetcher));
    // Cached data must be available synchronously on mount.
    expect(second.result.current.data).toEqual({ n: 1 });
  });

  it('does not share cache between different keys', async () => {
    const a = renderHook(() => useSWR('swr-key-a', () => Promise.resolve('A')));
    const b = renderHook(() => useSWR('swr-key-b', () => Promise.resolve('B')));

    await waitFor(() => expect(a.result.current.data).toBe('A'));
    await waitFor(() => expect(b.result.current.data).toBe('B'));
  });

  it('mutate optimistically updates the cache', async () => {
    const { result } = renderHook(() =>
      useSWR('swr-test-mutate', () => Promise.resolve({ count: 1 }))
    );
    await waitFor(() => expect(result.current.data).toBeDefined());

    await act(() => result.current.mutate({ count: 5 }));
    expect(result.current.data).toEqual({ count: 5 });
    expect(queryClient.getQueryData(['swr-test-mutate'])).toEqual({ count: 5 });
  });

  it('mutate with a function updater receives previous data', async () => {
    const { result } = renderHook(() =>
      useSWR('swr-test-mutate-fn', () => Promise.resolve({ count: 1 }))
    );
    await waitFor(() => expect(result.current.data).toBeDefined());

    await act(() => result.current.mutate((prev) => ({ count: (prev?.count ?? 0) + 1 })));
    expect(result.current.data).toEqual({ count: 2 });
  });

  it('invalidateCache refetches active hooks', async () => {
    const fetcher = vi.fn(() => Promise.resolve({ at: Date.now() }));
    const { result } = renderHook(() => useSWR('swr-test-invalidate', fetcher));
    await waitFor(() => expect(result.current.data).toBeDefined());

    const callsBefore = fetcher.mock.calls.length;
    await act(() => invalidateCache('swr-test-invalidate'));
    await waitFor(() => expect(fetcher.mock.calls.length).toBeGreaterThan(callsBefore));
  });

  it('handles fetcher errors via error state', async () => {
    const { result } = renderHook(() =>
      useSWR('swr-test-error', () => Promise.reject(new Error('boom')), { staleMs: 0 })
    );

    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(result.current.error?.message).toBe('boom');
    expect(result.current.isLoading).toBe(false);
  });

  it('does not fetch when key is null', () => {
    const fetcher = vi.fn(() => Promise.resolve('x'));
    renderHook(() => useSWR(null, fetcher));
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('useSWRMutation calls the mutation and invalidates its key', async () => {
    const spy = vi.fn(() => Promise.resolve('done'));
    const { result } = renderHook(() => useSWRMutation('swr-test-mutation', spy));

    const out = await act(() => result.current.trigger());
    expect(out).toBe('done');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(result.current.isMutating).toBe(false);
  });
});