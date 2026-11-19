import { Copy, Loader2, Moon, Pin, PinOff, Plus, RotateCcw, X } from 'lucide-react';
import type { BrowserTab, ClosedTabRecord } from '../browser/types';
import { getDisplayHost, isInternalUrl } from '../browser/url';
import { Favicon } from './Favicon';

interface TabListProps {
  tabs: BrowserTab[];
  activeTabId: string;
  closedTabs: ClosedTabRecord[];
  isPrivate: boolean;
  onSelectTab: (tabId: string) => void;
  onNewTab: () => void;
  onCloseTab: (tabId: string) => void;
  onPinTab: (tabId: string) => void;
  onDuplicateTab: (tabId: string) => void;
  onSuspendTab: (tabId: string) => void;
  onReopenClosedTab: () => void;
}

export function TabList({
  tabs,
  activeTabId,
  closedTabs,
  isPrivate,
  onSelectTab,
  onNewTab,
  onCloseTab,
  onPinTab,
  onDuplicateTab,
  onSuspendTab,
  onReopenClosedTab,
}: TabListProps) {
  const pinnedTabs = tabs.filter((t) => t.isPinned);
  const regularTabs = tabs.filter((t) => !t.isPinned);
  const suspendedCount = tabs.filter((t) => t.isSuspended).length;

  const renderTabRow = (tab: BrowserTab) => {
    const isActive = tab.id === activeTabId;
    const label = tab.title || getDisplayHost(tab.url);
    const canSuspend = !isInternalUrl(tab.url) && !isActive;

    return (
      <div
        key={tab.id}
        role="tab"
        aria-selected={isActive}
        className={`group relative flex items-center gap-1 rounded-md px-1.5 py-1 transition-colors ${
          isActive
            ? isPrivate
              ? 'bg-[#26223D] text-[#ECEEF2]'
              : 'bg-white dark:bg-[#202329] text-zinc-900 dark:text-[#ECEEF2] border border-zinc-200/80 dark:border-[#2E323B]'
            : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-[#1B1D22] border border-transparent'
        }`}
      >
        <button
          type="button"
          onClick={() => onSelectTab(tab.id)}
          className="flex-1 min-w-0 flex items-center gap-2 py-0.5 px-1 text-left cursor-pointer focus:outline-none"
        >
          {tab.isLoading ? (
            <Loader2
              size={14}
              className="shrink-0 animate-spin text-[#2563EB] dark:text-[#4C8BF5]"
              aria-hidden="true"
            />
          ) : (
            <Favicon
              url={tab.url}
              isPrivate={tab.isPrivate}
              size={14}
              className={tab.isSuspended ? 'opacity-45' : ''}
            />
          )}

          <span
            className={`text-xs truncate ${
              isActive ? 'font-medium' : 'font-normal'
            } ${tab.isSuspended ? 'opacity-55' : ''}`}
          >
            {label}
          </span>
        </button>

        {/* Subtle inline tab actions shown on hover or keyboard focus so titles use full width */}
        <div className="hidden group-hover:flex group-focus-within:flex items-center gap-0.5 shrink-0">
          {canSuspend && (
            <button
              type="button"
              onClick={() => onSuspendTab(tab.id)}
              aria-label={tab.isSuspended ? `Wake tab ${label}` : `Suspend tab ${label}`}
              title={tab.isSuspended ? 'Wake tab' : 'Suspend tab to free memory'}
              className="h-6 w-6 rounded inline-flex items-center justify-center text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 hover:bg-zinc-300/60 dark:hover:bg-[#2C3039] cursor-pointer"
            >
              <Moon size={12} />
            </button>
          )}
          <button
            type="button"
            onClick={() => onPinTab(tab.id)}
            aria-label={tab.isPinned ? `Unpin tab ${label}` : `Pin tab ${label}`}
            title={tab.isPinned ? 'Unpin tab' : 'Pin tab'}
            className="h-6 w-6 rounded inline-flex items-center justify-center text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 hover:bg-zinc-300/60 dark:hover:bg-[#2C3039] cursor-pointer"
          >
            {tab.isPinned ? <PinOff size={12} /> : <Pin size={12} />}
          </button>
          <button
            type="button"
            onClick={() => onDuplicateTab(tab.id)}
            aria-label={`Duplicate tab ${label}`}
            title="Duplicate tab"
            className="h-6 w-6 rounded inline-flex items-center justify-center text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 hover:bg-zinc-300/60 dark:hover:bg-[#2C3039] cursor-pointer"
          >
            <Copy size={12} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => onCloseTab(tab.id)}
          aria-label={`Close tab ${label}`}
          title="Close tab (Alt+W)"
          className={`h-6 w-6 rounded shrink-0 inline-flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-300/60 dark:hover:bg-[#2C3039] transition-opacity cursor-pointer ${
            isActive ? 'opacity-85' : 'hidden group-hover:inline-flex group-focus-within:inline-flex'
          }`}
        >
          <X size={12} />
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-2.5 pt-2.5 pb-2 flex items-center gap-1.5">
        <button
          type="button"
          onClick={onNewTab}
          className="flex-1 h-8 px-2.5 rounded-md bg-white dark:bg-[#1B1D22] hover:bg-zinc-50 dark:hover:bg-[#22252C] border border-zinc-200 dark:border-[#2A2D35] text-xs font-medium text-zinc-800 dark:text-[#ECEEF2] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
        >
          <Plus size={14} aria-hidden="true" />
          <span>New tab</span>
        </button>

        {closedTabs.length > 0 && !isPrivate && (
          <button
            type="button"
            onClick={onReopenClosedTab}
            aria-label="Reopen last closed tab"
            title="Reopen closed tab (Alt+Shift+T)"
            className="h-8 w-8 rounded-md bg-white dark:bg-[#1B1D22] hover:bg-zinc-50 dark:hover:bg-[#22252C] border border-zinc-200 dark:border-[#2A2D35] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 inline-flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <RotateCcw size={13} />
          </button>
        )}
      </div>

      <div
        role="tablist"
        aria-label="Open tabs"
        aria-orientation="vertical"
        className="flex-1 overflow-y-auto px-2 pb-2 space-y-1"
      >
        {pinnedTabs.length > 0 && (
          <div className="pb-2 mb-2 border-b border-zinc-200/80 dark:border-[#23262C] space-y-1">
            <div className="px-2 py-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-300">
              Pinned
            </div>
            {pinnedTabs.map(renderTabRow)}
          </div>
        )}

        <div className="space-y-0.5">{regularTabs.map(renderTabRow)}</div>
      </div>

      <div className="px-3 py-2 border-t border-zinc-200/80 dark:border-[#23262C] text-xs text-zinc-600 dark:text-zinc-300 flex items-center justify-between tabular-nums">
        <span>
          {tabs.length} {tabs.length === 1 ? 'tab' : 'tabs'}
          {suspendedCount > 0 ? ` · ${suspendedCount} asleep` : ''}
        </span>
        {isPrivate && <span className="text-[#9D91F8] font-medium">Private</span>}
      </div>
    </div>
  );
}
