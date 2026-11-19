import type { SearchEngineConfig, SearchEngineId } from './types';

export const INTERNAL_NEW_TAB_URL = 'velo://newtab';

export const SEARCH_ENGINES: Record<SearchEngineId, SearchEngineConfig> = {
  duckduckgo: {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    searchUrlTemplate: 'https://html.duckduckgo.com/html/?q={query}',
    homeUrl: 'https://html.duckduckgo.com/html/',
  },
  wikipedia: {
    id: 'wikipedia',
    name: 'Wikipedia',
    searchUrlTemplate: 'https://en.wikipedia.org/w/index.php?search={query}',
    homeUrl: 'https://en.wikipedia.org/wiki/Main_Page',
  },
  brave: {
    id: 'brave',
    name: 'Brave Search',
    searchUrlTemplate: 'https://search.brave.com/search?q={query}',
    homeUrl: 'https://search.brave.com/',
  },
  google: {
    id: 'google',
    name: 'Google',
    searchUrlTemplate: 'https://www.google.com/search?q={query}',
    homeUrl: 'https://www.google.com/',
  },
};

const BLOCKED_PROTOCOLS = ['javascript:', 'data:', 'vbscript:', 'file:'];

export function isInternalUrl(url: string): boolean {
  return url.startsWith('velo://') || url === 'about:blank';
}

export function isSecureUrl(url: string): boolean {
  return url.startsWith('https://');
}

export function looksLikeUrl(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed || /\s/.test(trimmed)) {
    return false;
  }

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('velo://')
  ) {
    return true;
  }

  if (/^localhost(:\d+)?(\/.*)?$/i.test(trimmed)) {
    return true;
  }

  if (/^(\d{1,3}\.){3}\d{1,3}(:\d+)?(\/.*)?$/.test(trimmed)) {
    return true;
  }

  // Domain pattern like example.com, docs.rs/tokio, sub.domain.org/path
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+([:/?#].*)?$/i.test(trimmed);
}

export function buildSearchUrl(query: string, engineId: SearchEngineId): string {
  const engine = SEARCH_ENGINES[engineId] ?? SEARCH_ENGINES.duckduckgo;
  return engine.searchUrlTemplate.replace('{query}', encodeURIComponent(query.trim()));
}

export function resolveOmniboxInput(
  rawInput: string,
  searchEngine: SearchEngineId = 'duckduckgo'
): { url: string; isSearch: boolean } {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { url: INTERNAL_NEW_TAB_URL, isSearch: false };
  }

  const lower = trimmed.toLowerCase();
  if (BLOCKED_PROTOCOLS.some((proto) => lower.startsWith(proto))) {
    return { url: buildSearchUrl(trimmed, searchEngine), isSearch: true };
  }

  if (lower === 'velo://newtab' || lower === 'about:newtab' || lower === 'newtab') {
    return { url: INTERNAL_NEW_TAB_URL, isSearch: false };
  }

  if (lower.startsWith('velo://')) {
    return { url: INTERNAL_NEW_TAB_URL, isSearch: false };
  }

  if (looksLikeUrl(trimmed)) {
    const candidate = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `${
          /^localhost(:\d+)?/i.test(trimmed) || /^(\d{1,3}\.){3}\d{1,3}/.test(trimmed)
            ? 'http://'
            : 'https://'
        }${trimmed}`;
    try {
      return { url: new URL(candidate).href, isSearch: false };
    } catch {
      return { url: candidate, isSearch: false };
    }
  }

  return { url: buildSearchUrl(trimmed, searchEngine), isSearch: true };
}

export function getDisplayHost(url: string): string {
  if (!url || isInternalUrl(url)) {
    return 'New Tab';
  }
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function getDisplayAddress(url: string): string {
  if (!url || url === INTERNAL_NEW_TAB_URL) {
    return '';
  }
  return url;
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes) || bytes < 0) {
    return 'Unknown size';
  }
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let val = bytes / 1024;
  let idx = 0;
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx++;
  }
  return `${val.toFixed(val >= 10 ? 0 : 1)} ${units[idx]}`;
}

export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  const diffSec = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
