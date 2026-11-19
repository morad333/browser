import type {
  BookmarkItem,
  BrowserSessionState,
  BrowserTab,
  HistoryEntry,
  OmniboxSuggestion,
  SearchEngineId,
  TabError,
} from './types';
import {
  INTERNAL_NEW_TAB_URL,
  getDisplayHost,
  isInternalUrl,
  looksLikeUrl,
  resolveOmniboxInput,
} from './url';

let idCounter = 0;

export function createId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

export function createTab(options?: {
  url?: string;
  title?: string;
  isPrivate?: boolean;
  isPinned?: boolean;
  now?: number;
}): BrowserTab {
  const url = options?.url ?? INTERNAL_NEW_TAB_URL;
  const now = options?.now ?? Date.now();
  const isInternal = isInternalUrl(url);
  return {
    id: createId('tab'),
    url,
    frameUrl: url,
    title: options?.title ?? (isInternal ? 'New Tab' : getDisplayHost(url)),
    favicon: isInternal ? '' : `/api/favicon?url=${encodeURIComponent(url)}`,
    history: [url],
    historyIndex: 0,
    isLoading: !isInternal,
    isPinned: Boolean(options?.isPinned),
    isPrivate: Boolean(options?.isPrivate),
    isSuspended: false,
    reloadNonce: 0,
    lastActiveAt: now,
    error: null,
  };
}

export function createInitialSession(
  initialUrl: string = INTERNAL_NEW_TAB_URL,
  isPrivateWindow: boolean = false
): BrowserSessionState {
  const firstTab = createTab({ url: initialUrl, isPrivate: isPrivateWindow });
  return {
    tabs: [firstTab],
    activeTabId: firstTab.id,
    closedTabs: [],
    isPrivateWindow,
  };
}

export function sortTabsWithPinnedFirst(tabs: BrowserTab[]): BrowserTab[] {
  const pinned = tabs.filter((t) => t.isPinned);
  const regular = tabs.filter((t) => !t.isPinned);
  return [...pinned, ...regular];
}

export function addTabToSession(
  session: BrowserSessionState,
  options?: { url?: string; title?: string; activate?: boolean; isPinned?: boolean }
): BrowserSessionState {
  const newTab = createTab({
    url: options?.url ?? INTERNAL_NEW_TAB_URL,
    title: options?.title,
    isPrivate: session.isPrivateWindow,
    isPinned: options?.isPinned,
  });
  const tabs = sortTabsWithPinnedFirst([...session.tabs, newTab]);
  return {
    ...session,
    tabs,
    activeTabId: options?.activate === false ? session.activeTabId : newTab.id,
  };
}

export function selectTabInSession(
  session: BrowserSessionState,
  tabId: string,
  maxActiveTabsInMemory: number = 6,
  autoSuspendTabs: boolean = true,
  now: number = Date.now()
): BrowserSessionState {
  if (!session.tabs.some((t) => t.id === tabId)) {
    return session;
  }

  let tabs = session.tabs.map((tab) =>
    tab.id === tabId
      ? { ...tab, isSuspended: false, lastActiveAt: now }
      : tab
  );

  if (autoSuspendTabs && maxActiveTabsInMemory > 0) {
    const activeLoaded = tabs
      .filter((t) => !t.isSuspended && !isInternalUrl(t.url))
      .sort((a, b) => b.lastActiveAt - a.lastActiveAt);

    if (activeLoaded.length > maxActiveTabsInMemory) {
      const idsToSuspend = new Set(
        activeLoaded
          .slice(maxActiveTabsInMemory)
          .filter((t) => t.id !== tabId && !t.isPinned)
          .map((t) => t.id)
      );
      if (idsToSuspend.size > 0) {
        tabs = tabs.map((t) =>
          idsToSuspend.has(t.id) ? { ...t, isSuspended: true, isLoading: false } : t
        );
      }
    }
  }

  return {
    ...session,
    tabs,
    activeTabId: tabId,
  };
}

