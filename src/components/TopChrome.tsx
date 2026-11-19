import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Columns2,
  Download,
  Globe,
  History,
  Home,
  LayoutPanelLeft,
  Lock,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCw,
  Search,
  Shield,
  Square,
  Star,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type {
  BookmarkItem,
  BrowserTab,
  HistoryEntry,
  LayoutMode,
  OmniboxSuggestion,
  SearchEngineId,
} from '../browser/types';
import { buildOmniboxSuggestions, canGoBack, canGoForward } from '../browser/state';
import { getDisplayAddress, isInternalUrl, isSecureUrl } from '../browser/url';
import { Tooltip } from './Tooltip';

interface TopChromeProps {
  activeTab: BrowserTab;
  tabs: BrowserTab[];
  bookmarks: BookmarkItem[];
  history: HistoryEntry[];
  searchEngine: SearchEngineId;
  sidebarCollapsed: boolean;
  isPrivate: boolean;
  layout: LayoutMode;
  isBookmarked: boolean;
  addressInputRef: React.RefObject<HTMLInputElement | null>;
  onToggleSidebar: () => void;
  onBack: () => void;
  onForward: () => void;
  onReloadOrStop: () => void;
  onHome: () => void;
  onNavigateOmnibox: (input: string) => void;
  onSelectTab: (tabId: string) => void;
  onToggleBookmark: () => void;
  onDownloadCurrentPage: () => void;
  onTogglePrivate: () => void;
  onToggleLayout: () => void;
}

