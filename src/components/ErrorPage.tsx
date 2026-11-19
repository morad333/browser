import { AlertTriangle, ArrowLeft, RotateCw, Search } from 'lucide-react';
import type { SearchEngineId, TabError } from '../browser/types';
import { SEARCH_ENGINES, buildSearchUrl, getDisplayHost } from '../browser/url';

interface ErrorPageProps {
  error: TabError;
  canGoBack: boolean;
  searchEngine: SearchEngineId;
  onRetry: () => void;
  onBack: () => void;
  onNavigate: (url: string) => void;
}

export function ErrorPage({
  error,
  canGoBack,
  searchEngine,
  onRetry,
  onBack,
  onNavigate,
}: ErrorPageProps) {
  const engine = SEARCH_ENGINES[searchEngine] ?? SEARCH_ENGINES.duckduckgo;
  const host = getDisplayHost(error.url);

  return (
    <div
      data-testid="navigation-error-page"
      className="h-full w-full bg-[#F7F8FA] dark:bg-[#141518] text-zinc-900 dark:text-[#ECEEF2] flex items-center justify-center px-6 py-12"
    >
      <div className="w-full max-w-md border border-zinc-200 dark:border-[#272A30] bg-white dark:bg-[#191B1F] rounded-lg p-6">
        <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400 mb-3">
          <AlertTriangle size={18} aria-hidden="true" />
          <span className="text-xs font-mono">{error.code}</span>
        </div>

        <h1 className="text-lg font-semibold text-zinc-900 dark:text-[#ECEEF2] mb-2">
          This site can’t be reached
        </h1>

        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
          {error.message}
        </p>

        <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-[#131518] border border-zinc-200 dark:border-[#24272D] rounded px-3 py-2 mb-6 break-all">
          {error.url}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onRetry}
            className="h-9 px-3.5 rounded-md bg-[#2563EB] dark:bg-[#4C8BF5] hover:bg-[#1D4ED8] dark:hover:bg-[#3B7BE3] text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCw size={13} aria-hidden="true" />
            <span>Try again</span>
          </button>

          {canGoBack && (
            <button
              type="button"
              onClick={onBack}
              className="h-9 px-3.5 rounded-md bg-zinc-100 dark:bg-[#23262D] hover:bg-zinc-200 dark:hover:bg-[#2D313A] text-zinc-800 dark:text-zinc-200 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft size={13} aria-hidden="true" />
              <span>Go back</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onNavigate(buildSearchUrl(host, searchEngine))}
            className="h-9 px-3.5 rounded-md border border-zinc-200 dark:border-[#2D313A] hover:bg-zinc-100 dark:hover:bg-[#23262D] text-zinc-700 dark:text-zinc-300 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Search size={13} aria-hidden="true" />
            <span>Search {engine.name}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