export function closeTabInSession(
  session: BrowserSessionState,
  tabId: string
): BrowserSessionState {
  const index = session.tabs.findIndex((t) => t.id === tabId);
  if (index === -1) return session;

  const closing = session.tabs[index];
  const nextClosed =
    !closing.isPrivate && !isInternalUrl(closing.url)
      ? [
          {
            url: closing.url,
            title: closing.title,
            favicon: closing.favicon,
            isPinned: closing.isPinned,
          },
          ...session.closedTabs,
        ].slice(0, 15)
      : session.closedTabs;

  const remaining = session.tabs.filter((t) => t.id !== tabId);

  if (remaining.length === 0) {
    const replacement = createTab({
      url: INTERNAL_NEW_TAB_URL,
      isPrivate: session.isPrivateWindow,
    });
    return {
      ...session,
      tabs: [replacement],
      activeTabId: replacement.id,
      closedTabs: nextClosed,
    };
  }

  let nextActiveId = session.activeTabId;
  if (session.activeTabId === tabId) {
    const neighbor = remaining[Math.min(index, remaining.length - 1)];
    nextActiveId = neighbor.id;
  }

  return {
    ...session,
    tabs: remaining.map((t) =>
      t.id === nextActiveId ? { ...t, isSuspended: false, lastActiveAt: Date.now() } : t
    ),
    activeTabId: nextActiveId,
    closedTabs: nextClosed,
  };
}

export function reopenClosedTabInSession(
  session: BrowserSessionState,
  index: number = 0
): BrowserSessionState {
  if (session.closedTabs.length === 0) return session;
  const clamped = Math.max(0, Math.min(index, session.closedTabs.length - 1));
  const target = session.closedTabs[clamped];
  const rest = session.closedTabs.filter((_, i) => i !== clamped);
  const restored = createTab({
    url: target.url,
    title: target.title,
    isPinned: target.isPinned,
    isPrivate: session.isPrivateWindow,
  });
  return {
    ...session,
    tabs: sortTabsWithPinnedFirst([...session.tabs, restored]),
    activeTabId: restored.id,
    closedTabs: rest,
  };
}

export function duplicateTabInSession(
  session: BrowserSessionState,
  tabId: string
): BrowserSessionState {
  const source = session.tabs.find((t) => t.id === tabId);
  if (!source) return session;
  return addTabToSession(session, {
    url: source.url,
    title: source.title,
    activate: true,
    isPinned: false,
  });
}

export function togglePinTabInSession(
  session: BrowserSessionState,
  tabId: string
): BrowserSessionState {
  const updated = session.tabs.map((tab) =>
    tab.id === tabId ? { ...tab, isPinned: !tab.isPinned } : tab
  );
  return {
    ...session,
    tabs: sortTabsWithPinnedFirst(updated),
  };
}

export function toggleSuspendTabInSession(
  session: BrowserSessionState,
  tabId: string
): BrowserSessionState {
  return {
    ...session,
    tabs: session.tabs.map((tab) => {
      if (tab.id !== tabId || isInternalUrl(tab.url)) return tab;
      const nextSuspended = !tab.isSuspended;
      return {
        ...tab,
        isSuspended: nextSuspended,
        isLoading: nextSuspended ? false : true,
      };
    }),
  };
}

export function navigateTabInSession(
  session: BrowserSessionState,
  tabId: string,
  targetUrl: string
): BrowserSessionState {
  return {
    ...session,
    tabs: session.tabs.map((tab) => {
      if (tab.id !== tabId) return tab;
      const isInternal = isInternalUrl(targetUrl);
      const nextHistory = [...tab.history.slice(0, tab.historyIndex + 1), targetUrl];
      return {
        ...tab,
        url: targetUrl,
        frameUrl: targetUrl,
        title: isInternal ? 'New Tab' : getDisplayHost(targetUrl),
        favicon: isInternal ? '' : `/api/favicon?url=${encodeURIComponent(targetUrl)}`,
        history: nextHistory,
        historyIndex: nextHistory.length - 1,
        isLoading: !isInternal,
        isSuspended: false,
        error: null,
        lastActiveAt: Date.now(),
      };
    }),
  };
}

