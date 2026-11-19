export type SidebarSection = 'tabs' | 'bookmarks' | 'history' | 'downloads' | 'settings';

export type LayoutMode = 'compact' | 'floating';
export type ThemeMode = 'dark' | 'light';
export type CollapsedSidebarMode = 'icon-rail' | 'hover-expand' | 'top-bar';
export type SearchEngineId = 'duckduckgo' | 'wikipedia' | 'google' | 'brave';

export interface SearchEngineConfig {
  id: SearchEngineId;
  name: string;
  searchUrlTemplate: string;
  homeUrl: string;
}

export interface TabError {
  code: string;
  message: string;
  url: string;
}

export interface BrowserTab {
  id: string;
  url: string;
  frameUrl: string;
  title: string;
  favicon: string;
  history: string[];
  historyIndex: number;
  isLoading: boolean;
  isPinned: boolean;
  isPrivate: boolean;
  isSuspended: boolean;
  reloadNonce: number;
  lastActiveAt: number;
  error: TabError | null;
}

export interface ClosedTabRecord {
  url: string;
  title: string;
  favicon: string;
  isPinned: boolean;
}

export interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  folder: string;
  favicon?: string;
  createdAt: number;
}

export interface HistoryEntry {
  id: string;
  title: string;
  url: string;
  visitedAt: number;
}

export type DownloadStatus = 'downloading' | 'completed' | 'failed' | 'cancelled';

export interface DownloadItem {
  id: string;
  filename: string;
  url: string;
  status: DownloadStatus;
  receivedBytes: number;
  totalBytes: number | null;
  mimeType: string;
  startedAt: number;
  completedAt?: number;
  error?: string;
  blobUrl?: string;
}

export interface BrowserSettings {
  theme: ThemeMode;
  layout: LayoutMode;
  searchEngine: SearchEngineId;
  homepage: string;
  sidebarCollapsed: boolean;
  collapsedSidebarMode: CollapsedSidebarMode;
  autoSuspendTabs: boolean;
  maxActiveTabsInMemory: number;
  openNewTabOnStartup: boolean;
}

export interface OmniboxSuggestion {
  id: string;
  kind: 'tab' | 'bookmark' | 'history' | 'search' | 'url';
  title: string;
  url: string;
  subtitle?: string;
  tabId?: string;
}

export interface BrowserSessionState {
  tabs: BrowserTab[];
  activeTabId: string;
  closedTabs: ClosedTabRecord[];
  isPrivateWindow: boolean;
}