export function TopChrome({
  activeTab,
  tabs,
  bookmarks,
  history,
  searchEngine,
  sidebarCollapsed,
  isPrivate,
  layout,
  isBookmarked,
  addressInputRef,
  onToggleSidebar,
  onBack,
  onForward,
  onReloadOrStop,
  onHome,
  onNavigateOmnibox,
  onSelectTab,
  onToggleBookmark,
  onDownloadCurrentPage,
  onTogglePrivate,
  onToggleLayout,
}: TopChromeProps) {
  const [inputValue, setInputValue] = useState(getDisplayAddress(activeTab.url));
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const blurTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isFocused) {
      setInputValue(getDisplayAddress(activeTab.url));
    }
  }, [activeTab.id, activeTab.url, isFocused]);

  useEffect(() => {
    return () => {
      if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current);
    };
  }, []);

  const suggestions = useMemo<OmniboxSuggestion[]>(() => {
    if (!isFocused) return [];
    return buildOmniboxSuggestions(inputValue, tabs, bookmarks, history, searchEngine);
  }, [isFocused, inputValue, tabs, bookmarks, history, searchEngine]);

  const backEnabled = canGoBack(activeTab);
  const forwardEnabled = canGoForward(activeTab);
  const internalPage = isInternalUrl(activeTab.url);
  const securePage = isSecureUrl(activeTab.url);

  const commitSuggestion = (suggestion: OmniboxSuggestion) => {
    setIsFocused(false);
    setSelectedIndex(-1);
    addressInputRef.current?.blur();
    if (suggestion.kind === 'tab' && suggestion.tabId) {
      onSelectTab(suggestion.tabId);
      return;
    }
    onNavigateOmnibox(suggestion.kind === 'search' ? suggestion.title : suggestion.url);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (selectedIndex >= 0 && suggestions[selectedIndex]) {
      commitSuggestion(suggestions[selectedIndex]);
      return;
    }
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setIsFocused(false);
    setSelectedIndex(-1);
    addressInputRef.current?.blur();
    onNavigateOmnibox(trimmed);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsFocused(false);
      setSelectedIndex(-1);
      setInputValue(getDisplayAddress(activeTab.url));
      addressInputRef.current?.blur();
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

  const navBtnClass = isPrivate
    ? 'text-zinc-300 hover:text-white hover:bg-[#26223D]'
    : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/80 dark:hover:bg-[#1E2026]';

  return (
    <header
      className={`h-11 shrink-0 flex items-center gap-2 px-2.5 select-none border-b ${
        isPrivate
          ? 'bg-[#161522] dark:bg-[#161522] border-[#2C2845] text-[#ECEEF2]'
          : 'bg-[#ECEEF2] dark:bg-[#111214] border-zinc-200 dark:border-[#23262C] text-zinc-800 dark:text-[#ECEEF2]'
      }`}
    >
      {/* Left Navigation Cluster */}
      <div className="flex items-center gap-0.5 shrink-0">
        <Tooltip
          label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          shortcut="Alt+B"
          side="bottom"
        >
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!sidebarCollapsed}
            className={`h-8 w-8 rounded-md inline-flex items-center justify-center transition-colors cursor-pointer ${navBtnClass}`}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </button>
        </Tooltip>

        <button
          type="button"
          onClick={onBack}
          disabled={!backEnabled}
          aria-label="Back"
          title="Back (Alt+Left)"
          className={`h-8 w-8 rounded-md inline-flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer ${navBtnClass}`}
        >
          <ArrowLeft size={15} />
        </button>

        <button
          type="button"
          onClick={onForward}
          disabled={!forwardEnabled}
          aria-label="Forward"
          title="Forward (Alt+Right)"
          className={`h-8 w-8 rounded-md inline-flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer ${navBtnClass}`}
        >
          <ArrowRight size={15} />
        </button>

        <button
          type="button"
          onClick={onReloadOrStop}
          disabled={internalPage}
          aria-label={activeTab.isLoading ? 'Stop loading' : 'Reload page'}
          title={activeTab.isLoading ? 'Stop loading' : 'Reload (Alt+R)'}
          className={`h-8 w-8 rounded-md inline-flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer ${navBtnClass}`}
        >
          {activeTab.isLoading ? <X size={15} /> : <RotateCw size={14} />}
        </button>

        <button
          type="button"
          onClick={onHome}
          aria-label="Home"
          title="Home"
          className={`h-8 w-8 rounded-md inline-flex items-center justify-center transition-colors cursor-pointer ${navBtnClass}`}
        >
          <Home size={14} />
        </button>
      </div>

      {/* Center Zone: Address Bar shown on webpages; omitted on New Tab so the Home omnibox is the sole primary input */}
      {!internalPage ? (
        <form
          onSubmit={handleSubmit}
          className="relative flex-1 min-w-0 max-w-3xl mx-auto"
          role="search"
        >
          <div
            className={`h-8 flex items-center gap-2 px-2.5 rounded-md border transition-colors ${
              isFocused
                ? 'bg-white dark:bg-[#1A1C21] border-[#2563EB] dark:border-[#4C8BF5]'
                : isPrivate
                  ? 'bg-[#201E30] border-[#312D4B] hover:border-[#413C63]'
                  : 'bg-white/90 dark:bg-[#191B1F] border-zinc-300/80 dark:border-[#262930] hover:border-zinc-400/80 dark:hover:border-[#343842]'
            }`}
          >
            <span className="shrink-0 text-zinc-400 dark:text-zinc-400" aria-hidden="true">
              {securePage ? (
                <Lock size={13} className="text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Globe size={13} />
              )}
            </span>

            <label htmlFor="velo-address-bar" className="sr-only">
              Address and search bar
            </label>
            <input
              ref={addressInputRef}
              id="velo-address-bar"
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setSelectedIndex(-1);
              }}
              onFocus={(e) => {
                if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current);
                setIsFocused(true);
                e.currentTarget.select();
              }}
              onBlur={() => {
                blurTimerRef.current = window.setTimeout(() => {
                  setIsFocused(false);
                  setSelectedIndex(-1);
                }, 140);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search or enter website address"
              autoComplete="off"
              spellCheck={false}
              className={`flex-1 min-w-0 bg-transparent text-xs font-mono focus:outline-none ${
                isPrivate
                  ? 'text-[#ECEEF2] placeholder:text-zinc-400'
                  : 'text-zinc-900 dark:text-[#ECEEF2] placeholder:text-zinc-500 dark:placeholder:text-zinc-400'
              }`}
            />

            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={onToggleBookmark}
                aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark this page'}
                aria-pressed={isBookmarked}
                title={isBookmarked ? 'Remove bookmark (Alt+D)' : 'Bookmark this page (Alt+D)'}
                className={`h-6 w-6 rounded inline-flex items-center justify-center transition-colors cursor-pointer ${
                  isBookmarked
                    ? 'text-[#2563EB] dark:text-[#4C8BF5]'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100'
                }`}
              >
                <Star size={13} fill={isBookmarked ? 'currentColor' : 'none'} />
              </button>

              <button
                type="button"
                onClick={onDownloadCurrentPage}
                aria-label="Download current page"
                title="Download current page"
                className="h-6 w-6 rounded inline-flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 transition-colors cursor-pointer"
              >
                <Download size={13} />
              </button>
            </div>
          </div>

          <AnimatePresence>
            {isFocused && suggestions.length > 0 && (
              <motion.ul
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
                role="listbox"
                aria-label="Address suggestions"
                className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 rounded-md border border-zinc-200 dark:border-[#2B2E36] bg-white dark:bg-[#191B1F] py-1 shadow-lg overflow-hidden"
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
                        className={`w-full px-3 py-1.5 flex items-center gap-2.5 text-left text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-zinc-100 dark:bg-[#252830] text-zinc-900 dark:text-white'
                            : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100/80 dark:hover:bg-[#22252C]'
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
      ) : (
        <div className="flex-1 min-w-0" />
      )}

      {/* Right Mode Controls — clearly framed interactive buttons with explanatory tooltips */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Tooltip
          label={layout === 'compact' ? 'Window frame: Compact' : 'Window frame: Floating'}
          sublabel={
            layout === 'compact'
              ? 'Click to switch to Floating inset frame'
              : 'Click to switch to edge-to-edge Compact frame'
          }
          side="bottom-end"
        >
          <button
            type="button"
            onClick={onToggleLayout}
            aria-label={layout === 'compact' ? 'Switch to floating layout' : 'Switch to compact layout'}
            className={`h-7 px-2.5 rounded-md border inline-flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              isPrivate
                ? 'bg-[#1D1B2D] border-[#353052] text-zinc-200 hover:bg-[#27243D] hover:border-[#494270]'
                : 'bg-white/80 dark:bg-[#191B20] border-zinc-300/90 dark:border-[#2B2E37] text-zinc-800 dark:text-zinc-200 hover:bg-white dark:hover:bg-[#23262F] hover:border-zinc-400 dark:hover:border-[#3D4250]'
            }`}
          >
            {layout === 'floating' ? (
              <Square size={13} aria-hidden="true" />
            ) : (
              <LayoutPanelLeft size={13} aria-hidden="true" />
            )}
            <span>{layout === 'floating' ? 'Floating' : 'Compact'}</span>
          </button>
        </Tooltip>

        <Tooltip
          label={isPrivate ? 'Exit Private Session' : 'Open Private Session'}
          sublabel={
            isPrivate
              ? 'Return to your normal tabs and discard private tabs'
              : 'Browse without saving history or closed tabs'
          }
          shortcut="Alt+P"
          side="bottom-end"
        >
          <button
            type="button"
            onClick={onTogglePrivate}
            aria-label={isPrivate ? 'Exit private browsing' : 'Enter private browsing'}
            aria-pressed={isPrivate}
            className={`h-7 px-2.5 rounded-md border inline-flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              isPrivate
                ? 'bg-[#312952] border-[#6154A1] text-[#EBE8FF] hover:bg-[#3C3364]'
                : 'bg-white/80 dark:bg-[#191B20] border-zinc-300/90 dark:border-[#2B2E37] text-zinc-800 dark:text-zinc-200 hover:bg-white dark:hover:bg-[#23262F] hover:border-zinc-400 dark:hover:border-[#3D4250]'
            }`}
          >
            <Shield size={13} aria-hidden="true" />
            <span>{isPrivate ? 'Private: On' : 'Private'}</span>
          </button>
        </Tooltip>
      </div>
    </header>
  );
}
