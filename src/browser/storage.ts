import type { BookmarkItem, BrowserSettings, DownloadItem, HistoryEntry } from './types';
import { INTERNAL_NEW_TAB_URL } from './url';

const STORAGE_KEYS = {
  bookmarks: 'velo.bookmarks.v1',
  history: 'velo.history.v1',
  downloads: 'velo.downloads.v1',
  settings: 'velo.settings.v1',
} as const;

export const DEFAULT_SETTINGS: BrowserSettings = {
  theme: 'dark',
  layout: 'compact',
  searchEngine: 'duckduckgo',
  homepage: INTERNAL_NEW_TAB_URL,
  sidebarCollapsed: false,
  collapsedSidebarMode: 'icon-rail',
  autoSuspendTabs: true,
  maxActiveTabsInMemory: 6,
  openNewTabOnStartup: true,
};

export const STARTER_BOOKMARKS: BookmarkItem[] = [
  {
    id: 'bm-starter-example',
    title: 'Example Domain',
    url: 'https://example.com/',
    folder: 'Favorites',
    createdAt: 1730000000000,
  },
  {
    id: 'bm-starter-wikipedia',
    title: 'Wikipedia',
    url: 'https://en.wikipedia.org/wiki/Main_Page',
    folder: 'Favorites',
    createdAt: 1730000001000,
  },
  {
    id: 'bm-starter-hn',
    title: 'Hacker News',
    url: 'https://news.ycombinator.com/',
    folder: 'Reading',
    createdAt: 1730000002000,
  },
  {
    id: 'bm-starter-mdn',
    title: 'MDN Web Docs',
    url: 'https://developer.mozilla.org/en-US/',
    folder: 'Reference',
    createdAt: 1730000003000,
  },
  {
    id: 'bm-starter-ddg',
    title: 'DuckDuckGo',
    url: 'https://html.duckduckgo.com/html/',
    folder: 'Favorites',
    createdAt: 1730000004000,
  },
  {
    id: 'bm-starter-w3c',
    title: 'W3C Standards',
    url: 'https://www.w3.org/',
    folder: 'Reference',
    createdAt: 1730000005000,
  },
];

function safeReadJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWriteJson<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function loadBookmarks(): BookmarkItem[] {
  const stored = safeReadJson<BookmarkItem[] | null>(STORAGE_KEYS.bookmarks, null);
  return Array.isArray(stored) ? stored : STARTER_BOOKMARKS;
}

export function saveBookmarks(bookmarks: BookmarkItem[]): void {
  safeWriteJson(STORAGE_KEYS.bookmarks, bookmarks);
}

export function loadHistory(): HistoryEntry[] {
  const stored = safeReadJson<HistoryEntry[]>(STORAGE_KEYS.history, []);
  return Array.isArray(stored) ? stored : [];
}

export function saveHistory(history: HistoryEntry[]): void {
  safeWriteJson(STORAGE_KEYS.history, history);
}

export function loadDownloads(): DownloadItem[] {
  const stored = safeReadJson<DownloadItem[]>(STORAGE_KEYS.downloads, []);
  if (!Array.isArray(stored)) return [];
  // Strip stale blob URLs from previous sessions and mark interrupted downloads
  return stored.map((item) => ({
    ...item,
    blobUrl: undefined,
    status: item.status === 'downloading' ? 'cancelled' : item.status,
  }));
}

export function saveDownloads(downloads: DownloadItem[]): void {
  const serializable = downloads.slice(0, 50).map(({ blobUrl: _blob, ...rest }) => rest);
  safeWriteJson(STORAGE_KEYS.downloads, serializable);
}

export function loadSettings(): BrowserSettings {
  const stored = safeReadJson<Partial<BrowserSettings>>(STORAGE_KEYS.settings, {});
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
  };
}

export function saveSettings(settings: BrowserSettings): void {
  safeWriteJson(STORAGE_KEYS.settings, settings);
}
