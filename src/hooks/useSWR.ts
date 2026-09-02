import { useState, useCallback, useSyncExternalStore } from 'react';
import { QueryClient, QueryObserver } from '@tanstack/react-query';

/**
 * Server-state layer backed by TanStack Query.
 *
 * This module keeps the original useSWR-compatible API so existing callers
 * migrate transparently. Under the hood all caching, deduplication,
 * invalidation and background refetching is handled by TanStack Query.
 *
 * A module-level QueryClient singleton is used so the hooks work without a
 * provider (tests, isolated trees). Wrap the app in <QueryClientProvider
 * client={queryClient}> if you need a scoped client.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Preserve the original useSWR semantics: no silent retries.
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

const IDLE_KEY = '__swr_idle__';

export function invalidateCache(keyPattern?: string) {
  return queryClient.invalidateQueries({
    predicate: (query) => !keyPattern || query.queryKey[0] === keyPattern,
  });
}

export interface UseSWROptions {
  staleMs?: number;
  revalidateOnMount?: boolean;
  refreshInterval?: number;
}

export function useSWR<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  options?: UseSWROptions
) {
  const staleMs = options?.staleMs ?? 30_000;
  const refreshInterval = options?.refreshInterval;

  const [observer] = useState(
    () =>
      new QueryObserver<T>(queryClient, {
        queryKey: [IDLE_KEY],
        queryFn: () => Promise.resolve(undefined as unknown as T),
        enabled: false,
      })
  );

  // setOptions on every render is the official pattern used by useBaseQuery.
  observer.setOptions({
    queryKey: [key ?? IDLE_KEY],
    queryFn: fetcher,
    enabled: !!key,
    staleTime: staleMs,
    refetchInterval: refreshInterval,
    refetchOnMount: options?.revalidateOnMount === false ? false : true,
  });

  const subscribe = useCallback(
    (onStoreChange: () => void) => observer.subscribe(onStoreChange),
    [observer]
  );
  const getSnapshot = useCallback(() => observer.getCurrentResult(), [observer]);
  const result = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const revalidate = useCallback(async () => {
    const res = await observer.refetch({ throwOnError: false });
    return res.data as T | undefined;
  }, [observer]);

  const mutate = useCallback(
    async (
      newData?: T | ((prev: T | undefined) => T),
      shouldRevalidate = false
    ) => {
      if (!key) return;
      if (newData !== undefined) {
        const resolved =
          typeof newData === 'function'
            ? (newData as (prev: T | undefined) => T)(observer.getCurrentResult().data)
            : newData;
        queryClient.setQueryData([key], resolved);
      }
      if (shouldRevalidate) {
        await observer.refetch({ throwOnError: false });
      }
    },
    [key, observer]
  );

  return {
    // Normalize TanStack's null to undefined (original hook never returned null).
    data: (result.data ?? undefined) as T | undefined,
    error: (result.error ?? undefined) as Error | undefined,
    isLoading: !!key && result.data === undefined && result.status === 'pending',
    isValidating: result.isFetching,
    revalidate,
    mutate,
  };
}

export function useSWRMutation<T, A extends any[]>(
  key: string | null,
  mutationFn: (...args: A) => Promise<T>
) {
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<Error | undefined>();

  const trigger = useCallback(
    async (...args: A): Promise<T> => {
      setIsMutating(true);
      setError(undefined);
      try {
        const result = await mutationFn(...args);
        if (key) void invalidateCache(key);
        return result;
      } catch (err: any) {
        setError(err);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [key, mutationFn]
  );
  return { trigger, isMutating, error };
}
