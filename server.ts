import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Velo/1.0';

const BLOCKED_HOSTS = new Set([
  '169.254.169.254',
  'metadata.google.internal',
  'metadata',
]);

const DOWNLOAD_CONTENT_TYPES = [
  'application/octet-stream',
  'application/zip',
  'application/x-zip-compressed',
  'application/gzip',
  'application/x-tar',
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument',
  'application/x-apple-diskimage',
  'application/x-msdownload',
  'text/csv',
];

function validateTargetUrl(rawUrl: string): URL | null {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    const host = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTS.has(host)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function extractFilename(url: URL, contentDisposition: string | null, contentType: string): string {
  if (contentDisposition) {
    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;\s]+)/i);
    if (utf8Match?.[1]) {
      try {
        return decodeURIComponent(utf8Match[1]);
      } catch {
        // fall through
      }
    }
    const basicMatch = contentDisposition.match(/filename="?([^";\n]+)"?/i);
    if (basicMatch?.[1]) {
      return basicMatch[1].trim();
    }
  }
  const segments = url.pathname.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  if (lastSegment && lastSegment.includes('.')) {
    return decodeURIComponent(lastSegment).slice(0, 120);
  }
  const hostSlug = url.hostname.replace(/^www\./, '').replace(/[^a-zA-Z0-9.-]/g, '_');
  if (contentType.includes('text/html')) return `${hostSlug}.html`;
  if (contentType.includes('application/pdf')) return `${hostSlug}.pdf`;
  if (contentType.includes('application/json')) return `${hostSlug}.json`;
  if (contentType.includes('text/plain')) return `${hostSlug}.txt`;
  return `${hostSlug}-download`;
}

function buildBridgeScript(tabId: string, finalUrl: string): string {
  const safeTabId = JSON.stringify(tabId);
  const safeFinalUrl = JSON.stringify(finalUrl);
  return `<script data-velo-bridge="1">
(function() {
  var TAB_ID = ${safeTabId};
  var FINAL_URL = ${safeFinalUrl};
  var DOWNLOAD_EXT = /\\.(pdf|zip|tar|gz|tgz|dmg|exe|msi|deb|rpm|pkg|iso|csv|xlsx|docx|pptx|mp3|mp4|mkv|wav|apk)(\\?|$)/i;

  function findFavicon() {
    var links = document.querySelectorAll('link[rel*="icon"]');
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href');
      if (href) {
        try {
          return new URL(href, FINAL_URL).href;
        } catch (e) {}
      }
    }
    try {
      return new URL('/favicon.ico', FINAL_URL).href;
    } catch (e) {
      return '';
    }
  }

  function postState() {
    try {
      window.parent.postMessage({
        type: 'velo:loaded',
        tabId: TAB_ID,
        url: FINAL_URL,
        title: document.title || new URL(FINAL_URL).hostname,
        favicon: findFavicon()
      }, '*');
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', postState, { once: true });
  } else {
    postState();
  }
  window.addEventListener('load', postState, { once: true });

  var titleObserver = new MutationObserver(function() {
    postState();
  });
  var observeTitle = function() {
    var titleEl = document.querySelector('title');
    if (titleEl) {
      titleObserver.observe(titleEl, { childList: true, characterData: true, subtree: true });
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeTitle, { once: true });
  } else {
    observeTitle();
  }

  document.addEventListener('click', function(e) {
    if (e.defaultPrevented || e.button !== 0) return;
    var target = e.target;
    while (target && target !== document && target.tagName !== 'A') {
      target = target.parentElement;
    }
    if (!target || target.tagName !== 'A') return;
    var rawHref = target.getAttribute('href');
    if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) {
      return;
    }
    var resolved;
    try {
      resolved = new URL(rawHref, FINAL_URL).href;
    } catch (err) {
      return;
    }
    if (!resolved.startsWith('http://') && !resolved.startsWith('https://')) return;

    e.preventDefault();
    var isDownload = target.hasAttribute('download') || DOWNLOAD_EXT.test(resolved);
    if (isDownload) {
      window.parent.postMessage({
        type: 'velo:download',
        tabId: TAB_ID,
        url: resolved,
        filename: target.getAttribute('download') || ''
      }, '*');
      return;
    }

    var openInNewTab = e.metaKey || e.ctrlKey || target.getAttribute('target') === '_blank';
    window.parent.postMessage({
      type: openInNewTab ? 'velo:newtab' : 'velo:navigate',
      tabId: TAB_ID,
      url: resolved
    }, '*');
  }, true);

  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (!form || form.tagName !== 'FORM') return;
    var method = (form.getAttribute('method') || 'get').toLowerCase();
    if (method !== 'get') return;
    var actionAttr = form.getAttribute('action') || FINAL_URL;
    var actionUrl;
    try {
      actionUrl = new URL(actionAttr, FINAL_URL);
    } catch (err) {
      return;
    }
    var fd = new FormData(form);
    fd.forEach(function(val, key) {
      if (typeof val === 'string') {
        actionUrl.searchParams.set(key, val);
      }
    });
    e.preventDefault();
    window.parent.postMessage({
      type: 'velo:navigate',
      tabId: TAB_ID,
      url: actionUrl.href
    }, '*');
  }, true);
})();
</script>`;
}

