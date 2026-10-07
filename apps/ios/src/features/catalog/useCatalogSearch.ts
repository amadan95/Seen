import { useEffect, useRef, useState } from 'react';
import type { CatalogPage, CatalogQuery } from '@seen/contracts/catalog';
import { searchCatalog } from './client';
import { useLibrary } from '../../local/LibraryProvider';

export function useCatalogSearch(options: CatalogQuery, enabled: boolean) {
  const { cacheMedia } = useLibrary();
  const [page, setPage] = useState<CatalogPage | null>(null),
    [error, setError] = useState<string | null>(null),
    [loading, setLoading] = useState(false),
    [retry, setRetry] = useState(0);
  const generation = useRef(0),
    controller = useRef<AbortController | null>(null),
    previous = useRef(''),
    failedNextPage = useRef<number | null>(null),
    pageRequestInFlight = useRef(false);
  useEffect(() => {
    const current = ++generation.current;
    failedNextPage.current = null;
    pageRequestInFlight.current = false;
    controller.current?.abort();
    if (!enabled) {
      setPage(null);
      setLoading(false);
      setError(null);
      return;
    }
    const key = JSON.stringify(options);
    if (previous.current !== key) setPage(null);
    previous.current = key;
    setError(null);
    setLoading(true);
    const abort = new AbortController();
    controller.current = abort;
    const timer = setTimeout(() => {
      void searchCatalog(options, abort.signal)
        .then((result) => {
          if (generation.current !== current || abort.signal.aborted) return;
          cacheMedia(result.items);
          setPage(result);
        })
        .catch(() => {
          if (generation.current === current && !abort.signal.aborted)
            setError('Could not load titles. Check the local catalog server and try again.');
        })
        .finally(() => {
          if (generation.current === current && !abort.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [options, enabled, retry, cacheMedia]);
  function loadMore() {
    const nextPage = failedNextPage.current ?? page?.nextPage;
    if (!nextPage || loading || pageRequestInFlight.current) return;
    pageRequestInFlight.current = true;
    const current = generation.current;
    const abort = new AbortController();
    controller.current = abort;
    setError(null);
    setLoading(true);
    void searchCatalog({ ...options, page: nextPage }, abort.signal)
      .then((result) => {
        if (current !== generation.current || abort.signal.aborted) return;
        failedNextPage.current = null;
        cacheMedia(result.items);
        setPage((previousPage) => ({
          ...result,
          stale: result.stale || Boolean(previousPage?.stale),
          items: [
            ...new Map(
              [...(previousPage?.items ?? []), ...result.items].map((media) => [media.id, media]),
            ).values(),
          ],
        }));
      })
      .catch(() => {
        if (current === generation.current && !abort.signal.aborted) {
          failedNextPage.current = nextPage;
          setError('Could not load the next titles. Try again.');
        }
      })
      .finally(() => {
        if (current === generation.current && !abort.signal.aborted) {
          setLoading(false);
          pageRequestInFlight.current = false;
        }
      });
  }
  return {
    page,
    error,
    loading,
    loadMore,
    retry: () => (failedNextPage.current !== null ? loadMore() : setRetry((value) => value + 1)),
  };
}
