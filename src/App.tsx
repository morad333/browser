import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  BookmarkItem,
  BrowserSessionState,
  BrowserSettings,
  DownloadItem,
  HistoryEntry,
  SidebarSection,
  TabError,
} from './browser/types';
import {
  addTabToSession,
  closeTabInSession,
  createId,
  createInitialSession,
  duplicateTabInSession,
  goBackInTab,
  goForwardInTab,
  navigateTabInSession,
  recordHistoryEntry,
  reloadTabInSession,
  reopenClosedTabInSession,
  selectTabInSession,
  setTabErrorInSession,
  stopTabLoadingInSession,
  toggleBookmarkList,
  togglePinTabInSession,
  toggleSuspendTabInSession,
  updateTabMetadataInSession,
} from './browser/state';
import {
  loadBookmarks,
  loadDownloads,
  loadHistory,
  loadSettings,
  saveBookmarks,
  saveDownloads,
  saveHistory,
  saveSettings,
} from './browser/storage';
import { getDownloadEndpointUrl, invokeTauriCommand, isTauriDesktop } from './browser/runtime';
import { INTERNAL_NEW_TAB_URL, getDisplayHost, isInternalUrl, resolveOmniboxInput } from './browser/url';
import { TopChrome } from './components/TopChrome';
import { HorizontalTabBar } from './components/HorizontalTabBar';
import { Sidebar } from './components/Sidebar';
import { WebViewport } from './components/WebViewport';

