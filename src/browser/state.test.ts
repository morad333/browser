import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addTabToSession,
  buildOmniboxSuggestions,
  canGoBack,
  canGoForward,
  closeTabInSession,
  createInitialSession,
  duplicateTabInSession,
  goBackInTab,
  goForwardInTab,
  navigateTabInSession,
  recordHistoryEntry,
  reopenClosedTabInSession,
  selectTabInSession,
  toggleBookmarkList,
  togglePinTabInSession,
  toggleSuspendTabInSession,
} from './state';
import { INTERNAL_NEW_TAB_URL } from './url';

test('tab navigation stack supports navigate, back, forward, and pruning forward history', () => {
  let session = createInitialSession(INTERNAL_NEW_TAB_URL);
  const tabId = session.activeTabId;

  assert.equal(canGoBack(session.tabs[0]), false);
  assert.equal(canGoForward(session.tabs[0]), false);

  session = navigateTabInSession(session, tabId, 'https://example.com/');
  session = navigateTabInSession(session, tabId, 'https://en.wikipedia.org/wiki/Main_Page');

  assert.equal(session.tabs[0].url, 'https://en.wikipedia.org/wiki/Main_Page');
  assert.equal(canGoBack(session.tabs[0]), true);
  assert.equal(canGoForward(session.tabs[0]), false);

  session = goBackInTab(session, tabId);
  assert.equal(session.tabs[0].url, 'https://example.com/');
  assert.equal(canGoBack(session.tabs[0]), true);
  assert.equal(canGoForward(session.tabs[0]), true);

  session = goForwardInTab(session, tabId);
  assert.equal(session.tabs[0].url, 'https://en.wikipedia.org/wiki/Main_Page');

  session = goBackInTab(session, tabId);
  session = navigateTabInSession(session, tabId, 'https://news.ycombinator.com/');
  assert.equal(canGoForward(session.tabs[0]), false);
  assert.deepEqual(session.tabs[0].history, [
    INTERNAL_NEW_TAB_URL,
    'https://example.com/',
    'https://news.ycombinator.com/',
  ]);
});

test('tab lifecycle handles creation, pinning, duplication, closing, and reopen', () => {
  let session = createInitialSession('https://example.com/');
  const firstId = session.activeTabId;

  session = addTabToSession(session, { url: 'https://www.w3.org/' });
  const secondId = session.activeTabId;
  assert.equal(session.tabs.length, 2);

  // Pinning second tab moves it before unpinned tabs
  session = togglePinTabInSession(session, secondId);
  assert.equal(session.tabs[0].id, secondId);
  assert.equal(session.tabs[0].isPinned, true);

  // Duplicate tab
  session = duplicateTabInSession(session, firstId);
  assert.equal(session.tabs.length, 3);
  assert.equal(session.tabs[2].url, 'https://example.com/');

  // Close active tab selects neighbor and records in closedTabs
  const closingId = session.activeTabId;
  session = closeTabInSession(session, closingId);
  assert.equal(session.tabs.length, 2);
  assert.equal(session.closedTabs.length, 1);
  assert.equal(session.closedTabs[0].url, 'https://example.com/');

  // Reopen closed tab restores it
  session = reopenClosedTabInSession(session);
  assert.equal(session.tabs.length, 3);
  assert.equal(session.closedTabs.length, 0);

  // Closing two tabs and reopening by index restores the chosen tab
  const firstTab = session.tabs[0];
  const secondTab = session.tabs[1];
  session = closeTabInSession(session, firstTab.id);
  session = closeTabInSession(session, secondTab.id);
  assert.equal(session.closedTabs.length, 2);
  const olderUrl = session.closedTabs[1].url;
  session = reopenClosedTabInSession(session, 1);
  const restoredTab = session.tabs.find((t) => t.id === session.activeTabId);
  assert.equal(restoredTab?.url, olderUrl);
  assert.equal(session.closedTabs.length, 1);

  // Closing last remaining tab spawns a fresh New Tab
  let single = createInitialSession('https://example.com/');
  single = closeTabInSession(single, single.activeTabId);
  assert.equal(single.tabs.length, 1);
  assert.equal(single.tabs[0].url, INTERNAL_NEW_TAB_URL);
});

test('memory management suspends oldest inactive tabs beyond cap and wakes on select', () => {
  let session = createInitialSession('https://example.com/');
  session = addTabToSession(session, { url: 'https://www.w3.org/' });
  session = addTabToSession(session, { url: 'https://news.ycombinator.com/' });

  const [t1, t2, t3] = session.tabs;
  session = {
    ...session,
    tabs: [
      { ...t1, lastActiveAt: 1000 },
      { ...t2, lastActiveAt: 2000 },
      { ...t3, lastActiveAt: 3000 },
    ],
  };

  session = selectTabInSession(session, t3.id, 2, true, 4000);
  const suspended = session.tabs.find((t) => t.id === t1.id);
  assert.equal(suspended?.isSuspended, true);

  // Selecting suspended tab wakes it immediately
  session = selectTabInSession(session, t1.id, 2, true, 5000);
  assert.equal(session.tabs.find((t) => t.id === t1.id)?.isSuspended, false);

  // Manual toggleSuspendTab works
  session = toggleSuspendTabInSession(session, t1.id);
  assert.equal(session.tabs.find((t) => t.id === t1.id)?.isSuspended, true);
});

test('private mode does not record browsing history and bookmark toggle adds/removes cleanly', () => {
  const histAfterPrivate = recordHistoryEntry(
    [],
    { title: 'Secret Page', url: 'https://example.com/secret' },
    true
  );
  assert.equal(histAfterPrivate.length, 0);

  const histAfterNormal = recordHistoryEntry(
    [],
    { title: 'Example', url: 'https://example.com/' },
    false
  );
  assert.equal(histAfterNormal.length, 1);

  let bookmarks = toggleBookmarkList([], {
    title: 'Example',
    url: 'https://example.com/',
    folder: 'Favorites',
  });
  assert.equal(bookmarks.length, 1);

  bookmarks = toggleBookmarkList(bookmarks, {
    title: 'Example',
    url: 'https://example.com/',
  });
  assert.equal(bookmarks.length, 0);
});

test('omnibox suggestions prioritize matching URL, open tabs, bookmarks, and history', () => {
  const session = createInitialSession('https://example.com/');
  const suggestions = buildOmniboxSuggestions(
    'example',
    session.tabs,
    [
      {
        id: 'bm-1',
        title: 'Example Docs',
        url: 'https://docs.example.com/',
        folder: 'Favorites',
        createdAt: 100,
      },
    ],
    [],
    'duckduckgo'
  );

  assert.ok(suggestions.some((s) => s.kind === 'search'));
  assert.ok(suggestions.some((s) => s.kind === 'tab' && s.url === 'https://example.com/'));
  assert.ok(suggestions.some((s) => s.kind === 'bookmark' && s.url === 'https://docs.example.com/'));
});
