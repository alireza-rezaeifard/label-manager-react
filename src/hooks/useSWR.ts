import { useState, useEffect, useRef, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();
const pending = new Map<string, Promise<any>>();
const subscribers = new Map<string, Set<() => void>>();

const DEFAULT_STALE_MS = 30_000;

function notify(key: string) {
  const subs = subscribers.get(key);
  if (subs) subs.forEach(fn => fn());
}

export function invalidateCache(keyPattern?: string) {
  if (!keyPattern) {
    cache.clear();
    subscribers.forEach(subs => subs.forEach(fn => fn()));
    return;
  }
  for (const key of cache.keys()) {
    if (key.includes(keyPattern)) {
      cache.delete(key);
      notify(key);
    }
  }
}

export function useSWR<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  options?: { staleMs?: number; revalidateOnMount?: boolean }
) {
  const staleMs = options?.staleMs ?? DEFAULT_STALE_MS;
  const revalidateOnMount = options?.revalidateOnMount ?? true;

  const [data, setData] = useState<T | undefined>(() => {
    if (!key) return undefined;
    const entry = cache.get(key);
    if (entry && (Date.now() - entry.timestamp < staleMs)) {
      return entry.data;
    }
    return undefined;
  });

  const [error, setError] = useState<Error | undefined>();
  const [isLoading, setIsLoading] = useState(!data && !!key);
  const [isValidating, setIsValidating] = useState(false);
  const mountedRef = useRef(true);
  const keyRef = useRef(key);
  keyRef.current = key;

  const revalidate = useCallback(async () => {
    if (!key) return;
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < staleMs) {
      setData(cached.data);
      setError(undefined);
      setIsLoading(false);
      setIsValidating(false);
      return cached.data;
    }

    if (pending.has(key)) {
      try {
        const result = await pending.get(key);
        if (mountedRef.current && keyRef.current === key) {
          setData(result);
          setError(undefined);
        }
        return result;
      } catch {
        return;
      }
    }

    setIsValidating(true);
    const promise = fetcher();
    pending.set(key, promise);

    try {
      const result = await promise;
      cache.set(key, { data: result, timestamp: Date.now() });
      if (mountedRef.current && keyRef.current === key) {
        setData(result);
        setError(undefined);
        setIsLoading(false);
        setIsValidating(false);
      }
      notify(key);
      return result;
    } catch (err: any) {
      if (mountedRef.current && keyRef.current === key) {
        setError(err);
        setIsLoading(false);
        setIsValidating(false);
      }
      throw err;
    } finally {
      pending.delete(key);
    }
  }, [key, fetcher, staleMs]);

  useEffect(() => {
    mountedRef.current = true;
    if (key && revalidateOnMount) {
      revalidate();
    }
    return () => { mountedRef.current = false; };
  }, [key, revalidate, revalidateOnMount]);

  useEffect(() => {
    if (!key) return;
    const handler = () => {
      if (mountedRef.current && keyRef.current === key) {
        const entry = cache.get(key);
        if (entry) setData(entry.data);
      }
    };
    const subs = subscribers.get(key) || new Set();
    subs.add(handler);
    subscribers.set(key, subs);
    return () => {
      subs.delete(handler);
      if (subs.size === 0) subscribers.delete(key);
    };
  }, [key]);

  const mutate = useCallback(async (newData?: T | ((prev: T | undefined) => T), shouldRevalidate = false) => {
    if (!key) return;
    if (newData !== undefined) {
      const resolved = typeof newData === 'function'
        ? (newData as (prev: T | undefined) => T)(data)
        : newData;
      cache.set(key, { data: resolved, timestamp: Date.now() });
      setData(resolved);
      notify(key);
    }
    if (shouldRevalidate) {
      await revalidate();
    }
  }, [key, revalidate, data]);

  return {
    data,
    error,
    isLoading: isLoading && !data,
    isValidating,
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

  const trigger = useCallback(async (...args: A): Promise<T> => {
    setIsMutating(true);
    setError(undefined);
    try {
      const result = await mutationFn(...args);
      if (key) invalidateCache(key);
      return result;
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setIsMutating(false);
    }
  }, [key, mutationFn]);

  return { trigger, isMutating, error };
}
