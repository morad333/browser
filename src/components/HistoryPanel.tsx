import { useMemo, useState } from 'react';
import { ExternalLink, Search, Shield, Trash2, X } from 'lucide-react';
import type { HistoryEntry } from '../browser/types';
import { formatRelativeTime, getDisplayHost } from '../browser/url';
import { Favicon } from './Favicon';

interface HistoryPanelProps {
  history: HistoryEntry[];
  isPrivate: boolean;
  onOpenUrl: (url: string) => void;
  onOpenInNewTab: (url: string) => void;
  onRemoveEntry: (id: string) => void;
  onClearHistory: () => void;
}

export function HistoryPanel({
  history,
  isPrivate,
  onOpenUrl,
  onOpenInNewTab,
  onRemoveEntry,
  onClearHistory,
}: HistoryPanelProps) {
  const [search, setSearch] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return history;
    return history.filter(
      (h) =>
        h.title.toLowerCase().includes(q) || h.url.toLowerCase().includes(q)
    );
  }, [history, search]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-2.5 space-y-2 border-b border-zinc-200/80 dark:border-[#23262C]">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-zinc-900 dark:text-[#ECEEF2]">History</h2>
          {history.length > 0 && !confirmClear && (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="h-7 px-2 rounded-md text-xs text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-zinc-200/60 dark:hover:bg-[#22252C] transition-colors cursor-pointer"
            >
              Clear all
            </button>
          )}
          {confirmClear && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  onClearHistory();
                  setConfirmClear(false);
                }}
                className="h-6 px-2 rounded bg-red-600 text-white text-[11px] font-medium cursor-pointer"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="h-6 px-2 rounded text-[11px] text-zinc-500 hover:bg-zinc-200/60 dark:hover:bg-[#22252C] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
            aria-hidden="true"
          />
          <label htmlFor="history-search" className="sr-only">
            Search browsing history
          </label>
          <input
            id="history-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search history"
            className="w-full h-8 pl-8 pr-2.5 rounded-md bg-white dark:bg-[#191B1F] border border-zinc-200 dark:border-[#272A30] text-xs text-zinc-900 dark:text-[#ECEEF2] placeholder:text-zinc-400 focus:outline-none focus:border-[#2563EB] dark:focus:border-[#4C8BF5]"
          />
        </div>

        {isPrivate && (
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-md bg-[#221E36] text-[#D2CCFF] text-[11px]">
            <Shield size={13} className="shrink-0" aria-hidden="true" />
            <span>Private mode is active. Visits are not being recorded.</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {filtered.length === 0 ? (
          <div className="py-10 px-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
            {search ? 'No history items match your search.' : 'Pages you visit will appear here.'}
          </div>
        ) : (
          filtered.map((entry) => (
            <div
              key={entry.id}
              className="group flex items-center gap-1 rounded-md px-1.5 py-1.5 hover:bg-zinc-200/60 dark:hover:bg-[#1B1D22] transition-colors"
            >
              <button
                type="button"
                onClick={() => onOpenUrl(entry.url)}
                className="flex-1 min-w-0 flex items-center gap-2 px-1 text-left cursor-pointer"
              >
                <Favicon url={entry.url} size={14} variant="tile" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-zinc-900 dark:text-[#ECEEF2] truncate">
                    {entry.title}
                  </div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 truncate flex items-center gap-1.5">
                    <span className="truncate font-mono">{getDisplayHost(entry.url)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="shrink-0 tabular-nums">
                      {formatRelativeTime(entry.visitedAt)}
                    </span>
                  </div>
                </div>
              </button>

              <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => onOpenInNewTab(entry.url)}
                  aria-label={`Open ${entry.title} in new tab`}
                  title="Open in new tab"
                  className="h-6 w-6 rounded inline-flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                >
                  <ExternalLink size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveEntry(entry.id)}
                  aria-label={`Remove ${entry.title} from history`}
                  title="Remove"
                  className="h-6 w-6 rounded inline-flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {history.length > 0 && (
        <div className="px-3 py-2 border-t border-zinc-200/80 dark:border-[#23262C] text-xs text-zinc-600 dark:text-zinc-300 flex items-center justify-between tabular-nums">
          <span>{history.length} recorded</span>
          <Trash2 size={12} className="opacity-0" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
