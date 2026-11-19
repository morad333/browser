import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INTERNAL_NEW_TAB_URL,
  buildSearchUrl,
  formatBytes,
  getDisplayHost,
  looksLikeUrl,
  resolveOmniboxInput,
} from './url';

test('looksLikeUrl identifies domains, protocols, and localhost accurately', () => {
  assert.equal(looksLikeUrl('example.com'), true);
  assert.equal(looksLikeUrl('https://en.wikipedia.org/wiki/Tauri'), true);
  assert.equal(looksLikeUrl('localhost:3000'), true);
  assert.equal(looksLikeUrl('127.0.0.1:8080/api'), true);
  assert.equal(looksLikeUrl('velo://newtab'), true);

  assert.equal(looksLikeUrl('how fast is tauri v2'), false);
  assert.equal(looksLikeUrl('rust'), false);
  assert.equal(looksLikeUrl(''), false);
});

test('resolveOmniboxInput normalizes URLs and falls back to search engine for queries', () => {
  assert.deepEqual(resolveOmniboxInput('example.com', 'duckduckgo'), {
    url: 'https://example.com/',
    isSearch: false,
  });

  assert.deepEqual(resolveOmniboxInput('localhost:3000/test', 'duckduckgo'), {
    url: 'http://localhost:3000/test',
    isSearch: false,
  });

  assert.deepEqual(resolveOmniboxInput('web performance', 'wikipedia'), {
    url: buildSearchUrl('web performance', 'wikipedia'),
    isSearch: true,
  });

  assert.deepEqual(resolveOmniboxInput('velo://newtab', 'duckduckgo'), {
    url: INTERNAL_NEW_TAB_URL,
    isSearch: false,
  });
});

test('resolveOmniboxInput blocks unsafe protocols by routing them to search', () => {
  const res = resolveOmniboxInput('javascript:alert(1)', 'duckduckgo');
  assert.equal(res.isSearch, true);
  assert.ok(res.url.startsWith('https://html.duckduckgo.com/html/?q='));
});

test('getDisplayHost strips www prefix and handles internal pages', () => {
  assert.equal(getDisplayHost('https://www.w3.org/TR/'), 'w3.org');
  assert.equal(getDisplayHost(INTERNAL_NEW_TAB_URL), 'New Tab');
});

test('formatBytes formats byte sizes cleanly', () => {
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(2048), '2.0 KB');
  assert.equal(formatBytes(5 * 1024 * 1024), '5.0 MB');
  assert.equal(formatBytes(null), 'Unknown size');
});
