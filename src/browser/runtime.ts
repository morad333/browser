declare global {
  interface Window {
    __TAURI_INTERNALS__?: {
      invoke?: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
    };
  }
}

export function isTauriDesktop(): boolean {
  return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__?.invoke);
}

export async function invokeTauriCommand<T = unknown>(
  command: string,
  args?: Record<string, unknown>
): Promise<T | null> {
  if (!isTauriDesktop()) return null;
  try {
    return (await window.__TAURI_INTERNALS__!.invoke!(command, args)) as T;
  } catch {
    return null;
  }
}

export function getWebviewProxyUrl(targetUrl: string, tabId: string, reloadNonce: number): string {
  const params = new URLSearchParams({
    url: targetUrl,
    tabId,
    r: String(reloadNonce),
  });
  return `/api/proxy?${params.toString()}`;
}

export function getDownloadEndpointUrl(targetUrl: string, filename?: string): string {
  const params = new URLSearchParams({ url: targetUrl });
  if (filename) {
    params.set('filename', filename);
  }
  return `/api/download?${params.toString()}`;
}
