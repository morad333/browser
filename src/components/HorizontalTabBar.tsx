import { Loader2, Plus, X } from 'lucide-react';
import type { BrowserTab } from '../browser/types';
import { getDisplayHost } from '../browser/url';
import { Favicon } from './Favicon';

interface HorizontalTabBarProps {
  tabs: BrowserTab[];
  activeTabId: string;
  isPrivate: boolean;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onNewTab: () => void;
}

export function HorizontalTabBar({
  tabs,
  activeTabId,
  isPrivate,
  onSelectTab,
  onCloseTab,
  onNewTab,
}: HorizontalTabBarProps) {
  return (
    <div
      data-testid="horizontal-tab-bar"
      className={`h-9 shrink-0 flex items-center gap-1 px-2 border-b select-none overflow-x-auto ${
        isPrivate
          ? 'bg-[#141320] border-[#2C2845]'
          : 'bg-[#E6E8EE] dark:bg-[#111214] border-zinc-200 dark:border-[#23262C]'
      }`}
    >
      <div
        role="tablist"
        aria-label="Open tabs"
        aria-orientation="horizontal"
        className="flex items-center gap-1 min-w-0"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const label = tab.title || getDisplayHost(tab.url);

          return (
            <div
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              className={`group relative flex items-center gap-1.5 h-7 max-w-[200px] min-w-[110px] pl-2 pr-1 rounded-md border transition-colors shrink-0 ${
                isActive
                  ? isPrivate
                    ? 'bg-[#26223D] border-[#4A4175] text-[#ECEEF2]'
                    : 'bg-white dark:bg-[#1E2128] border-zinc-300/90 dark:border-[#323642] text-zinc-900 dark:text-[#ECEEF2]'
                  : isPrivate
                    ? 'bg-transparent border-transparent text-zinc-300 hover:bg-[#1E1B31]'
                    : 'bg-transparent border-transparent text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-[#1A1C22]'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectTab(tab.id)}
                title={label}
                className="flex-1 min-w-0 flex items-center gap-2 text-left cursor-pointer focus:outline-none"
              >
                {tab.isLoading ? (
                  <Loader2
                    size={13}
                    className="shrink-0 animate-spin text-[#2563EB] dark:text-[#4C8BF5]"
                    aria-hidden="true"
                  />
                ) : (
                  <Favicon
                    url={tab.url}
                    isPrivate={tab.isPrivate}
                    size={14}
                    className={tab.isSuspended ? 'opacity-50' : ''}
                  />
                )}
                <span
                  className={`text-xs truncate ${
                    isActive ? 'font-medium' : 'font-normal'
                  } ${tab.isSuspended ? 'opacity-60' : ''}`}
                >
                  {label}
                </span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                aria-label={`Close tab ${label}`}
                title={`Close ${label}`}
                className={`h-5 w-5 rounded shrink-0 inline-flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/80 dark:hover:bg-[#2F333F] transition-colors cursor-pointer ${
                  isActive ? 'opacity-90' : 'opacity-60 group-hover:opacity-100'
                }`}
              >
                <X size={11} />
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onNewTab}
        aria-label="New tab"
        title="New tab (Alt+T)"
        className={`h-7 px-2 rounded-md inline-flex items-center gap-1 text-xs font-medium shrink-0 transition-colors cursor-pointer whitespace-nowrap ${
          isPrivate
            ? 'text-zinc-300 hover:text-white hover:bg-[#26223D]'
            : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/80 dark:hover:bg-[#1E2128]'
        }`}
      >
        <Plus size={13} aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">New tab</span>
      </button>
    </div>
  );
}