export function goBackInTab(session: BrowserSessionState, tabId: string): BrowserSessionState {
  return {
    ...session,
    tabs: session.tabs.map((tab) => {
      if (tab.id !== tabId || tab.historyIndex <= 0) return tab;
      const nextIndex = tab.historyIndex - 1;
      const nextUrl = tab.history[nextIndex];
      const isInternal = isInternalUrl(nextUrl);
      return {
        ...tab,
        url: nextUrl,
        frameUrl: nextUrl,
        title: isInternal ? 'New Tab' : getDisplayHost(nextUrl),
        favicon: isInternal ? '' : `/api/favicon?url=${encodeURIComponent(nextUrl)}`,
        historyIndex: nextIndex,
        isLoading: !isInternal,
        isSuspended: false,
        error: null,
      };
    }),
  };
}

export function goForwardInTab(session: BrowserSessionState, tabId: string): BrowserSessionState {
  return {
    ...session,
    tabs: session.tabs.map((tab) => {
      if (tab.id !== tabId || tab.historyIndex >= tab.history.length - 1) return tab;
      const nextIndex = tab.historyIndex + 1;
      const nextUrl = tab.history[nextIndex];
      const isInternal = isInternalUrl(nextUrl);
      return {
        ...tab,
        url: nextUrl,
        frameUrl: nextUrl,
        title: isInternal ? 'New Tab' : getDisplayHost(nextUrl),
        favicon: isInternal ? '' : `/api/favicon?url=${encodeURIComponent(nextUrl)}`,
        historyIndex: nextIndex,
        isLoading: !isInternal,
        isSuspended: false,
        error: null,
      };
    }),
  };
}

export function reloadTabInSession(session: BrowserSessionState, tabId: string): BrowserSessionState {
  return {
    ...session,
    tabs: session.tabs.map((tab) => {
      if (tab.id !== tabId || isInternalUrl(tab.url)) return tab;
      return {
        ...tab,
        isLoading: true,
        isSuspended: false,
        error: null,
        reloadNonce: tab.reloadNonce + 1,
      };
    }),
  };
}

export function stopTabLoadingInSession(session: BrowserSessionState, tabId: string): BrowserSessionState {
  return {
    ...session,
    tabs: session.tabs.map((tab) =>
      tab.id === tabId ? { ...tab, isLoading: false } : tab
    ),
  };
}

export function updateTabMetadataInSession(
  session: BrowserSessionState,
  tabId: string,
  meta: { url?: string; title?: string; favicon?: string }
): BrowserSessionState {
  return {
    ...session,
    tabs: session.tabs.map((tab) => {
      if (tab.id !== tabId) return tab;
      const nextUrl = meta.url || tab.url;
      const nextHistory = [...tab.history];
      if (nextHistory[tab.historyIndex] !== nextUrl && !isInternalUrl(nextUrl)) {
        nextHistory[tab.historyIndex] = nextUrl;
      }
      return {
        ...tab,
        url: nextUrl,
        title: meta.title?.trim() || tab.title,
        favicon: isInternalUrl(nextUrl)
          ? ''
          : `/api/favicon?url=${encodeURIComponent(nextUrl)}`,
        history: nextHistory,
        isLoading: false,
        error: null,
      };
    }),
  };
}

export function setTabErrorInSession(
  session: BrowserSessionState,
  tabId: string,
  error: TabError
): BrowserSessionState {
  return {
    ...session,
    tabs: session.tabs.map((tab) =>
      tab.id === tabId
        ? {
            ...tab,
            isLoading: false,
            error,
            title: `Error · ${getDisplayHost(error.url)}`,
          }
        : tab
    ),
  };
}

export function canGoBack(tab: BrowserTab | undefined): boolean {
  return Boolean(tab && tab.historyIndex > 0);
}

