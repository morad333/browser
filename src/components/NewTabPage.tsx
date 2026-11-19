import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import {
  ArrowRight,
  Bookmark,
  Clock,
  Columns2,
  Download,
  Globe,
  History,
  RotateCcw,
  Search,
  Shield,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type {
  BookmarkItem,
  BrowserTab,
  ClosedTabRecord,
  HistoryEntry,
  OmniboxSuggestion,
  SearchEngineId,
} from '../browser/types';
import { buildOmniboxSuggestions } from '../browser/state';
import { SEARCH_ENGINES, formatRelativeTime, getDisplayHost } from '../browser/url';
import { Favicon } from './Favicon';

interface NewTabPageProps {
  tabs: BrowserTab[];
  bookmarks: BookmarkItem[];
  history: HistoryEntry[];
  closedTabs: ClosedTabRecord[];
  searchEngine: SearchEngineId;
  isPrivate: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onNavigate: (input: string) => void;
  onSelectTab: (tabId: string) => void;
  onOpenBookmarkInNewTab: (url: string) => void;
  onReopenClosedTab: (index: number) => void;
}

export function NewTabPage({
  tabs,
  bookmarks,
  history,
  closedTabs,
  searchEngine,
  isPrivate,
  inputRef,
  onNavigate,
  onSelectTab,
  onOpenBookmarkInNewTab,
  onReopenClosedTab,
}: NewTabPageProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const blurTimerRef = useRef<number | null>(null);

  const engine = SEARCH_ENGINES[searchEngine] ?? SEARCH_ENGINES.duckduckgo;

  useEffect(() => {
    return () => {
      if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current);
    };
  }, []);

  const suggestions = useMemo<OmniboxSuggestion[]>(() => {
    if (!isFocused || !query.trim()) return [];
    return buildOmniboxSuggestions(query, tabs, bookmarks, history, searchEngine);
  }, [isFocused, query, tabs, bookmarks, history, searchEngine]);

  const recentHistory = useMemo(() => {
    if (isPrivate) return [];
    const seen = new Set<string>();
    const list: HistoryEntry[] = [];
    for (const entry of history) {
      if (seen.has(entry.url)) continue;
      seen.add(entry.url);
      list.push(entry);
      if (list.length >= 6) break;
    }
    return list;
  }, [history, isPrivate]);

  const commitSuggestion = (suggestion: OmniboxSuggestion) => {
    setIsFocused(false);
    setSelectedIndex(-1);
    if (suggestion.kind === 'tab' && suggestion.tabId) {
      onSelectTab(suggestion.tabId);
      return;
    }
    onNavigate(suggestion.kind === 'search' ? suggestion.title : suggestion.url);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (selectedIndex >= 0 && suggestions[selectedIndex]) {
      commitSuggestion(suggestions[selectedIndex]);
      return;
    }
    const trimmed = query.trim();
    if (!trimmed) return;
    setIsFocused(false);
    setSelectedIndex(-1);
    onNavigate(trimmed);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsFocused(false);
      setSelectedIndex(-1);
      inputRef.current?.blur();
      return;
    }
    if (e.key === 'ArrowDown' && suggestions.length > 0) {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp' && suggestions.length > 0) {
      e.preventDefault();
      setSelectedIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
    }
  };

  const hasClosed = !isPrivate && closedTabs.length > 0;
  const hasHistory = recentHistory.length > 0;

  return (
    <div
      data-testid="new-tab-page"
      className="h-full w-full overflow-y-auto bg-[#F7F8FA] dark:bg-[#141518] text-zinc-900 dark:text-[#ECEEF2] flex flex-col items-center px-6 pt-10 pb-8"
    >
      <div className="w-full max-w-[760px] flex flex-col gap-7">
        {/* Compact Header + Primary Omnibox */}
        <div className="space-y-4">
          <div className="flex items-baseline justify-between gap-4">
            {isPrivate ? (
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-[#8B7CF6] shrink-0" aria-hidden="true" />
                <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-[#ECEEF2]">
                  Private Session
                </h1>
                <span className="text-xs text-zinc-600 dark:text-zinc-300">
                  · History and closed tabs are not saved
                </span>
              </div>
            ) : (
              <div className="flex items-baseline gap-2.5">
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-[#ECEEF2]">
                  Velo
                </h1>
                <span className="text-xs text-zinc-600 dark:text-zinc-300">
                  Search with {engine.name} or enter a web address
                </span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="relative w-full" role="search">
            <div className="relative flex items-center bg-white dark:bg-[#1B1D22] border border-zinc-300 dark:border-[#2E323C] focus-within:border-[#2563EB] dark:focus-within:border-[#4C8BF5] rounded-lg transition-colors">
              <Search
                size={16}
                className="ml-3.5 shrink-0 text-zinc-500 dark:text-zinc-400"
                aria-hidden="true"
              />
              <label htmlFor="velo-newtab-search" className="sr-only">
                Search or enter website address
              </label>
              <input
                ref={inputRef}
                id="velo-newtab-search"
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(-1);
                }}
                onFocus={() => {
                  if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current);
                  setIsFocused(true);
                }}
                onBlur={() => {
                  blurTimerRef.current = window.setTimeout(() => {
                    setIsFocused(false);
                    setSelectedIndex(-1);
                  }, 140);
                }}
                onKeyDown={handleKeyDown}
                placeholder={`Search ${engine.name} or enter a URL...`}
                autoComplete="off"
                spellCheck={false}
                className="w-full h-11 px-3 bg-transparent text-sm text-zinc-900 dark:text-[#ECEEF2] placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Go to URL or search"
                className="mr-1.5 h-8 px-3 rounded-md bg-zinc-900 dark:bg-[#2A2E38] hover:bg-zinc-800 dark:hover:bg-[#353A47] text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Go</span>
                <ArrowRight size={13} aria-hidden="true" />
              </button>
            </div>

            {/* Live Omnibox Suggestions */}
            <AnimatePresence>
              {isFocused && suggestions.length > 0 && (
                <motion.ul
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.12 }}
                  role="listbox"
                  aria-label="Search and address suggestions"
                  className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 rounded-md border border-zinc-200 dark:border-[#2E323C] bg-white dark:bg-[#191B1F] py-1 shadow-lg overflow-hidden"
                >
                  {suggestions.map((item, idx) => {
                    const isSelected = idx === selectedIndex;
                    return (
                      <li key={item.id} role="option" aria-selected={isSelected}>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            commitSuggestion(item);
                          }}
                          className={`w-full px-3.5 py-2 flex items-center gap-2.5 text-left text-xs transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-zinc-100 dark:bg-[#252830] text-zinc-900 dark:text-white'
                              : 'text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100/80 dark:hover:bg-[#22252C]'
                          }`}
                        >
                          <span className="shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden="true">
                            {item.kind === 'search' ? (
                              <Search size={13} />
                            ) : item.kind === 'bookmark' ? (
                              <Bookmark size={13} />
                            ) : item.kind === 'history' ? (
                              <History size={13} />
                            ) : item.kind === 'tab' ? (
                              <Columns2 size={13} />
                            ) : (
                              <Globe size={13} />
                            )}
                          </span>
                          <span className="truncate font-medium">{item.title}</span>
                          {item.subtitle && (
                            <span className="ml-auto shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                              {item.subtitle}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </motion.ul>
              )}
            </AnimatePresence>
          </form>
        </div>

        {/* Compact Bookmarks Grid with Uniform Favicon Tiles */}
        {bookmarks.length > 0 && (
          <section aria-label="Pinned bookmarks" className="w-full">
            <div className="flex items-center justify-between mb-2.5 px-0.5">
              <h2 className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                Bookmarks
              </h2>
              <span className="text-xs text-zinc-600 dark:text-zinc-300 tabular-nums">
                {bookmarks.length} saved
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {bookmarks.slice(0, 9).map((bm) => (
                <button
                  key={bm.id}
                  type="button"
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey) {
                      onOpenBookmarkInNewTab(bm.url);
                    } else {
                      onNavigate(bm.url);
                    }
                  }}
                  className="group flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left bg-white dark:bg-[#191B1F] border border-zinc-200 dark:border-[#282C35] hover:border-zinc-300 dark:hover:border-[#3C414F] hover:bg-zinc-50 dark:hover:bg-[#1F222A] transition-colors cursor-pointer min-w-0"
                >
                  <Favicon url={bm.url} size={16} variant="tile" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-zinc-900 dark:text-[#ECEEF2] truncate leading-snug">
                      {bm.title}
                    </div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 truncate font-mono">
                      {getDisplayHost(bm.url)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Recent History & Recently Closed Tabs */}
        {!isPrivate && (
          <section
            aria-label="Recent activity"
            data-testid="newtab-recent-activity"
            className="w-full pt-1 border-t border-zinc-200/80 dark:border-[#23262E]"
          >
            {hasClosed || hasHistory ? (
              <div
                className={`grid gap-5 pt-4 ${
                  hasClosed && hasHistory ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
                }`}
              >
                {hasHistory && (
                  <div>
                    <div className="flex items-center justify-between mb-2 px-0.5">
                      <h2 className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-1.5">
                        <Clock size={13} aria-hidden="true" />
                        <span>Recent History</span>
                      </h2>
                      <span className="text-xs text-zinc-600 dark:text-zinc-300 tabular-nums">
                        {recentHistory.length} recent
                      </span>
                    </div>
                    <div className="divide-y divide-zinc-200/70 dark:divide-[#23262E] rounded-md border border-zinc-200 dark:border-[#282C35] bg-white dark:bg-[#191B1F] overflow-hidden">
                      {recentHistory.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={(e) => {
                            if (e.metaKey || e.ctrlKey) {
                              onOpenBookmarkInNewTab(entry.url);
                            } else {
                              onNavigate(entry.url);
                            }
                          }}
                          className="w-full px-3 py-2 flex items-center gap-2.5 text-left hover:bg-zinc-50 dark:hover:bg-[#1F222A] transition-colors cursor-pointer min-w-0"
                        >
                          <Favicon url={entry.url} size={14} variant="tile" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium text-zinc-900 dark:text-[#ECEEF2] truncate">
                              {entry.title}
                            </div>
                            <div className="text-xs text-zinc-600 dark:text-zinc-400 truncate font-mono">
                              {getDisplayHost(entry.url)}
                            </div>
                          </div>
                          <span className="text-xs text-zinc-600 dark:text-zinc-400 shrink-0 tabular-nums">
                            {formatRelativeTime(entry.visitedAt)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {hasClosed && (
                  <div>
                    <div className="flex items-center justify-between mb-2 px-0.5">
                      <h2 className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-1.5">
                        <RotateCcw size={13} aria-hidden="true" />
                        <span>Recently Closed Tabs</span>
                      </h2>
                      <span className="text-xs text-zinc-600 dark:text-zinc-300 tabular-nums">
                        {closedTabs.length} closed
                      </span>
                    </div>
                    <div className="divide-y divide-zinc-200/70 dark:divide-[#23262E] rounded-md border border-zinc-200 dark:border-[#282C35] bg-white dark:bg-[#191B1F] overflow-hidden">
                      {closedTabs.slice(0, 6).map((tab, idx) => (
                        <button
                          key={`${tab.url}-${idx}`}
                          type="button"
                          onClick={() => onReopenClosedTab(idx)}
                          className="w-full px-3 py-2 flex items-center gap-2.5 text-left hover:bg-zinc-50 dark:hover:bg-[#1F222A] transition-colors cursor-pointer min-w-0"
                        >
                          <Favicon url={tab.url} size={14} variant="tile" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium text-zinc-900 dark:text-[#ECEEF2] truncate">
                              {tab.title}
                            </div>
                            <div className="text-xs text-zinc-600 dark:text-zinc-400 truncate font-mono">
                              {getDisplayHost(tab.url)}
                            </div>
                          </div>
                          <span className="text-xs font-medium text-[#2563EB] dark:text-[#6CA2FA] shrink-0">
                            Reopen
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="pt-4 text-xs text-zinc-600 dark:text-zinc-400">
                Recent history and closed tabs will appear here as you browse.
              </p>
            )}
          </section>
        )}

        {/* Legible Keyboard Shortcuts Footer & Windows .exe Download */}
        <footer className="pt-2 flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-600 dark:text-zinc-300">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span>
              <kbd className="font-mono font-medium text-zinc-900 dark:text-zinc-100">Alt+L</kbd>{' '}
              Search / URL
            </span>
            <span aria-hidden="true" className="text-zinc-400 dark:text-zinc-500">·</span>
            <span>
              <kbd className="font-mono font-medium text-zinc-900 dark:text-zinc-100">Alt+T</kbd>{' '}
              New tab
            </span>
            <span aria-hidden="true" className="text-zinc-400 dark:text-zinc-500">·</span>
            <span>
              <kbd className="font-mono font-medium text-zinc-900 dark:text-zinc-100">Alt+B</kbd>{' '}
              Sidebar
            </span>
            <span aria-hidden="true" className="text-zinc-400 dark:text-zinc-500">·</span>
            <span>
              <kbd className="font-mono font-medium text-zinc-900 dark:text-zinc-100">Alt+P</kbd>{' '}
              Private mode
            </span>
          </div>

          <a
            href="/releases/VeloBrowser-Setup-x64.exe"
            download="VeloBrowser-Setup-x64.exe"
            className="h-7 px-2.5 rounded-md bg-white dark:bg-[#191B1F] hover:bg-zinc-100 dark:hover:bg-[#22252D] border border-zinc-200 dark:border-[#2C303B] text-zinc-800 dark:text-zinc-200 font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <Download size={12} aria-hidden="true" />
            <span>Download Windows .exe</span>
          </a>
        </footer>
      </div>
    </div>
  );
}
