import { useState } from 'react';
import {
  Bookmark,
  Download,
  History,
  Layers,
  Loader2,
  Plus,
  Settings,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type {
  BookmarkItem,
  BrowserSettings,
  BrowserTab,
  ClosedTabRecord,
  DownloadItem,
  HistoryEntry,
  SidebarSection,
} from '../browser/types';
import { getDisplayHost } from '../browser/url';
import { Favicon } from './Favicon';
import { Tooltip } from './Tooltip';
import { TabList } from './TabList';
import { BookmarksPanel } from './BookmarksPanel';
import { HistoryPanel } from './HistoryPanel';
import { DownloadsPanel } from './DownloadsPanel';
import { SettingsPanel } from './SettingsPanel';

interface SidebarProps {
  collapsed: boolean;
  section: SidebarSection;
  isPrivate: boolean;
  layout: BrowserSettings['layout'];
  tabs: BrowserTab[];
  activeTabId: string;
  closedTabs: ClosedTabRecord[];
  bookmarks: BookmarkItem[];
  history: HistoryEntry[];
  downloads: DownloadItem[];
  settings: BrowserSettings;
  onSelectSection: (section: SidebarSection) => void;
  onSelectTab: (tabId: string) => void;
  onNewTab: () => void;
  onCloseTab: (tabId: string) => void;
  onPinTab: (tabId: string) => void;
  onDuplicateTab: (tabId: string) => void;
  onSuspendTab: (tabId: string) => void;
  onReopenClosedTab: () => void;
  onOpenUrl: (url: string) => void;
  onOpenInNewTab: (url: string) => void;
  onAddBookmark: (item: { title: string; url: string; folder: string }) => void;
  onUpdateBookmark: (id: string, updates: { title: string; url: string; folder: string }) => void;
  onDeleteBookmark: (id: string) => void;
  onRemoveHistory: (id: string) => void;
  onClearHistory: () => void;
  onStartDownload: (url: string, filename?: string) => void;
  onCancelDownload: (id: string) => void;
  onRetryDownload: (item: DownloadItem) => void;
  onSaveAgainDownload: (item: DownloadItem) => void;
  onRemoveDownload: (id: string) => void;
  onClearFinishedDownloads: () => void;
  onClearAllDownloads: () => void;
  onUpdateSettings: (patch: Partial<BrowserSettings>) => void;
}

const NAV_ITEMS: {
  id: SidebarSection;
  label: string;
  shortcut?: string;
  icon: typeof Layers;
}[] = [
  { id: 'tabs', label: 'Tabs', icon: Layers },
  { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
  { id: 'history', label: 'History', shortcut: 'Alt+H', icon: History },
  { id: 'downloads', label: 'Downloads', shortcut: 'Alt+J', icon: Download },
  { id: 'settings', label: 'Settings', shortcut: 'Alt+,', icon: Settings },
];

export function Sidebar({
  collapsed,
  section,
  isPrivate,
  layout,
  tabs,
  activeTabId,
  closedTabs,
  bookmarks,
  history,
  downloads,
  settings,
  onSelectSection,
  onSelectTab,
  onNewTab,
  onCloseTab,
  onPinTab,
  onDuplicateTab,
  onSuspendTab,
  onReopenClosedTab,
  onOpenUrl,
  onOpenInNewTab,
  onAddBookmark,
  onUpdateBookmark,
  onDeleteBookmark,
  onRemoveHistory,
  onClearHistory,
  onStartDownload,
  onCancelDownload,
  onRetryDownload,
  onSaveAgainDownload,
  onRemoveDownload,
  onClearFinishedDownloads,
  onClearAllDownloads,
  onUpdateSettings,
}: SidebarProps) {
  const [hoverExpanded, setHoverExpanded] = useState(false);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
  const activeDownloadsCount = downloads.filter((d) => d.status === 'downloading').length;
  const collapsedMode = settings.collapsedSidebarMode;

  // In top-bar mode, collapsing hides the sidebar completely because the horizontal tab bar takes over.
  if (collapsed && collapsedMode === 'top-bar') {
    return null;
  }

  const renderPanelContent = () => (
    <div className="w-[236px] h-full min-h-0 flex flex-col overflow-hidden">
      {section === 'tabs' && (
        <TabList
          tabs={tabs}
          activeTabId={activeTabId}
          closedTabs={closedTabs}
          isPrivate={isPrivate}
          onSelectTab={onSelectTab}
          onNewTab={onNewTab}
          onCloseTab={onCloseTab}
          onPinTab={onPinTab}
          onDuplicateTab={onDuplicateTab}
          onSuspendTab={onSuspendTab}
          onReopenClosedTab={onReopenClosedTab}
        />
      )}

      {section === 'bookmarks' && (
        <BookmarksPanel
          bookmarks={bookmarks}
          currentUrl={activeTab?.url || ''}
          currentTitle={activeTab?.title || ''}
          onOpenUrl={onOpenUrl}
          onOpenInNewTab={onOpenInNewTab}
          onAddBookmark={onAddBookmark}
          onUpdateBookmark={onUpdateBookmark}
          onDeleteBookmark={onDeleteBookmark}
        />
      )}

      {section === 'history' && (
        <HistoryPanel
          history={history}
          isPrivate={isPrivate}
          onOpenUrl={onOpenUrl}
          onOpenInNewTab={onOpenInNewTab}
          onRemoveEntry={onRemoveHistory}
          onClearHistory={onClearHistory}
        />
      )}

      {section === 'downloads' && (
        <DownloadsPanel
          downloads={downloads}
          currentUrl={activeTab?.url || ''}
          onStartDownload={onStartDownload}
          onCancelDownload={onCancelDownload}
          onRetryDownload={onRetryDownload}
          onSaveAgain={onSaveAgainDownload}
          onRemoveDownload={onRemoveDownload}
          onClearFinished={onClearFinishedDownloads}
        />
      )}

      {section === 'settings' && (
        <SettingsPanel
          settings={settings}
          onUpdateSettings={onUpdateSettings}
          onClearHistory={onClearHistory}
          onClearDownloads={onClearAllDownloads}
        />
      )}
    </div>
  );

  // Hover-to-expand mode when collapsed: zero permanent sidebar footprint + left-edge reveal sensor
  if (collapsed && collapsedMode === 'hover-expand') {
    return (
      <div
        data-testid="sidebar-hover-zone"
        onMouseEnter={() => setHoverExpanded(true)}
        onMouseLeave={() => setHoverExpanded(false)}
        className="fixed left-0 top-11 bottom-0 z-40 flex"
        style={{ width: hoverExpanded ? 'auto' : '10px' }}
      >
        {!hoverExpanded && (
          <button
            type="button"
            aria-label="Reveal sidebar on hover"
            onFocus={() => setHoverExpanded(true)}
            className="h-full w-2.5 bg-transparent hover:bg-[#2563EB]/20 dark:hover:bg-[#4C8BF5]/25 transition-colors cursor-pointer"
          />
        )}

        <AnimatePresence>
          {hoverExpanded && (
            <motion.aside
              key="hover-sidebar"
              aria-label="Browser sidebar"
              data-testid="browser-sidebar"
              data-collapsed="hover"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
              className={`h-full min-h-0 flex select-none border-r shadow-xl ${
                isPrivate
                  ? 'bg-[#141320] border-[#2C2845]'
                  : 'bg-[#F1F3F6] dark:bg-[#111214] border-zinc-200 dark:border-[#23262C]'
              }`}
            >
              <nav
                aria-label="Sidebar sections"
                className="w-12 shrink-0 flex flex-col items-center py-2 gap-1 border-r border-zinc-200/80 dark:border-[#202329]"
              >
                {NAV_ITEMS.map(({ id, label, shortcut, icon: Icon }) => {
                  const isCurrent = section === id;
                  return (
                    <Tooltip key={id} label={label} shortcut={shortcut} side="right">
                      <button
                        type="button"
                        onClick={() => onSelectSection(id)}
                        aria-label={label}
                        aria-current={isCurrent ? 'page' : undefined}
                        className={`relative h-8 w-8 rounded-md inline-flex items-center justify-center transition-colors cursor-pointer ${
                          isCurrent
                            ? isPrivate
                              ? 'bg-[#2C2548] text-[#ECEEF2]'
                              : 'bg-white dark:bg-[#22252C] text-zinc-900 dark:text-[#ECEEF2] border border-zinc-200/80 dark:border-[#2E323B]'
                            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-[#ECEEF2] hover:bg-zinc-200/60 dark:hover:bg-[#1B1D22]'
                        }`}
                      >
                        <Icon size={15} aria-hidden="true" />
                      </button>
                    </Tooltip>
                  );
                })}
              </nav>
              {renderPanelContent()}
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <aside
      aria-label="Browser sidebar"
      data-testid="browser-sidebar"
      data-collapsed={collapsed ? 'true' : 'false'}
      data-collapsed-mode={collapsedMode}
      className={`shrink-0 flex h-full min-h-0 select-none ${
        layout === 'floating' ? 'rounded-lg border' : 'border-r'
      } ${
        isPrivate
          ? 'bg-[#141320] border-[#2C2845]'
          : 'bg-[#F1F3F6] dark:bg-[#111214] border-zinc-200 dark:border-[#23262C]'
      }`}
    >
      {/* Vertical Navigation & Collapsed Icon-Only Tabs Rail */}
      <div
        className={`${
          collapsed ? 'w-14' : 'w-12 border-r border-zinc-200/80 dark:border-[#202329]'
        } shrink-0 flex flex-col items-center py-2 min-h-0`}
      >
        <nav
          aria-label="Sidebar sections"
          className="flex flex-col items-center gap-1 shrink-0"
        >
          {NAV_ITEMS.map(({ id, label, shortcut, icon: Icon }) => {
            const isCurrent = !collapsed && section === id;
            return (
              <Tooltip key={id} label={label} shortcut={shortcut} side="right">
                <button
                  type="button"
                  onClick={() => onSelectSection(id)}
                  aria-label={label}
                  aria-current={isCurrent ? 'page' : undefined}
                  title={label}
                  className={`relative h-8 w-8 rounded-md inline-flex items-center justify-center transition-colors cursor-pointer ${
                    isCurrent
                      ? isPrivate
                        ? 'bg-[#2C2548] text-[#ECEEF2]'
                        : 'bg-white dark:bg-[#22252C] text-zinc-900 dark:text-[#ECEEF2] border border-zinc-200/80 dark:border-[#2E323B]'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-[#ECEEF2] hover:bg-zinc-200/60 dark:hover:bg-[#1B1D22]'
                  }`}
                >
                  <Icon size={15} aria-hidden="true" />
                  {id === 'downloads' && activeDownloadsCount > 0 && (
                    <span className="sr-only">{activeDownloadsCount} active downloads</span>
                  )}
                </button>
              </Tooltip>
            );
          })}
        </nav>

        {/* Icon-Only Vertical Tabs when sidebar is collapsed in icon-rail mode */}
        {collapsed && (
          <>
            <div className="w-7 my-2 border-t border-zinc-300/80 dark:border-[#262932] shrink-0" />

            <div
              role="tablist"
              aria-label="Open tabs"
              aria-orientation="vertical"
              data-testid="collapsed-tab-rail"
              className="flex-1 min-h-0 w-full overflow-y-auto flex flex-col items-center gap-1.5 px-1.5 py-0.5"
            >
              {tabs.map((tab) => {
                const isActive = tab.id === activeTabId;
                const label = tab.title || getDisplayHost(tab.url);
                const host = getDisplayHost(tab.url);

                return (
                  <div
                    key={tab.id}
                    role="tab"
                    aria-selected={isActive}
                    className="group relative w-full flex items-center justify-center shrink-0"
                  >
                    {/* Crisp active indicator bar on the left edge */}
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full ${
                          isPrivate
                            ? 'bg-[#9D91F8]'
                            : 'bg-[#2563EB] dark:bg-[#4C8BF5]'
                        }`}
                      />
                    )}

                    <Tooltip
                      label={label}
                      sublabel={host !== label ? host : undefined}
                      side="right"
                    >
                      <button
                        type="button"
                        onClick={() => onSelectTab(tab.id)}
                        aria-label={`Switch to tab ${label}`}
                        className={`h-9 w-9 rounded-md inline-flex items-center justify-center border transition-colors cursor-pointer ${
                          isActive
                            ? isPrivate
                              ? 'bg-[#2A2546] border-[#514685]'
                              : 'bg-white dark:bg-[#22252E] border-zinc-300 dark:border-[#3A3F4D]'
                            : 'bg-transparent border-transparent hover:bg-zinc-200/70 dark:hover:bg-[#1B1D24] hover:border-zinc-300/60 dark:hover:border-[#2C303B]'
                        }`}
                      >
                        {tab.isLoading ? (
                          <Loader2
                            size={15}
                            className="animate-spin text-[#2563EB] dark:text-[#4C8BF5]"
                            aria-hidden="true"
                          />
                        ) : (
                          <Favicon
                            url={tab.url}
                            isPrivate={tab.isPrivate}
                            size={16}
                            className={tab.isSuspended ? 'opacity-45' : ''}
                          />
                        )}
                      </button>
                    </Tooltip>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloseTab(tab.id);
                      }}
                      aria-label={`Close tab ${label}`}
                      title={`Close ${label}`}
                      className={`absolute -top-1 right-0.5 h-4 w-4 rounded-full bg-zinc-200 dark:bg-[#2B2F3A] border border-zinc-300 dark:border-[#404656] text-zinc-700 dark:text-zinc-200 hover:bg-red-600 hover:border-red-600 hover:text-white inline-flex items-center justify-center transition-opacity cursor-pointer ${
                        isActive
                          ? 'opacity-90'
                          : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                      }`}
                    >
                      <X size={10} />
                    </button>
                  </div>
                );
              })}

              {/* Clearly labeled New Tab button directly under tabs */}
              <div className="pt-1 shrink-0">
                <Tooltip label="New tab" shortcut="Alt+T" side="right">
                  <button
                    type="button"
                    onClick={onNewTab}
                    aria-label="New tab"
                    title="New tab (Alt+T)"
                    className="h-9 w-9 rounded-md border border-dashed border-zinc-300 dark:border-[#323642] hover:border-zinc-400 dark:hover:border-[#4A5060] bg-white/60 dark:bg-[#17191E] hover:bg-white dark:hover:bg-[#21242D] text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white inline-flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Plus size={15} />
                  </button>
                </Tooltip>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Expandable Sidebar Panel */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="sidebar-drawer"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            className="h-full min-h-0 flex flex-col overflow-hidden"
          >
            {renderPanelContent()}
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