export function canGoForward(tab: BrowserTab | undefined): boolean {
  return Boolean(tab && tab.historyIndex < tab.history.length - 1);
}

export function toggleBookmarkList(
  bookmarks: BookmarkItem[],
  item: { title: string; url: string; folder?: string }
): BookmarkItem[] {
  const existing = bookmarks.find((b) => b.url === item.url);
  if (existing) {
    return bookmarks.filter((b) => b.id !== existing.id);
  }
  const created: BookmarkItem = {
    id: createId('bm'),
    title: item.title.trim() || getDisplayHost(item.url),
    url: item.url,
    folder: item.folder?.trim() || 'Favorites',
    createdAt: Date.now(),
  };
  return [created, ...bookmarks];
}

export function recordHistoryEntry(
  history: HistoryEntry[],
  entry: { title: string; url: string },
  isPrivate: boolean,
  now: number = Date.now()
): HistoryEntry[] {
  if (isPrivate || isInternalUrl(entry.url)) {
    return history;
  }
  const deduped = history.filter(
    (h, idx) => !(idx === 0 && h.url === entry.url)
  );
  const next: HistoryEntry = {
    id: createId('hist'),
    title: entry.title.trim() || getDisplayHost(entry.url),
    url: entry.url,
    visitedAt: now,
  };
  return [next, ...deduped].slice(0, 300);
}

export function buildOmniboxSuggestions(
  query: string,
  tabs: BrowserTab[],
  bookmarks: BookmarkItem[],
  history: HistoryEntry[],
  searchEngine: SearchEngineId
): OmniboxSuggestion[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return bookmarks.slice(0, 5).map((b) => ({
      id: `bm-${b.id}`,
      kind: 'bookmark',
      title: b.title,
      url: b.url,
      subtitle: b.folder,
    }));
  }

  const lower = trimmed.toLowerCase();
  const suggestions: OmniboxSuggestion[] = [];
  const seenUrls = new Set<string>();

  const resolved = resolveOmniboxInput(trimmed, searchEngine);
  if (looksLikeUrl(trimmed)) {
    suggestions.push({
      id: 'direct-url',
      kind: 'url',
      title: resolved.url,
      url: resolved.url,
      subtitle: 'Go to address',
    });
    seenUrls.add(resolved.url);
  } else {
    suggestions.push({
      id: 'direct-search',
      kind: 'search',
      title: trimmed,
      url: resolved.url,
      subtitle: 'Search the web',
    });
  }

  for (const tab of tabs) {
    if (isInternalUrl(tab.url)) continue;
    if (
      tab.title.toLowerCase().includes(lower) ||
      tab.url.toLowerCase().includes(lower)
    ) {
      suggestions.push({
        id: `tab-${tab.id}`,
        kind: 'tab',
        title: tab.title,
        url: tab.url,
        subtitle: 'Switch to open tab',
        tabId: tab.id,
      });
      seenUrls.add(tab.url);
    }
    if (suggestions.length >= 4) break;
  }

  for (const bm of bookmarks) {
    if (seenUrls.has(bm.url)) continue;
    if (
      bm.title.toLowerCase().includes(lower) ||
      bm.url.toLowerCase().includes(lower)
    ) {
      suggestions.push({
        id: `bm-${bm.id}`,
        kind: 'bookmark',
        title: bm.title,
        url: bm.url,
        subtitle: bm.folder,
      });
      seenUrls.add(bm.url);
    }
    if (suggestions.length >= 6) break;
  }

  for (const item of history) {
    if (seenUrls.has(item.url)) continue;
    if (
      item.title.toLowerCase().includes(lower) ||
      item.url.toLowerCase().includes(lower)
    ) {
      suggestions.push({
        id: `hist-${item.id}`,
        kind: 'history',
        title: item.title,
        url: item.url,
        subtitle: getDisplayHost(item.url),
      });
      seenUrls.add(item.url);
    }
    if (suggestions.length >= 8) break;
  }

  return suggestions;
}
