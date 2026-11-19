import { useEffect, useRef } from 'react';
import { Moon, RotateCw } from 'lucide-react';
import type { BookmarkItem, BrowserTab, SearchEngineId, TabError } from '../browser/types';
import { getWebviewProxyUrl, invokeTauriCommand, isTauriDesktop } from '../browser/runtime';
import { isInternalUrl } from '../browser/url';
import { canGoBack } from '../browser/state';
import { NewTabPage } from './NewTabPage';
import { ErrorPage } from './ErrorPage';

interface WebViewportProps {
  tabs: BrowserTab[];
  activeTabId: string;
  bookmarks: BookmarkItem[];
  history: import('../browser/types').HistoryEntry[];
  closedTabs: import('../browser/types').ClosedTabRecord[];
  searchEngine: SearchEngineId;
  isPrivate: boolean;
  homeInputRef: React.RefObject<HTMLInputElement | null>;
  onNavigateInTab: (tabId: string, url: string) => void;
  onNavigateOmnibox: (input: string) => void;
  onSelectTab: (tabId: string) => void;
  onOpenNewTab: (url: string) => void;
  onReopenClosedTab: (index: number) => void;
  onTabLoaded: (tabId: string, meta: { url: string; title: string; favicon?: string }) => void;
  onFrameLoadSettled: (tabId: string) => void;
  onTabError: (tabId: string, error: TabError) => void;
  onStartDownload: (url: string, filename?: string) => void;
  onRetryTab: (tabId: string) => void;
  onBackTab: (tabId: string) => void;
  onWakeTab: (tabId: string) => void;
}

export function WebViewport({
  tabs,
  activeTabId,
  bookmarks,
  history,
  closedTabs,
  searchEngine,
  isPrivate,
  homeInputRef,
  onNavigateInTab,
  onNavigateOmnibox,
  onSelectTab,
  onOpenNewTab,
  onReopenClosedTab,
  onTabLoaded,
  onFrameLoadSettled,
  onTabError,
  onStartDownload,
  onRetryTab,
  onBackTab,
  onWakeTab,
}: WebViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  // Listen to bridge postMessage events from proxied webview frames
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object' || typeof data.type !== 'string') return;
      if (!data.type.startsWith('velo:')) return;

      const tabId = typeof data.tabId === 'string' ? data.tabId : activeTabId;

      switch (data.type) {
        case 'velo:loaded':
          if (typeof data.url === 'string') {
            onTabLoaded(tabId, {
              url: data.url,
              title: typeof data.title === 'string' ? data.title : '',
              favicon: typeof data.favicon === 'string' ? data.favicon : undefined,
            });
          }
          break;
        case 'velo:navigate':
          if (typeof data.url === 'string') {
            onNavigateInTab(tabId, data.url);
          }
          break;
        case 'velo:newtab':
          if (typeof data.url === 'string') {
            onOpenNewTab(data.url);
          }
          break;
        case 'velo:download':
          if (typeof data.url === 'string') {
            onStartDownload(
              data.url,
              typeof data.filename === 'string' && data.filename ? data.filename : undefined
            );
          }
          break;
        case 'velo:error':
          onTabError(tabId, {
            code: typeof data.code === 'string' ? data.code : 'ERR_LOAD_FAILED',
            message:
              typeof data.message === 'string'
                ? data.message
                : 'The page could not be loaded.',
            url: typeof data.url === 'string' ? data.url : '',
          });
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [activeTabId, onNavigateInTab, onOpenNewTab, onStartDownload, onTabError, onTabLoaded]);

  // Native Tauri v2 webview synchronization when running inside Tauri desktop binary
  useEffect(() => {
    if (!isTauriDesktop() || !activeTab || isInternalUrl(activeTab.url)) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    void invokeTauriCommand('open_native_tab_webview', {
      tabId: activeTab.id,
      targetUrl: activeTab.url,
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    });
  }, [activeTab?.id, activeTab?.url, activeTab?.reloadNonce]);

  return (
    <main
      ref={containerRef}
      aria-label="Browser viewport"
      data-testid="browser-viewport"
      className="relative flex-1 min-w-0 min-h-0 bg-white dark:bg-[#141518] overflow-hidden"
    >
      {/* Subtle 2px top loading bar */}
      {activeTab?.isLoading && (
        <div
          role="progressbar"
          aria-label="Page loading"
          className="absolute top-0 left-0 right-0 h-[2px] z-30 overflow-hidden bg-transparent"
        >
          <div className="h-full w-1/3 bg-[#2563EB] dark:bg-[#4C8BF5] animate-[velo-progress_1.1s_ease-in-out_infinite]" />
        </div>
      )}

      {/* Keep non-suspended web tabs mounted so switching tabs never triggers unnecessary reloads */}
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab?.id;
        const internal = isInternalUrl(tab.url);

        if (internal) {
          if (!isActive) return null;
          return (
            <div key={tab.id} className="absolute inset-0 z-10">
              <NewTabPage
                tabs={tabs}
                bookmarks={bookmarks}
                history={history}
                closedTabs={closedTabs}
                searchEngine={searchEngine}
                isPrivate={isPrivate}
                inputRef={homeInputRef}
                onNavigate={onNavigateOmnibox}
                onSelectTab={onSelectTab}
                onOpenBookmarkInNewTab={onOpenNewTab}
                onReopenClosedTab={onReopenClosedTab}
              />
            </div>
          );
        }

        if (tab.isSuspended) {
          if (!isActive) return null;
          return (
            <div
              key={tab.id}
              className="absolute inset-0 z-10 bg-[#F7F8FA] dark:bg-[#141518] flex items-center justify-center p-6"
            >
              <div className="max-w-sm text-center border border-zinc-200 dark:border-[#272A30] bg-white dark:bg-[#191B1F] rounded-lg p-6">
                <Moon size={20} className="mx-auto mb-3 text-zinc-400" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-[#ECEEF2] mb-1">
                  Tab suspended to save memory
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 truncate font-mono">
                  {tab.url}
                </p>
                <button
                  type="button"
                  onClick={() => onWakeTab(tab.id)}
                  className="h-8 px-3.5 rounded-md bg-[#2563EB] dark:bg-[#4C8BF5] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCw size={13} aria-hidden="true" />
                  <span>Reload tab</span>
                </button>
              </div>
            </div>
          );
        }

        if (tab.error) {
          if (!isActive) return null;
          return (
            <div key={tab.id} className="absolute inset-0 z-20">
              <ErrorPage
                error={tab.error}
                canGoBack={canGoBack(tab)}
                searchEngine={searchEngine}
                onRetry={() => onRetryTab(tab.id)}
                onBack={() => onBackTab(tab.id)}
                onNavigate={(url) => onNavigateInTab(tab.id, url)}
              />
            </div>
          );
        }

        const proxySrc = getWebviewProxyUrl(tab.frameUrl, tab.id, tab.reloadNonce);

        return (
          <iframe
            key={`${tab.id}-frame-${tab.reloadNonce}`}
            src={proxySrc}
            title={tab.title || tab.url}
            data-testid={`tab-frame-${tab.id}`}
            data-active={isActive ? 'true' : 'false'}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
            onLoad={() => {
              onFrameLoadSettled(tab.id);
            }}
            className={`absolute inset-0 w-full h-full border-0 bg-white ${
              isActive ? 'z-10 visible opacity-100' : 'z-0 invisible opacity-0 pointer-events-none'
            }`}
          />
        );
      })}
    </main>
  );
}