function rewriteHtml(html: string, finalUrl: string, tabId: string): string {
  // Strip meta CSP and X-Frame-Options that would break rendering inside the webview frame
  let cleaned = html
    .replace(/<meta[^>]*http-equiv=["']?content-security-policy["']?[^>]*>/gi, '')
    .replace(/<meta[^>]*http-equiv=["']?x-frame-options["']?[^>]*>/gi, '');

  const baseTag = `<base href="${escapeHtml(finalUrl)}" />`;
  const bridge = buildBridgeScript(tabId, finalUrl);
  const injection = `${baseTag}\n${bridge}`;

  if (/<head(\s[^>]*)?>/i.test(cleaned)) {
    cleaned = cleaned.replace(/<head(\s[^>]*)?>/i, (match) => `${match}\n${injection}`);
  } else if (/<html(\s[^>]*)?>/i.test(cleaned)) {
    cleaned = cleaned.replace(/<html(\s[^>]*)?>/i, (match) => `${match}\n<head>${injection}</head>`);
  } else {
    cleaned = `<head>${injection}</head>\n${cleaned}`;
  }
  return cleaned;
}

function buildErrorBridgeHtml(tabId: string, url: string, code: string, message: string): string {
  const payload = JSON.stringify({
    type: 'velo:error',
    tabId,
    url,
    code,
    message,
  });
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><title>Navigation Error</title></head>
<body style="background:#111214;color:#8E95A2;font-family:system-ui,sans-serif;margin:0;padding:24px;">
<script>try{window.parent.postMessage(${payload},'*');}catch(e){}</script>
</body>
</html>`;
}

function buildDownloadBridgeHtml(tabId: string, url: string, filename: string, contentType: string, size: number | null): string {
  const payload = JSON.stringify({
    type: 'velo:download',
    tabId,
    url,
    filename,
    contentType,
    size,
  });
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><title>Downloading ${escapeHtml(filename)}</title></head>
<body style="background:#111214;color:#ECEEF2;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
<div style="text-align:center;max-width:420px;padding:24px;">
  <p style="font-size:15px;font-weight:600;margin:0 0 8px;">Download started</p>
  <p style="font-size:13px;color:#8E95A2;margin:0;">${escapeHtml(filename)} has been sent to Velo Downloads.</p>
</div>
<script>try{window.parent.postMessage(${payload},'*');}catch(e){}</script>
</body>
</html>`;
}

function buildMonogramSvg(hostname: string): string {
  const clean = hostname.replace(/^www\./, '');
  const letter = (clean[0] || 'V').toUpperCase();
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash * 31 + clean.charCodeAt(i)) % 360;
  }
  const bg = `hsl(${hash}, 24%, 24%)`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="${bg}"/>
  <text x="16" y="21" text-anchor="middle" fill="#ECEEF2" font-family="system-ui,-apple-system,sans-serif" font-size="15" font-weight="600">${escapeHtml(letter)}</text>
</svg>`;
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, engine: 'velo-proxy' });
  });

  app.get('/api/proxy', async (req, res) => {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url : '';
    const tabId = typeof req.query.tabId === 'string' ? req.query.tabId : 'default';
    const parsed = validateTargetUrl(rawUrl);

    if (!parsed) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(
        buildErrorBridgeHtml(
          tabId,
          rawUrl,
          'ERR_INVALID_URL',
          'This URL uses an unsupported protocol or invalid hostname.'
        )
      );
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 14000);

    try {
      const upstream = await fetch(parsed.href, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      clearTimeout(timeout);

      const finalUrl = upstream.url || parsed.href;
      const contentType = (upstream.headers.get('content-type') || 'text/html').toLowerCase();
      const contentDisposition = upstream.headers.get('content-disposition');
      const contentLengthHeader = upstream.headers.get('content-length');
      const totalSize = contentLengthHeader ? Number(contentLengthHeader) : null;

      const isAttachment =
        Boolean(contentDisposition && /attachment/i.test(contentDisposition)) ||
        DOWNLOAD_CONTENT_TYPES.some((mime) => contentType.includes(mime));

      if (isAttachment) {
        const finalParsed = validateTargetUrl(finalUrl) || parsed;
        const filename = extractFilename(finalParsed, contentDisposition, contentType);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.status(200).send(
          buildDownloadBridgeHtml(tabId, finalUrl, filename, contentType, totalSize)
        );
        return;
      }

      if (contentType.includes('text/html') || contentType.includes('application/xhtml+xml')) {
        const html = await upstream.text();
        const rewritten = rewriteHtml(html, finalUrl, tabId);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.status(200).send(rewritten);
        return;
      }

      if (contentType.startsWith('text/') || contentType.includes('application/json') || contentType.includes('xml')) {
        const text = await upstream.text();
        const wrapped = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(finalUrl)}</title>
  ${buildBridgeScript(tabId, finalUrl)}
</head>
<body style="background:#111214;color:#ECEEF2;font-family:ui-monospace,monospace;font-size:13px;line-height:1.6;padding:24px;margin:0;white-space:pre-wrap;word-break:break-word;">${escapeHtml(text)}</body>
</html>`;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.status(200).send(wrapped);
        return;
      }

      if (contentType.startsWith('image/')) {
        const buffer = Buffer.from(await upstream.arrayBuffer());
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.status(200).send(buffer);
        return;
      }

      const fallbackHtml = await upstream.text();
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(rewriteHtml(fallbackHtml, finalUrl, tabId));
    } catch (err) {
      clearTimeout(timeout);
      const isAbort = err instanceof Error && err.name === 'AbortError';
      const causeCode =
        err && typeof err === 'object' && 'cause' in err && err.cause && typeof err.cause === 'object' && 'code' in err.cause
          ? String((err.cause as { code?: unknown }).code)
          : '';
      const code = isAbort
        ? 'ERR_CONNECTION_TIMED_OUT'
        : causeCode === 'ENOTFOUND'
          ? 'ERR_NAME_NOT_RESOLVED'
          : causeCode === 'ECONNREFUSED'
            ? 'ERR_CONNECTION_REFUSED'
            : 'ERR_CONNECTION_FAILED';

      const message = isAbort
        ? `${parsed.hostname} took too long to respond.`
        : causeCode === 'ENOTFOUND'
          ? `${parsed.hostname}’s server IP address could not be found.`
          : `Unable to reach ${parsed.hostname}. Check the address or your network connection.`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(buildErrorBridgeHtml(tabId, parsed.href, code, message));
    }
  });

  app.get('/api/favicon', async (req, res) => {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url : '';
    const parsed = validateTargetUrl(rawUrl);

    if (!parsed) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.status(204).end();
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    try {
      const iconUrl = `${parsed.origin}/favicon.ico`;
      const upstream = await fetch(iconUrl, {
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'User-Agent': USER_AGENT },
      });
      clearTimeout(timeout);

      const contentType = upstream.headers.get('content-type') || '';
      if (upstream.ok && (contentType.includes('image') || contentType.includes('icon'))) {
        const buffer = Buffer.from(await upstream.arrayBuffer());
        if (buffer.length > 0 && buffer.length < 256 * 1024) {
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'public, max-age=86400');
          res.status(200).send(buffer);
          return;
        }
      }
    } catch {
      clearTimeout(timeout);
    }

    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(204).end();
  });

  app.get('/api/download', async (req, res) => {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url : '';
    const requestedName = typeof req.query.filename === 'string' ? req.query.filename : '';
    const parsed = validateTargetUrl(rawUrl);

    if (!parsed) {
      res.status(400).json({ error: 'Invalid download URL' });
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    req.on('close', () => controller.abort());

    try {
      const upstream = await fetch(parsed.href, {
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'User-Agent': USER_AGENT },
      });
      clearTimeout(timeout);

      if (!upstream.ok) {
        res.status(502).json({ error: `Remote server returned HTTP ${upstream.status}` });
        return;
      }

      const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
      const contentDisposition = upstream.headers.get('content-disposition');
      const filename = requestedName || extractFilename(parsed, contentDisposition, contentType);
      const buffer = Buffer.from(await upstream.arrayBuffer());

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', String(buffer.length));
      res.setHeader('X-Download-Filename', encodeURIComponent(filename));
      res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/"/g, '')}"`);
      res.status(200).send(buffer);
    } catch (err) {
      clearTimeout(timeout);
      if (!res.headersSent) {
        const message = err instanceof Error ? err.message : 'Download failed';
        res.status(502).json({ error: message });
      }
    }
  });

  // Serve Windows x64 .exe installer and portable binaries with Content-Disposition attachment headers
  const serveWindowsExe = (req: express.Request, res: express.Response, downloadName: string) => {
    const exePath = path.resolve(__dirname, 'public/releases/VeloBrowser-Setup-x64.exe');
    if (!fs.existsSync(exePath)) {
      res.status(404).send('Windows installer binary not found.');
      return;
    }
    const stat = fs.statSync(exePath);
    res.setHeader('Content-Type', 'application/vnd.microsoft.portable-executable');
    res.setHeader('Content-Length', String(stat.size));
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    fs.createReadStream(exePath).pipe(res);
  };

  app.get('/releases/VeloBrowser-Setup-x64.exe', (req, res) => {
    serveWindowsExe(req, res, 'VeloBrowser-Setup-x64.exe');
  });

  app.get('/releases/VeloBrowser-Portable-x64.exe', (req, res) => {
    serveWindowsExe(req, res, 'VeloBrowser-Portable-x64.exe');
  });

  app.get('/download/velo-windows.exe', (req, res) => {
    serveWindowsExe(req, res, 'VeloBrowser-Setup-x64.exe');
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Velo Browser running at http://localhost:${PORT}`);
  });
}

startServer();