export default function App() {
  const [settings, setSettings] = useState<BrowserSettings>(() => loadSettings());
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(() => loadBookmarks());
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [downloads, setDownloads] = useState<DownloadItem[]>(() => loadDownloads());

  const [normalSession, setNormalSession] = useState<BrowserSessionState>(() =>
    createInitialSession(
      loadSettings().openNewTabOnStartup ? INTERNAL_NEW_TAB_URL : loadSettings().homepage,
      false
    )
  );
  const [privateSession, setPrivateSession] = useState<BrowserSessionState | null>(null);
  const [sidebarSection, setSidebarSection] = useState<SidebarSection>('tabs');

  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const homeInputRef = useRef<HTMLInputElement | null>(null);
  const downloadControllersRef = useRef<Map<string, AbortController>>(new Map());

  const isPrivate = privateSession !== null;
  const session = privateSession ?? normalSession;
  const activeTab = useMemo(
    () => session.tabs.find((t) => t.id === session.activeTabId) ?? session.tabs[0],
    [session]
  );

  const updateActiveSession = useCallback(
    (updater: (prev: BrowserSessionState) => BrowserSessionState) => {
      if (isPrivate) {
        setPrivateSession((prev) => (prev ? updater(prev) : prev));
      } else {
        setNormalSession(updater);
      }
    },
    [isPrivate]
  );

  // Sync light/dark theme class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  // Update document title to match active tab
  useEffect(() => {
    const label = activeTab?.title || 'New Tab';
    document.title = isPrivate ? `${label} — Velo Private` : `${label} — Velo`;
  }, [activeTab?.title, isPrivate]);

  // Persist local data
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveBookmarks(bookmarks);
  }, [bookmarks]);

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  useEffect(() => {
    saveDownloads(downloads);
  }, [downloads]);

  const handleUpdateSettings = useCallback((patch: Partial<BrowserSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setSettings((prev) => ({ ...prev, sidebarCollapsed: !prev.sidebarCollapsed }));
  }, []);

  const handleSelectSidebarSection = useCallback(
    (nextSection: SidebarSection) => {
      if (settings.sidebarCollapsed) {
        setSidebarSection(nextSection);
        setSettings((prev) => ({ ...prev, sidebarCollapsed: false }));
      } else if (sidebarSection === nextSection) {
        setSettings((prev) => ({ ...prev, sidebarCollapsed: true }));
      } else {
        setSidebarSection(nextSection);
      }
    },
    [settings.sidebarCollapsed, sidebarSection]
  );

  const handleTogglePrivate = useCallback(() => {
    setPrivateSession((prev) => {
      if (prev) {
        return null;
      }
      return createInitialSession(INTERNAL_NEW_TAB_URL, true);
    });
    setSidebarSection('tabs');
  }, []);

  const handleNewTab = useCallback(
    (url: string = INTERNAL_NEW_TAB_URL) => {
      updateActiveSession((prev) => addTabToSession(prev, { url, activate: true }));
      if (url === INTERNAL_NEW_TAB_URL) {
        window.setTimeout(() => homeInputRef.current?.focus(), 40);
      }
    },
    [updateActiveSession]
  );

  const handleSelectTab = useCallback(
    (tabId: string) => {
      updateActiveSession((prev) =>
        selectTabInSession(
          prev,
          tabId,
          settings.maxActiveTabsInMemory,
          settings.autoSuspendTabs
        )
      );
    },
    [settings.autoSuspendTabs, settings.maxActiveTabsInMemory, updateActiveSession]
  );

  const handleCloseTab = useCallback(
    (tabId: string) => {
      if (isTauriDesktop()) {
        void invokeTauriCommand('close_native_tab_webview', { tabId });
      }
      updateActiveSession((prev) => closeTabInSession(prev, tabId));
    },
    [updateActiveSession]
  );

  const handleNavigateUrl = useCallback(
    (tabId: string, targetUrl: string) => {
      updateActiveSession((prev) => navigateTabInSession(prev, tabId, targetUrl));
      if (!isPrivate && !isInternalUrl(targetUrl)) {
        setHistory((prev) =>
          recordHistoryEntry(prev, { title: getDisplayHost(targetUrl), url: targetUrl }, false)
        );
      }
    },
    [isPrivate, updateActiveSession]
  );

  const handleNavigateOmnibox = useCallback(
    (rawInput: string) => {
      const resolved = resolveOmniboxInput(rawInput, settings.searchEngine);
      handleNavigateUrl(activeTab.id, resolved.url);
    },
    [activeTab.id, handleNavigateUrl, settings.searchEngine]
  );

  const handleTabLoaded = useCallback(
    (tabId: string, meta: { url: string; title: string; favicon?: string }) => {
      updateActiveSession((prev) => updateTabMetadataInSession(prev, tabId, meta));
      if (!isPrivate && !isInternalUrl(meta.url)) {
        setHistory((prev) => {
          if (prev.length > 0 && prev[0].url === meta.url) {
            return [{ ...prev[0], title: meta.title || prev[0].title }, ...prev.slice(1)];
          }
          return recordHistoryEntry(prev, { title: meta.title || getDisplayHost(meta.url), url: meta.url }, false);
        });
      }
    },
    [isPrivate, updateActiveSession]
  );

  const handleTabError = useCallback(
    (tabId: string, error: TabError) => {
      updateActiveSession((prev) => setTabErrorInSession(prev, tabId, error));
    },
    [updateActiveSession]
  );

  const handleBack = useCallback(() => {
    updateActiveSession((prev) => goBackInTab(prev, activeTab.id));
  }, [activeTab.id, updateActiveSession]);

  const handleForward = useCallback(() => {
    updateActiveSession((prev) => goForwardInTab(prev, activeTab.id));
  }, [activeTab.id, updateActiveSession]);

  const handleReloadOrStop = useCallback(() => {
    if (activeTab.isLoading) {
      updateActiveSession((prev) => stopTabLoadingInSession(prev, activeTab.id));
    } else {
      updateActiveSession((prev) => reloadTabInSession(prev, activeTab.id));
    }
  }, [activeTab.id, activeTab.isLoading, updateActiveSession]);

  const handleHome = useCallback(() => {
    const home = settings.homepage || INTERNAL_NEW_TAB_URL;
    const resolved = resolveOmniboxInput(home, settings.searchEngine);
    handleNavigateUrl(activeTab.id, resolved.url);
  }, [activeTab.id, handleNavigateUrl, settings.homepage, settings.searchEngine]);

  const isCurrentBookmarked = useMemo(
    () => !isInternalUrl(activeTab.url) && bookmarks.some((b) => b.url === activeTab.url),
    [activeTab.url, bookmarks]
  );

  const handleToggleCurrentBookmark = useCallback(() => {
    if (isInternalUrl(activeTab.url)) return;
    setBookmarks((prev) =>
      toggleBookmarkList(prev, {
        title: activeTab.title,
        url: activeTab.url,
        folder: 'Favorites',
      })
    );
  }, [activeTab.title, activeTab.url]);

  const handleAddBookmark = useCallback(
    (item: { title: string; url: string; folder: string }) => {
      setBookmarks((prev) => {
        const filtered = prev.filter((b) => b.url !== item.url);
        return [
          {
            id: createId('bm'),
            title: item.title,
            url: item.url,
            folder: item.folder,
            createdAt: Date.now(),
          },
          ...filtered,
        ];
      });
    },
    []
  );

  const handleUpdateBookmark = useCallback(
    (id: string, updates: { title: string; url: string; folder: string }) => {
      setBookmarks((prev) =>
        prev.map((bm) => (bm.id === id ? { ...bm, ...updates } : bm))
      );
    },
    []
  );

  const handleDeleteBookmark = useCallback((id: string) => {
    setBookmarks((prev) => prev.filter((bm) => bm.id !== id));
  }, []);

  const triggerBlobSave = useCallback((blobUrl: string, filename: string) => {
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }, []);

  const handleStartDownload = useCallback(
    async (url: string, requestedFilename?: string) => {
      const id = createId('dl');
      const fallbackName =
        requestedFilename || `${getDisplayHost(url).replace(/[^a-zA-Z0-9.-]/g, '_')}.html`;

      const initialItem: DownloadItem = {
        id,
        filename: fallbackName,
        url,
        status: 'downloading',
        receivedBytes: 0,
        totalBytes: null,
        mimeType: 'application/octet-stream',
        startedAt: Date.now(),
      };

      setDownloads((prev) => [initialItem, ...prev]);
      setSidebarSection('downloads');
      setSettings((prev) => (prev.sidebarCollapsed ? { ...prev, sidebarCollapsed: false } : prev));

      const controller = new AbortController();
      downloadControllersRef.current.set(id, controller);

      try {
        const endpoint = getDownloadEndpointUrl(url, requestedFilename);
        const response = await fetch(endpoint, { signal: controller.signal });

        if (!response.ok) {
          let errText = `HTTP ${response.status}`;
          try {
            const body = (await response.json()) as { error?: string };
            if (body.error) errText = body.error;
          } catch {
            // ignore
          }
          throw new Error(errText);
        }

        const headerName = response.headers.get('X-Download-Filename');
        const resolvedName = headerName ? decodeURIComponent(headerName) : fallbackName;
        const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
        const contentLengthHeader = response.headers.get('Content-Length');
        const totalBytes = contentLengthHeader ? Number(contentLengthHeader) : null;

        setDownloads((prev) =>
          prev.map((d) =>
            d.id === id
              ? { ...d, filename: resolvedName, totalBytes, mimeType: contentType }
              : d
          )
        );

        const chunks: Uint8Array[] = [];
        let received = 0;

        if (response.body) {
          const reader = response.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              chunks.push(value);
              received += value.byteLength;
              setDownloads((prev) =>
                prev.map((d) => (d.id === id ? { ...d, receivedBytes: received } : d))
              );
            }
          }
        } else {
          const buf = new Uint8Array(await response.arrayBuffer());
          chunks.push(buf);
          received = buf.byteLength;
        }

        const blob = new Blob(chunks as BlobPart[], { type: contentType });
        const blobUrl = URL.createObjectURL(blob);

        setDownloads((prev) =>
          prev.map((d) =>
            d.id === id
              ? {
                  ...d,
                  filename: resolvedName,
                  status: 'completed',
                  receivedBytes: received,
                  totalBytes: totalBytes ?? received,
                  completedAt: Date.now(),
                  blobUrl,
                }
              : d
          )
        );

        triggerBlobSave(blobUrl, resolvedName);
      } catch (err) {
        const isAbort = err instanceof Error && err.name === 'AbortError';
        setDownloads((prev) =>
          prev.map((d) =>
            d.id === id
              ? {
                  ...d,
                  status: isAbort ? 'cancelled' : 'failed',
                  error: isAbort ? undefined : err instanceof Error ? err.message : 'Download failed',
                }
              : d
          )
        );
      } finally {
        downloadControllersRef.current.delete(id);
      }
    },
    [triggerBlobSave]
  );

  const handleCancelDownload = useCallback((id: string) => {
    const controller = downloadControllersRef.current.get(id);
    if (controller) {
      controller.abort();
      downloadControllersRef.current.delete(id);
    }
  }, []);

  const handleRemoveDownload = useCallback((id: string) => {
    setDownloads((prev) => {
      const target = prev.find((d) => d.id === id);
      if (target?.blobUrl) URL.revokeObjectURL(target.blobUrl);
      return prev.filter((d) => d.id !== id);
    });
  }, []);

  const handleClearFinishedDownloads = useCallback(() => {
    setDownloads((prev) => {
      prev.forEach((d) => {
        if (d.status !== 'downloading' && d.blobUrl) URL.revokeObjectURL(d.blobUrl);
      });
      return prev.filter((d) => d.status === 'downloading');
    });
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.altKey || e.metaKey || e.ctrlKey;
      if (!mod) return;

      const key = e.key.toLowerCase();

      if ((e.altKey || e.metaKey || e.ctrlKey) && key === 'l') {
        e.preventDefault();
        const targetInput = isInternalUrl(activeTab.url)
          ? homeInputRef.current
          : addressInputRef.current;
        targetInput?.focus();
        targetInput?.select();
        return;
      }

      if (e.altKey && e.shiftKey && key === 't') {
        e.preventDefault();
        updateActiveSession((prev) => reopenClosedTabInSession(prev));
        return;
      }

      if (e.altKey && !e.shiftKey && key === 't') {
        e.preventDefault();
        handleNewTab();
        return;
      }

      if (e.altKey && !e.shiftKey && key === 'w') {
        e.preventDefault();
        handleCloseTab(activeTab.id);
        return;
      }

      if ((e.altKey || e.metaKey || e.ctrlKey) && key === 'b') {
        e.preventDefault();
        handleToggleSidebar();
        return;
      }

      if ((e.altKey && key === 'p') || ((e.metaKey || e.ctrlKey) && e.shiftKey && key === 'p')) {
        e.preventDefault();
        handleTogglePrivate();
        return;
      }

      if ((e.altKey || e.metaKey || e.ctrlKey) && key === 'd') {
        e.preventDefault();
        handleToggleCurrentBookmark();
        return;
      }

      if (e.altKey && key === 'r') {
        e.preventDefault();
        handleReloadOrStop();
        return;
      }

      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handleBack();
        return;
      }

      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        handleForward();
        return;
      }

      if (e.altKey && key === 'h') {
        e.preventDefault();
        setSidebarSection('history');
        handleUpdateSettings({ sidebarCollapsed: false });
        return;
      }

      if (e.altKey && key === 'j') {
        e.preventDefault();
        setSidebarSection('downloads');
        handleUpdateSettings({ sidebarCollapsed: false });
        return;
      }

      if (e.altKey && key === ',') {
        e.preventDefault();
        setSidebarSection('settings');
        handleUpdateSettings({ sidebarCollapsed: false });
        return;
      }

      if (e.altKey && /^[1-9]$/.test(key)) {
        const idx = Number(key) - 1;
        if (session.tabs[idx]) {
          e.preventDefault();
          handleSelectTab(session.tabs[idx].id);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    activeTab.id,
    activeTab.url,
    handleBack,
    handleCloseTab,
    handleForward,
    handleNewTab,
    handleReloadOrStop,
    handleSelectTab,
    handleToggleCurrentBookmark,
    handleTogglePrivate,
    handleToggleSidebar,
    handleUpdateSettings,
    session.tabs,
    updateActiveSession,
  ]);

  const isFloating = settings.layout === 'floating';
  const showTopTabBar =
    settings.sidebarCollapsed && settings.collapsedSidebarMode === 'top-bar';

  return (
    <div
      data-testid="velo-browser-shell"
      data-layout={settings.layout}
      data-theme={settings.theme}
      data-private={isPrivate ? 'true' : 'false'}
      className={`h-screen w-screen flex flex-col overflow-hidden ${
        isPrivate
          ? 'bg-[#12111C] text-[#ECEEF2]'
          : 'bg-[#E6E8EE] dark:bg-[#0D0E10] text-zinc-900 dark:text-[#ECEEF2]'
      }`}
    >
      <TopChrome
        activeTab={activeTab}
        tabs={session.tabs}
        bookmarks={bookmarks}
        history={history}
        searchEngine={settings.searchEngine}
        sidebarCollapsed={settings.sidebarCollapsed}
        isPrivate={isPrivate}
        layout={settings.layout}
        isBookmarked={isCurrentBookmarked}
        addressInputRef={addressInputRef}
        onToggleSidebar={handleToggleSidebar}
        onBack={handleBack}
        onForward={handleForward}
        onReloadOrStop={handleReloadOrStop}
        onHome={handleHome}
        onNavigateOmnibox={handleNavigateOmnibox}
        onSelectTab={handleSelectTab}
        onToggleBookmark={handleToggleCurrentBookmark}
        onDownloadCurrentPage={() => handleStartDownload(activeTab.url)}
        onTogglePrivate={handleTogglePrivate}
        onToggleLayout={() =>
          handleUpdateSettings({ layout: isFloating ? 'compact' : 'floating' })
        }
      />

      {showTopTabBar && (
        <HorizontalTabBar
          tabs={session.tabs}
          activeTabId={activeTab.id}
          isPrivate={isPrivate}
          onSelectTab={handleSelectTab}
          onCloseTab={handleCloseTab}
          onNewTab={() => handleNewTab()}
        />
      )}

      <div
        className={`relative flex-1 min-h-0 flex overflow-hidden ${
          isFloating ? 'p-2 gap-2' : ''
        }`}
      >
        <Sidebar
          collapsed={settings.sidebarCollapsed}
          section={sidebarSection}
          isPrivate={isPrivate}
          layout={settings.layout}
          tabs={session.tabs}
          activeTabId={activeTab.id}
          closedTabs={session.closedTabs}
          bookmarks={bookmarks}
          history={history}
          downloads={downloads}
          settings={settings}
          onSelectSection={handleSelectSidebarSection}
          onSelectTab={handleSelectTab}
          onNewTab={() => handleNewTab()}
          onCloseTab={handleCloseTab}
          onPinTab={(id) => updateActiveSession((prev) => togglePinTabInSession(prev, id))}
          onDuplicateTab={(id) =>
            updateActiveSession((prev) => duplicateTabInSession(prev, id))
          }
          onSuspendTab={(id) =>
            updateActiveSession((prev) => toggleSuspendTabInSession(prev, id))
          }
          onReopenClosedTab={() =>
            updateActiveSession((prev) => reopenClosedTabInSession(prev))
          }
          onOpenUrl={(url) => handleNavigateUrl(activeTab.id, url)}
          onOpenInNewTab={(url) => handleNewTab(url)}
          onAddBookmark={handleAddBookmark}
          onUpdateBookmark={handleUpdateBookmark}
          onDeleteBookmark={handleDeleteBookmark}
          onRemoveHistory={(id) => setHistory((prev) => prev.filter((h) => h.id !== id))}
          onClearHistory={() => setHistory([])}
          onStartDownload={handleStartDownload}
          onCancelDownload={handleCancelDownload}
          onRetryDownload={(item) => handleStartDownload(item.url, item.filename)}
          onSaveAgainDownload={(item) => {
            if (item.blobUrl) triggerBlobSave(item.blobUrl, item.filename);
          }}
          onRemoveDownload={handleRemoveDownload}
          onClearFinishedDownloads={handleClearFinishedDownloads}
          onClearAllDownloads={() => setDownloads([])}
          onUpdateSettings={handleUpdateSettings}
        />

        <div
          className={`flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden ${
            isFloating
              ? 'rounded-lg border border-zinc-300/90 dark:border-[#262930]'
              : ''
          }`}
        >
          <WebViewport
            tabs={session.tabs}
            activeTabId={activeTab.id}
            bookmarks={bookmarks}
            history={history}
            closedTabs={session.closedTabs}
            searchEngine={settings.searchEngine}
            isPrivate={isPrivate}
            homeInputRef={homeInputRef}
            onNavigateInTab={handleNavigateUrl}
            onNavigateOmnibox={handleNavigateOmnibox}
            onSelectTab={handleSelectTab}
            onOpenNewTab={(url) => handleNewTab(url)}
            onReopenClosedTab={(index) =>
              updateActiveSession((prev) => reopenClosedTabInSession(prev, index))
            }
            onTabLoaded={handleTabLoaded}
            onFrameLoadSettled={(id) =>
              updateActiveSession((prev) => stopTabLoadingInSession(prev, id))
            }
            onTabError={handleTabError}
            onStartDownload={handleStartDownload}
            onRetryTab={(id) => updateActiveSession((prev) => reloadTabInSession(prev, id))}
            onBackTab={(id) => updateActiveSession((prev) => goBackInTab(prev, id))}
            onWakeTab={(id) =>
              updateActiveSession((prev) =>
                selectTabInSession(
                  prev,
                  id,
                  settings.maxActiveTabsInMemory,
                  settings.autoSuspendTabs
                )
              )
            }
          />
        </div>
      </div>
    </div>
  );
}
