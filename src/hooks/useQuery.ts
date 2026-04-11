import { useState, useEffect, useRef, useCallback } from 'react';

interface UseQueryOptions {
  enabled?: boolean;
  timeout?: number; // ms, default 8000
}

/**
 * A lightweight data fetching hook with:
 * - 8-second timeout safety (never stuck loading forever)
 * - Cancellation on unmount
 * - Optimistic refetch support
 */
export function useLocalQuery<T>(
  queryFn: () => Promise<T>,
  deps: any[] = [],
  options: UseQueryOptions = {}
) {
  const { enabled = true, timeout = 8000 } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const runCount = useRef(0);

  const run = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const thisRun = ++runCount.current;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    setLoading(true);
    setError(null);

    // Timeout safety — never stuck loading forever
    timeoutId = setTimeout(() => {
      if (!cancelled && mounted.current && runCount.current === thisRun) {
        cancelled = true;
        setLoading(false);
        setError('Request timed out. Please refresh the page.');
      }
    }, timeout);

    try {
      const result = await queryFn();

      if (!cancelled && mounted.current && runCount.current === thisRun) {
        setData(result);
        setError(null);
      }
    } catch (err: any) {
      if (!cancelled && mounted.current && runCount.current === thisRun) {
        setError(err.message || 'Failed to load data');
        setData(null);
      }
    } finally {
      clearTimeout(timeoutId);
      if (!cancelled && mounted.current && runCount.current === thisRun) {
        setLoading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled]);

  useEffect(() => {
    mounted.current = true;
    run();
    return () => {
      mounted.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  const refetch = useCallback(() => {
    run();
  }, [run]);

  return { data, loading, error, refetch };
}
